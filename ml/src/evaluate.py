import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from config import ERROR_ANALYSIS_PATH, FIGURES_DIR, METRICS_PATH, TEST_PREDICTIONS_PATH
from metrics import point_metrics

DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
METHOD_LABELS = {"lightgbm": "LightGBM", "seasonal_naive": "Seasonal naive (t-7)", "same_weekday_mean": "Media 4 mismos días"}
METHOD_COLUMNS = {"lightgbm": "pred", "seasonal_naive": "seasonal_naive", "same_weekday_mean": "same_weekday_mean"}
PLOT_PRODUCTS = ["Cafe Americano", "Galletas de mantequilla", "Croissant"]


def fmt(value, digits: int = 3) -> str:
    return "—" if value is None else f"{value:.{digits}f}"


def segment_table(frame: pd.DataFrame, segments: dict[str, pd.Series]) -> str:
    lines = ["| Segmento | Filas | MAE LightGBM | MAE seasonal naive | Sesgo LightGBM |", "|---|---|---|---|---|"]
    for label, mask in segments.items():
        part = frame[mask]
        if part.empty:
            continue
        model = point_metrics(part["y"], part["pred"])
        naive = point_metrics(part["y"], part["seasonal_naive"])
        lines.append(f"| {label} | {len(part)} | {fmt(model['mae'])} | {fmt(naive['mae'])} | {fmt(model['bias'])} |")
    return "\n".join(lines)


def plot_products(test: pd.DataFrame) -> list[str]:
    files = []
    for name in PLOT_PRODUCTS:
        part = test[(test.name == name) & (test.date >= test.date.max() - pd.Timedelta(days=55))]
        fig, ax = plt.subplots(figsize=(10, 3.5))
        ax.plot(part.date, part.y, label="Real", color="#222222", linewidth=1.6)
        ax.plot(part.date, part.pred, label="LightGBM", color="#1f77b4", linewidth=1.6)
        ax.plot(part.date, part.seasonal_naive, label="Seasonal naive", color="#ff7f0e", linewidth=1.2, linestyle="--")
        ax.set_title(f"{name}: últimas 8 semanas del conjunto de prueba")
        ax.set_ylabel("Unidades/día")
        ax.legend(loc="upper left")
        ax.grid(alpha=0.3)
        fig.tight_layout()
        file_name = f"forecast_{name.lower().replace(' ', '_')}.png"
        fig.savefig(FIGURES_DIR / file_name, dpi=120)
        plt.close(fig)
        files.append(file_name)
    return files


def plot_mase(per_product: pd.DataFrame) -> str:
    ordered = per_product.sort_values("mase_lightgbm")
    fig, ax = plt.subplots(figsize=(9, 6))
    positions = range(len(ordered))
    ax.barh([p - 0.2 for p in positions], ordered.mase_lightgbm, height=0.4, label="LightGBM", color="#1f77b4")
    ax.barh([p + 0.2 for p in positions], ordered.mase_seasonal_naive, height=0.4, label="Seasonal naive", color="#ff7f0e")
    ax.axvline(1.0, color="#d62728", linestyle=":", label="MASE = 1")
    ax.set_yticks(list(positions), ordered.name)
    ax.set_xlabel("MASE (prueba)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "mase_by_product.png", dpi=120)
    plt.close(fig)
    return "mase_by_product.png"


def plot_importance(importance: list[dict]) -> str:
    top = pd.DataFrame(importance).head(15).iloc[::-1]
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.barh(top.feature, top.gain, color="#1f77b4")
    ax.set_xlabel("Ganancia (gain)")
    ax.set_title("Importancia de variables")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "feature_importance.png", dpi=120)
    plt.close(fig)
    return "feature_importance.png"


def main() -> None:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    test = pd.read_csv(TEST_PREDICTIONS_PATH, parse_dates=["date"])
    scored = test[(test.is_closed == 0) & (~test.discontinued)].copy()
    per_product = pd.DataFrame(metrics["per_product"])

    product_figures = plot_products(test)
    mase_figure = plot_mase(per_product)
    importance_figure = plot_importance(metrics["feature_importance"])

    overall_lines = ["| Método | MASE (macro) | MASE (agregado) | MAE | RMSE | WAPE | Sesgo |", "|---|---|---|---|---|---|---|"]
    for method, label in METHOD_LABELS.items():
        m = metrics["overall"][method]
        overall_lines.append(
            f"| {label} | {fmt(m['mase_macro'])} | {fmt(m['mase_pooled'])} | {fmt(m['mae'])} | {fmt(m['rmse'])} | {fmt(m['wape'])} | {fmt(m['bias'])} |"
        )

    product_lines = ["| Producto | MASE LightGBM | MASE seasonal naive | MAE LightGBM | MAE seasonal naive | Sesgo LightGBM |", "|---|---|---|---|---|---|"]
    for row in per_product.sort_values("mase_lightgbm", ascending=False).itertuples():
        product_lines.append(
            f"| {row.name} | {fmt(row.mase_lightgbm)} | {fmt(row.mase_seasonal_naive)} | {fmt(row.mae_lightgbm)} | {fmt(row.mae_seasonal_naive)} | {fmt(row.bias_lightgbm)} |"
        )

    day_segments = {DAY_NAMES[d]: scored.date.dt.dayofweek == d for d in range(7)}
    special_segments = {
        "Días normales": (scored.is_holiday_eve == 0) & (scored.discount_active == 0) & (scored.lag_7_closed == 0),
        "Víspera de cierre por feriado": scored.is_holiday_eve == 1,
        "Una semana después de un cierre (t-7 = 0)": scored.lag_7_closed == 1,
        "Días con descuento": scored.discount_active == 1,
        "Vacaciones escolares (julio)": scored.is_school_vacation == 1,
    }

    worst = scored.assign(abs_error=(scored.pred - scored.y).abs()).nlargest(10, "abs_error")
    worst_lines = ["| Fecha | Producto | Real | LightGBM | Seasonal naive |", "|---|---|---|---|---|"]
    for row in worst.itertuples():
        worst_lines.append(f"| {row.date.date()} | {row.name} | {row.y:.0f} | {row.pred:.2f} | {row.seasonal_naive:.0f} |")

    waste = metrics["waste_simulation"]
    waste_lines = ["| Método | Unidades sobrantes | Unidades faltantes |", "|---|---|---|"]
    for method, label in METHOD_LABELS.items():
        waste_lines.append(f"| {label} | {waste[method]['surplus_units']:.0f} | {waste[method]['shortage_units']:.0f} |")

    discontinued_lines = []
    for item in metrics["discontinued"]:
        discontinued_lines.append(
            f"- **{item['name']}** (última venta {item['last_sale_date']}): demanda real media {item['mean_actual']:.2f}; "
            f"MAE LightGBM {item['lightgbm']['mae']:.2f}, MAE seasonal naive {item['seasonal_naive']['mae']:.2f}."
        )

    lightgbm = metrics["overall"]["lightgbm"]
    naive = metrics["overall"]["seasonal_naive"]
    report = f"""# Análisis de errores — conjunto de prueba

Modelo `{metrics['model_version']}` · prueba {metrics['ranges']['test'][0]} → {metrics['ranges']['test'][1]} · {metrics['test_rows']} filas producto×día · {metrics['products_evaluated']} productos activos.
Se excluyen {metrics['excluded_closed_days']} días de cierre por feriado (el sistema devuelve 0 por regla) y los productos discontinuados (se reportan aparte).

## 1. Resultado global

{chr(10).join(overall_lines)}

- MASE se escala con el MAE del *seasonal naive* (t-7) dentro del periodo de desarrollo (entrenamiento + validación) de cada producto.
- LightGBM obtiene MASE = **{lightgbm['mase_macro']:.3f}** frente a **{naive['mase_macro']:.3f}** de la línea base; criterio de éxito (MASE < 1): **{'cumplido' if metrics['success'] else 'no cumplido'}**.
- El sesgo de LightGBM ({lightgbm['bias']:.3f} u/día) indica una leve tendencia a subestimar la demanda, propia de los objetivos tweedie/L1 que apuntan a la mediana.

## 2. Error por producto

{chr(10).join(product_lines)}

![MASE por producto](figures/{mase_figure})

## 3. Error por día de la semana

{segment_table(scored, day_segments)}

## 4. Segmentos difíciles

{segment_table(scored, special_segments)}

## 5. Mayores errores absolutos

{chr(10).join(worst_lines)}

## 6. Productos discontinuados

{chr(10).join(discontinued_lines) if discontinued_lines else 'No hay productos discontinuados en la prueba.'}

## 7. Simulación de sobrantes y faltantes

Si cada día se preparara `ceil(pronóstico)` unidades de los productos con stock ({', '.join(waste['products'])}) durante {waste['days']} días (demanda real total {waste['actual_units']:.0f} u):

{chr(10).join(waste_lines)}

## 8. Importancia de variables

![Importancia de variables](figures/{importance_figure})

## 9. Ejemplos de pronóstico

{chr(10).join(f'![{f}](figures/{f})' for f in product_figures)}
"""
    ERROR_ANALYSIS_PATH.write_text(report, encoding="utf-8")
    print(f"report written to {ERROR_ANALYSIS_PATH}")


if __name__ == "__main__":
    main()
