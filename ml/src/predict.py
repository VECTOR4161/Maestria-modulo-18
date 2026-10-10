import json
import sys
from functools import lru_cache

import lightgbm as lgb
import numpy as np
import pandas as pd

from baseline import same_weekday_mean, seasonal_naive
from config import METADATA_PATH, MODEL_PATH
from features import build_features


class InputError(Exception):
    pass


@lru_cache(maxsize=1)
def load_artifacts() -> tuple[lgb.Booster, dict]:
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    model = lgb.Booster(model_file=str(MODEL_PATH))
    if model.feature_name() != metadata["feature_columns"]:
        raise RuntimeError("Las variables del modelo no coinciden con metadata.json")
    return model, metadata


def parse_date(value, field: str) -> pd.Timestamp:
    try:
        return pd.Timestamp(str(value)).normalize()
    except (ValueError, TypeError):
        raise InputError(f"Fecha inválida en '{field}': {value}")


def parse_history(history) -> pd.Series:
    if not isinstance(history, list) or not history:
        raise InputError("El historial está vacío.")
    records = {}
    for index, item in enumerate(history, start=1):
        if not isinstance(item, dict) or "date" not in item or "qty" not in item:
            raise InputError(f"Registro {index} del historial sin 'date' o 'qty'.")
        date = parse_date(item["date"], f"history[{index}].date")
        try:
            qty = float(item["qty"])
        except (ValueError, TypeError):
            raise InputError(f"Cantidad inválida en el registro {index}: {item['qty']}")
        if not np.isfinite(qty) or qty < 0:
            raise InputError(f"La cantidad del registro {index} debe ser un número mayor o igual a 0.")
        if date in records:
            raise InputError(f"Fecha duplicada en el historial: {date.date()}")
        records[date] = qty
    return pd.Series(records).sort_index()


def run(payload: dict) -> dict:
    model, metadata = load_artifacts()

    product_id = payload.get("productId")
    if product_id not in metadata["products"]:
        raise InputError("El producto no forma parte de los productos con los que se entrenó el modelo.")

    horizon = payload.get("horizon")
    if not isinstance(horizon, int) or isinstance(horizon, bool) or not 1 <= horizon <= metadata["horizon"]:
        raise InputError(f"El horizonte debe ser un entero entre 1 y {metadata['horizon']}.")

    history = parse_history(payload.get("history"))
    cutoff = parse_date(payload["cutoffDate"], "cutoffDate") if payload.get("cutoffDate") else history.index.max()
    history = history[history.index <= cutoff]
    if history.empty or history.index.max() < cutoff:
        raise InputError("El historial debe llegar hasta la fecha de corte.")

    series = history.reindex(pd.date_range(history.index.min(), cutoff, freq="D"), fill_value=0.0)
    if len(series) < metadata["min_history_days"]:
        raise InputError(
            f"Se requieren al menos {metadata['min_history_days']} días de historial; se recibieron {len(series)}."
        )

    product = {**metadata["products"][product_id], "discounts": payload.get("discounts") or []}
    end = cutoff + pd.Timedelta(days=horizon)
    frame = build_features(series, end, product)
    target = frame.loc[cutoff + pd.Timedelta(days=1) : end].copy()

    target["forecast"] = np.clip(model.predict(target[metadata["feature_columns"]]), 0.0, None)
    target.loc[target.is_closed == 1, "forecast"] = 0.0
    target["seasonal_naive"] = seasonal_naive(target)
    target["same_weekday_mean"] = same_weekday_mean(target)

    predictions = [
        {
            "date": date.date().isoformat(),
            "forecast": round(float(row.forecast), 2),
            "baseline": round(float(row.seasonal_naive), 2),
            "sameWeekdayMean": round(float(row.same_weekday_mean), 2),
            "isClosed": bool(row.is_closed),
            "discountPct": round(float(row.discount_pct), 2),
        }
        for date, row in target.iterrows()
    ]
    return {
        "modelVersion": metadata["model_version"],
        "productId": product_id,
        "cutoffDate": cutoff.date().isoformat(),
        "horizon": horizon,
        "historyDays": len(series),
        "predictions": predictions,
    }


def main() -> int:
    sys.stdin.reconfigure(encoding="utf-8")
    try:
        payload = json.loads(sys.stdin.read())
        if not isinstance(payload, dict):
            raise InputError("La solicitud debe ser un objeto JSON.")
        print(json.dumps(run(payload)))
        return 0
    except json.JSONDecodeError:
        print(json.dumps({"error": "La solicitud no es un JSON válido."}))
        return 2
    except InputError as error:
        print(json.dumps({"error": str(error)}))
        return 2
    except Exception as error:
        print(json.dumps({"error": f"Error interno del modelo: {error}"}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
