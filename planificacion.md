# Planificación — Pronóstico de demanda diaria por artículo (Proyecto N° 30)

**Estudiante:** Fernando Ichazo Cisneros
**Objetivo (proyecto.md):** pronosticar la demanda diaria de cada artículo con LightGBM, compararlo con la referencia *seasonal naive* (mismo día de la semana anterior) y lograr **MASE < 1**, para ajustar la fabricación y reducir mermas.
**Marco (instrucciones.md):** flujo completo dataset → modelo → métricas → validación → backend → frontend → pruebas, con código e identificadores en inglés y la interfaz y la documentación en español.

---

## 1. Diagnóstico del estado actual

| Componente | Estado actual | Qué falta |
|---|---|---|
| `backend/` | Plantilla vacía de NestJS 11 (`AppController` con "Hello World!"), sin base de datos, sin validación ni CORS. | Toda la API de pronóstico, el acceso a PostgreSQL, la integración con el modelo y las pruebas. |
| `frontend/` | Plantilla vacía de React 19 + Vite 8 + TypeScript (contador de ejemplo). | Toda la interfaz: formulario, carga de CSV, gráfico, estados de carga y error, y un panel de límites. |
| `backup.sql` | Volcado de PostgreSQL 16.14 (168 MB) con el sistema operativo de una cafetería/pastelería. | Restaurarlo y construir con él el dataset diario por producto. |
| Modelo ML | No existe. | Una carpeta nueva `ml/` (Python) para el EDA, el entrenamiento, la evaluación y el artefacto de inferencia. |

---

## 2. Análisis de `backup.sql`

### 2.1 Contexto del negocio
Es una cafetería con pastelería. Las coordenadas de los pedidos (≈ -21.5, -64.7) corresponden a Tarija, Bolivia. Tiene 32 tablas y estas son las relevantes:

| Tabla | Filas | Uso en el proyecto |
|---|---|---|
| `venta` | 95 313 (94 554 *Completada*, 759 *Anulada*) | Fecha de la venta (`fecha_venta`) y estado (`id_estado_venta`). |
| `detalle_venta` | 136 627 | Cantidad por producto y por venta → **variable objetivo**. |
| `producto` | 50 (17 se venden) | Catálogo, categoría (`id_categoria`), tipo (`id_tipo`) y precio. |
| `categoria`, `tipo` | 5 y 3 | Cafés, Bebidas, Pastelería, Sandwiches e Insumos / Insumo, Producto elaborado, Reventa. |
| `descuentos` | 37 | Promociones con fechas conocidas de antemano → **variable exógena** (sin fuga). |
| `produccion`, `receta` | 1 133 y 13 | Tandas de galletas (24 u.) y bandejas de brownie (16 u.) → traducir el pronóstico a tandas. |
| `movimientos` (+ `tipo_movimiento`) | 374 404 | Mermas (2 246) y vencimientos (982) → análisis del impacto en el desperdicio. |

### 2.2 Hallazgos del EDA preliminar
- **Rango temporal:** del 2021-10-01 al 2026-10-03, es decir, 1 829 días calendario. Las cantidades son enteras de 1 a 3 por línea de detalle.
- **17 productos vendibles** con historial. La unidad de observación es *producto × día*, lo que da unas 29 000 filas después de completar con ceros.

| Producto | Días con venta | Media/día | Observación |
|---|---|---|---|
| Cafe Americano | 1 788 | 11.0 | El de mayor volumen. |
| Capuchino | 1 781 | 8.7 | |
| Galletas de mantequilla | 1 786 | 7.7 | Producción propia (tandas de 24). |
| Cafe Latte | 1 771 | 7.1 | |
| Brownie de chocolate | 1 772 | 6.4 | Producción propia (bandejas de 16). |
| Croissant | 1 771 | 5.8 | Reventa (bandeja x12) y principal fuente de merma por vencimiento. |
| Chokolatte, Sandwich Mixto, Jugo de naranja, Espresso, Te caliente, Agua sin gas, Te frio | — | 2.8 – 5.2 | |
| Mocaccino | 1 557 | 4.7 | Se lanzó el 2022-04-16. |
| Frappuccino | 980 | 4.9 | Se lanzó el 2023-11-01 (arranque en frío). |
| Sandwich Napolitano | 888 | 3.7 | Se lanzó el 2024-02-01 (arranque en frío). |
| Agua con gas 500 ml | 1 114 | 1.9 | **Discontinuado:** su última venta fue el 2026-03-27. |

- **Estacionalidad semanal fuerte:** el sábado tiene unos 98 artículos/día, el domingo unos 57 y de lunes a viernes unos 82.
- **Estacionalidad anual:** la demanda baja en enero y febrero (vacaciones de verano) y en julio (vacaciones de invierno), y es más alta de agosto a noviembre.
- **Tendencia creciente:** de unos 1 900 artículos/mes en 2021 a unos 3 000/mes en 2026.
- **30 días cerrados (venta = 0):** 25-dic, 1-ene, lunes y martes de Carnaval, Viernes Santo y 1-may. Son feriados conocidos de antemano y se pueden modelar con un calendario de feriados de Bolivia, sin mirar el objetivo.
- **Mermas:** el croissant tiene 1 800 u. vencidas y 516 por merma, las galletas 719 vencidas y 425 por merma, y el brownie 443 vencidas. Estos productos justifican el caso de negocio (*fabricar o comprar lo justo*).
- **Promociones recurrentes:** por ejemplo, Chokolatte del 1 al 16 de agosto y del 1 al 24 de diciembre, Capuchino del 1 al 15 de junio y Cafe Americano el 21 de septiembre.

### 2.3 Prueba rápida de viabilidad (ya ejecutada, solo como referencia)
Usé un *gradient boosting* de scikit-learn con rezagos de 7 a 28 días, medias móviles, calendario y código de producto. La prueba fue del 2026-04-01 al 2026-10-03 y entrenó con todos los datos anteriores.

| Método | MAE | MASE (escala = MAE *seasonal naive* m=7 en entrenamiento) |
|---|---|---|
| Seasonal naive (lag 7) | 2.94 | 1.06 |
| Boosting (preliminar) | 2.08 | **0.75** |

**Conclusión:** la meta MASE < 1 es alcanzable. El LightGBM definitivo debe repetir y documentar este resultado con la validación formal de la sección 3.4. Dos problemas visibles: el modelo falla en *Agua con gas* porque predice demanda después de la discontinuación, y en los productos nuevos.

> ⚠️ **Origen del dataset:** las regularidades del backup (patrones muy limpios, motivos de merma repetidos) sugieren que podría ser una base **simulada**. Hay que confirmar el origen. Si es sintético, instrucciones.md exige entregar el código generador, la semilla y sus limitaciones. Si es real, hay que describir la empresa y el periodo, y anonimizar la tabla `persona`.

---

## 3. Componente de Machine Learning (nueva carpeta `ml/`)

instrucciones.md exige entregar el código de entrenamiento, los parámetros y el artefacto. LightGBM es nativo de Python, así que el modelo vive en `ml/` y el backend NestJS lo invoca (ver la sección 4.3).

### 3.1 Estructura

```
ml/
├── requirements.txt          # pandas, numpy, lightgbm, scikit-learn, psycopg[binary], matplotlib, pytest
├── README.md                 # cómo regenerar el dataset y el modelo
├── src/
│   ├── config.py             # paths, seed (42), split dates, horizon (7)
│   ├── db.py                 # PostgreSQL connection (env DATABASE_URL)
│   ├── extract.py            # SQL -> data/daily_sales.csv
│   ├── calendar_bo.py        # Bolivian holidays + store closures (Carnival, Good Friday...)
│   ├── features.py           # SHARED feature builder (training AND inference)
│   ├── baseline.py           # seasonal naive (lag 7)
│   ├── metrics.py            # MASE, MAE, RMSE, WAPE, bias
│   ├── train.py              # time-series CV + final fit + test evaluation
│   ├── evaluate.py           # error analysis, plots, reports
│   └── predict.py            # CLI inference: JSON stdin -> JSON stdout
├── data/daily_sales.csv      # generated (gitignored or small enough to version)
├── artifacts/
│   ├── model.txt             # LightGBM booster (booster.save_model)
│   └── metadata.json         # feature list, product categories, train range, lib versions, params
├── reports/
│   ├── metrics.json          # test metrics model vs baseline (read by the backend)
│   ├── error_analysis.md     # in Spanish
│   └── figures/*.png
└── tests/test_features.py    # leakage and shape tests
```

### 3.2 Construcción del dataset (`extract.py`)
```sql
SELECT dv.id_producto AS product_id, DATE(v.fecha_venta) AS sale_date, SUM(dv.cantidad) AS qty
FROM venta v
JOIN detalle_venta dv ON dv.id_venta = v.id
JOIN estado_venta ev  ON ev.id = v.id_estado_venta
JOIN producto p       ON p.id = dv.id_producto
WHERE ev.nombre = 'Completada' AND v.borrado = false AND dv.borrado = false AND p.vendible = true
GROUP BY 1, 2;
```
Limpieza:
1. Excluir las ventas **anuladas**, porque no son demanda real.
2. Reindexar cada producto a días calendario **desde su primera venta**, completando con 0 los días sin venta.
3. Marcar los productos **discontinuados**: sin ventas en los últimos N=30 días antes del corte. Se excluyen de la evaluación principal y se reportan aparte. La API los rechaza o advierte.
4. Los días de cierre (feriados) quedan como `is_closed=1`. El objetivo es 0 y, en inferencia, una regla de negocio fuerza 0 y la UI lo informa.

### 3.3 Variables (`features.py`, compartido entre entrenamiento e inferencia)
Uso una **estrategia directa con horizonte de hasta 7 días**. Todos los rezagos son ≥ 7 días, de modo que un solo modelo pronostica de t+1 a t+7 sin recursión y sin fuga de información.

| Grupo | Variables |
|---|---|
| Historial | `lag_7`, `lag_14`, `lag_21`, `lag_28`, `lag_364` (mismo día del año anterior, si existe) |
| Ventanas móviles (desplazadas 7 días) | `roll_mean_7`, `roll_mean_28`, `roll_std_28`, `roll_mean_same_dow_4` (media de los 4 últimos mismos días de la semana) |
| Calendario | `day_of_week`, `day_of_month`, `month`, `week_of_year`, `is_weekend`, `is_holiday_eve`, `is_closed`, `is_school_vacation` (enero, febrero y julio) |
| Producto | `product_code` (categórica nativa de LightGBM), `category`, `product_type`, `price` |
| Exógenas conocidas a futuro | `discount_active`, `discount_value` (de la tabla `descuentos`) |
| Ciclo de vida | `days_since_launch` (ayuda en el arranque en frío de Frappuccino y Napolitano) |

### 3.4 Validación (respetando el orden temporal)
| Conjunto | Rango | Uso |
|---|---|---|
| Entrenamiento | 2021-10-01 → 2025-09-30 | Ajuste. |
| Validación | 2025-10-01 → 2026-03-31 | `TimeSeriesSplit`/*rolling origin* con 4 pliegues para hiperparámetros y *early stopping*. |
| **Prueba (hold-out final)** | 2026-04-01 → 2026-10-03 | Se evalúa **una sola vez**. No se usa para ajustar nada. |

- Los primeros 28 días de cada serie se descartan porque no tienen todos los rezagos.
- Hiperparámetros iniciales: `objective="regression_l1"` (alineado con MAE/MASE) o `tweedie` (conteos con ceros, a comparar en validación), `learning_rate=0.03`, `num_leaves=31`, `min_data_in_leaf=50`, `feature_fraction=0.8`, `bagging_fraction=0.8`, `seed=42`, `n_estimators` según *early stopping*.
- Artefacto entregado: el modelo entrenado con *train + validación* y los hiperparámetros fijos, y evaluado en la prueba. Si después se reentrena con todos los datos para "producción", se documenta como un artefacto separado (`model_full.txt`) y **las métricas reportadas siguen siendo las de la prueba**.

### 3.5 Métricas
- **Principal: MASE.** El numerador es el MAE en la prueba y el denominador es el MAE del *seasonal naive* (m=7) **dentro del entrenamiento**. Se reporta por producto y como promedio (macro y ponderado). Se justifica porque no depende de la escala, permite comparar productos de volumen distinto y MASE < 1 significa "mejor que la referencia semanal", que es justo el criterio de éxito.
- **Complementarias:** MAE (en unidades, interpretable para el panadero), RMSE (penaliza los errores grandes), WAPE (error relativo agregado) y **sesgo** (error medio). El sesgo es clave para las mermas: un sesgo positivo significa sobreproducción.
- **Comparación honesta:** la línea base y el modelo se evalúan sobre las mismas filas de prueba. También se incluye una segunda referencia, `roll_mean_same_dow_4`, para saber si LightGBM aporta más que una media estacional simple.
- **Impacto de negocio (estimado):** para galletas, brownie y croissant se calculan las unidades sobrantes y faltantes si se hubiera producido lo pronosticado, frente a hacerlo con la línea base.

### 3.6 Análisis de errores (`reports/error_analysis.md`)
Errores por producto, por día de la semana, en feriados y sus vísperas, en días con promoción, en vacaciones, en productos nuevos (arranque en frío) y en el producto discontinuado. Incluye gráficos de real vs. pronóstico de 2 o 3 productos y la importancia de variables (*gain*).

### 3.7 Inferencia (`predict.py`)
Contrato por stdin/stdout en JSON (nombres de campos en inglés):
```json
// input
{ "productId": "uuid", "history": [{"date": "2026-09-01", "qty": 12}, ...],
  "cutoffDate": "2026-10-03", "horizon": 7,
  "product": {"category": "Cafes", "type": "Producto elaborado", "price": 13.0, "launchDate": "2021-10-01"},
  "discounts": [{"start": "...", "end": "...", "value": 25}] }
// output
{ "modelVersion": "lgbm-2026-10-xx", "predictions": [{"date": "2026-10-04", "forecast": 7.4, "baseline": 6, "isClosed": false}, ...] }
```
- Valida que haya ≥ 28 días de historial; si no, devuelve un error explícito.
- Recorta las predicciones negativas a 0 y redondea para producción con `ceil`. El valor continuo también se devuelve.
- Carga `model.txt` y `metadata.json` y verifica que la lista de variables coincida.

---

## 4. Cambios en el BACKEND (NestJS)

### 4.1 Dependencias nuevas
```
npm i @nestjs/config pg class-validator class-transformer
npm i -D @types/pg @types/multer
```
(`multer` ya viene con `@nestjs/platform-express`. No hace falta un ORM: las consultas son de solo lectura y agregadas, y SQL directo con `pg` es más simple y más claro.)

### 4.2 Estructura propuesta
```
backend/src/
├── main.ts                     # global prefix /api, CORS, ValidationPipe(whitelist, transform)
├── app.module.ts               # ConfigModule, DatabaseModule, ProductsModule, ForecastModule, ModelModule
├── common/
│   └── http-exception.filter.ts  # uniform error body { statusCode, message (Spanish), details }
├── database/
│   ├── database.module.ts
│   └── database.service.ts     # pg Pool from DATABASE_URL, query<T>()
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts  # GET /api/products
│   └── products.service.ts     # sellable products + first/last sale date + discontinued flag
├── forecast/
│   ├── forecast.module.ts
│   ├── forecast.controller.ts  # POST /api/forecast, POST /api/forecast/upload
│   ├── forecast.service.ts     # loads history, discounts, calls ModelRunner, builds response
│   ├── dto/forecast-request.dto.ts
│   ├── dto/forecast-response.dto.ts
│   └── csv-parser.ts           # parses and validates uploaded history CSV
├── model/
│   ├── model.module.ts
│   ├── model-runner.service.ts # spawns `python ml/src/predict.py`, JSON stdin/stdout, timeout
│   └── model.controller.ts     # GET /api/model/info (reads ml/reports/metrics.json + metadata.json)
└── health/health.controller.ts # GET /api/health (DB + python + model artifact available)
```
Se eliminan `app.controller.ts`, `app.service.ts` y su *spec* de "Hello World".

### 4.3 Integración con el modelo (decisión técnica)
- **Elegida:** `ModelRunnerService` ejecuta `child_process.spawn(PYTHON_BIN, ['ml/src/predict.py'])`, envía el JSON por stdin y lee el resultado por stdout. Tiene un *timeout* de 15 s; si el proceso sale con código ≠ 0, devuelve `503` con el mensaje "El modelo no está disponible".
  - Motivos: un solo servidor que levantar, el preprocesamiento queda en `features.py` (la misma función que en el entrenamiento, sin duplicar lógica en TypeScript) y el modelo que se ejecuta es el real, no respuestas escritas de antemano.
- Alternativa descartada por simplicidad: un microservicio FastAPI. Sería útil si la latencia por proceso (≈1 s al importar pandas) fuera un problema.

### 4.4 Endpoints
| Método | Ruta | Entrada | Salida |
|---|---|---|---|
| GET | `/api/health` | — | Estado de la base de datos, de Python y del artefacto. |
| GET | `/api/products` | — | `[{id, name, category, type, firstSale, lastSale, discontinued, batchSize?}]` |
| POST | `/api/forecast` | `{productId: UUID, cutoffDate?: ISO date, horizon: 1..7}` | Historial de 28 días, pronóstico y línea base por día, total, sugerencia de producción y, si `cutoffDate` es pasado, **valores reales** con el error del modelo y de la línea base (modo *backtest*). |
| POST | `/api/forecast/upload` | `multipart`: CSV `date,qty` (≥ 28 filas) + `productId` + `horizon` | Lo mismo, usando el historial cargado por el usuario. |
| GET | `/api/model/info` | — | Versión, rango de entrenamiento, variables y métricas de prueba (MASE, MAE, RMSE, WAPE y sesgo; modelo vs. línea base) leídas de `metrics.json`. |

### 4.5 Validación y manejo de errores
- DTO con `class-validator`: `@IsUUID()`, `@IsDateString()` y `@IsInt() @Min(1) @Max(7)` en `horizon`.
- Reglas de negocio, con mensajes en español:
  - El producto no existe o no es vendible → `404`.
  - `cutoffDate` es posterior al último dato disponible → `400` con "La fecha de corte supera los datos disponibles (2026-10-03)".
  - Historial menor a 28 días (productos nuevos o CSV corto) → `422`.
  - El producto está discontinuado → `200` con `warnings: ["Producto sin ventas desde …"]`.
  - CSV: columnas faltantes, fechas inválidas o duplicadas, cantidades negativas o no numéricas, archivo > 1 MB o que no es `.csv` → `400` con la fila del error.
  - Python o el artefacto no están disponibles → `503`.
- Fechas de cierre (feriados) en el horizonte: `forecast = 0` e `isClosed: true` con una nota.

### 4.6 Sugerencia de producción (valor de negocio)
- Galletas: `ceil(forecast / 24)` tandas. Brownie: `ceil(forecast / 16)` bandejas, usando `receta.cantidad`. Croissant: bandejas de 12 a comprar.
- Las bebidas preparadas al momento (`es_stock_directo = false`) muestran el pronóstico como guía de insumos y personal, no de fabricación.

### 4.7 Configuración
`backend/.env.example`:
```
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cafeteria
PYTHON_BIN=python
ML_DIR=../ml
FRONTEND_ORIGIN=http://localhost:5173
```

### 4.8 Pruebas del backend
- **Unitarias (Jest):** validación de DTO, `csv-parser` (casos válidos e inválidos), `ForecastService` con `ModelRunner` simulado (*mock*) para la lógica de cierres, tandas y advertencias.
- **E2E (supertest, `test/forecast.e2e-spec.ts`)** contra la base restaurada y el **modelo real**:
  1. **Caso válido:** Cafe Americano, corte 2026-09-26, horizonte 7 → 7 predicciones ≥ 0 y la comparación con los valores reales.
  2. **Caso difícil:** la semana de Carnaval 2026 (corte 2026-02-14), con días cerrados y demanda atípica. También Sandwich Napolitano con poco historial y Agua con gas discontinuado → advertencia.
  3. **Entrada inválida:** UUID mal formado, `horizon=30`, una fecha futura fuera de rango y un CSV con cantidades negativas → 400/404/422 con mensaje.
  4. **Flujo completo:** `GET /products` → `POST /forecast` → `GET /model/info`.

---

## 5. Cambios en el FRONTEND (React + Vite)

### 5.1 Dependencias
```
npm i recharts
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom   # pruebas de componentes
```

### 5.2 Limpieza
- Eliminar el contenido de ejemplo de `App.tsx`, `App.css`, `assets/hero.png`, `react.svg`, `vite.svg` y `public/icons.svg`.
- En `index.html`: `lang="es"` y `<title>Pronóstico de demanda</title>`.
- En `vite.config.ts`: un proxy `'/api' → http://localhost:3000` para evitar problemas de CORS en desarrollo.

### 5.3 Estructura propuesta
```
frontend/src/
├── main.tsx
├── App.tsx                       # layout + page state
├── api/client.ts                 # fetch wrappers: getProducts, postForecast, uploadForecast, getModelInfo
├── types.ts                      # Product, ForecastResponse, ModelInfo
├── components/
│   ├── ForecastForm.tsx          # product select, cutoff date, horizon (1–7), submit
│   ├── CsvUpload.tsx             # file input + format help + template download
│   ├── ForecastChart.tsx         # recharts: 28-day history, forecast, baseline, actuals (if backtest)
│   ├── ForecastTable.tsx         # date, day name, forecast, baseline, actual, closed flag
│   ├── ProductionSuggestion.tsx  # "Hornear 1 tanda de galletas (24 u.)"
│   ├── ModelMetricsCard.tsx      # MASE model vs baseline, MAE, bias (from /api/model/info)
│   ├── LimitationsNotice.tsx     # límites de la solución
│   ├── LoadingState.tsx
│   └── ErrorAlert.tsx
└── styles.css
```

### 5.4 Flujo de usuario (interfaz en español)
1. **Cabecera:** "Pronóstico de demanda diaria — Cafetería", con la versión del modelo y el MASE de prueba (modelo vs. línea base).
2. **Pestañas de entrada:**
   - *Desde la base de datos:* elegir un producto (agrupado por categoría y con una etiqueta "discontinuado" si corresponde), una fecha de corte (por defecto la última fecha disponible, con límites `min`/`max` en el selector) y un horizonte de 1 a 7.
   - *Cargar CSV:* subir un historial propio (`fecha,cantidad`), con una plantilla descargable y validación previa en el cliente.
3. Botón **"Generar pronóstico"**, que queda deshabilitado mientras se procesa.
4. **Resultado:**
   - Un gráfico de líneas con el historial (28 días), el pronóstico de LightGBM, la línea base del mismo día de la semana anterior y, en *backtest*, los valores reales.
   - Una tabla por día; los días cerrados se marcan como "Cerrado (feriado)".
   - Indicadores: total pronosticado para el horizonte y diferencia contra la línea base.
   - La **sugerencia de producción** en tandas o bandejas.
   - En *backtest*: el MAE del modelo frente al de la línea base para ese tramo.
5. **Estados:** un *spinner* con "Ejecutando modelo…", errores de la API mostrados con su mensaje en español, un estado vacío inicial y advertencias en amarillo (producto discontinuado, poco historial).
6. **Panel "Límites de la solución"** (fijo):
   - Horizonte máximo de 7 días.
   - Requiere ≥ 28 días de historial.
   - No anticipa eventos no registrados (clima, eventos locales, quiebres de stock).
   - Los productos nuevos o discontinuados tienen mayor error.
   - La demanda se mide como ventas, así que si hubo faltante la demanda real puede estar subestimada (demanda censurada).
   - Los datos llegan hasta el 2026-10-03.

### 5.5 Pruebas del frontend
- Vitest: `ForecastForm` valida el horizonte y la fecha, `CsvUpload` rechaza un archivo mal formado y `ErrorAlert` muestra el mensaje de la API.
- Una prueba manual documentada en el README con capturas de los tres casos: válido, difícil e inválido.

---

## 6. Documentación y entregables

`README.md` en la raíz (en español), con los pasos reproducibles:
1. Requisitos: PostgreSQL 16 (con **psql ≥ 16.10**, porque el dump usa el comando `\restrict`), Node 20+ y Python 3.11+.
2. Restaurar la base: `createdb cafeteria` y luego `psql -d cafeteria -f backup.sql`.
3. ML: `python -m venv .venv`, `pip install -r ml/requirements.txt`, `python ml/src/extract.py`, `python ml/src/train.py` y `pytest ml/tests`.
4. Backend: `cp .env.example .env`, `npm install`, `npm run start:dev` y `npm run test:e2e`.
5. Frontend: `npm install` y `npm run dev` → http://localhost:5173.

El README también debe incluir:
- **Ficha del dataset:** origen, tamaño, variables y preparación (sección 2), más la aclaración de si es real o simulado.
- **Ficha del modelo:** LightGBM y su versión, hiperparámetros, variables, qué se entrenó (todo el modelo; no hay componentes preentrenados), semilla y artefactos.
- **Tabla de resultados** del modelo vs. la línea base en la prueba, con el análisis de errores y los límites.
- Una revisión de la coherencia de la ficha técnica: la unidad de observación (producto × día), el objetivo (cantidad vendida), la línea base (*seasonal naive* m=7) y la métrica (MASE). Es coherente con proyecto.md y se agregan el sesgo y el impacto en mermas como métricas complementarias justificadas.

---

## 7. Plan de trabajo (orden sugerido)

| # | Fase | Entregable | Criterio de "hecho" |
|---|---|---|---|
| 1 | Restaurar la base y hacer el EDA | `ml/src/extract.py`, `daily_sales.csv`, figuras | El dataset diario tiene 17 productos y los ceros completados. |
| 2 | Línea base y métricas | `baseline.py`, `metrics.py` | MASE de la línea base en la prueba ≈ 1. |
| 3 | Variables + LightGBM + validación temporal | `features.py`, `train.py`, `model.txt`, `metrics.json` | MASE < 1 en la prueba sin tocar la prueba al ajustar; las pruebas de fuga pasan. |
| 4 | Análisis de errores | `error_analysis.md` | Desglose por producto, día y feriados, más el impacto en mermas. |
| 5 | Script de inferencia | `predict.py` | Misma salida que `train.py` para una fecha de la prueba. |
| 6 | Backend | Módulos y endpoints de la sección 4 | Las pruebas e2e (válido, difícil, inválido y flujo completo) pasan. |
| 7 | Frontend | Componentes de la sección 5 | Los tres casos se ven en la UI, con carga, error y límites. |
| 8 | README y presentación | README raíz, capturas | Una persona nueva puede levantar todo siguiendo el README. |

---

## 8. Correspondencia con instrucciones.md

| Requisito | Dónde se cumple |
|---|---|
| Dataset (origen, tamaño, variables, preparación) | §2, `extract.py`, README |
| Modelo (código, parámetros, artefacto) | §3.4, `train.py`, `artifacts/` |
| Línea base y métricas justificadas + análisis de errores | §3.5, §3.6 |
| Validación temporal sin fugas y sin ajustar con la prueba | §3.3, §3.4, `tests/test_features.py` |
| API que preprocesa y ejecuta el modelo real, valida y maneja errores | §4.3 – §4.5 |
| Frontend: ingresar/cargar datos, carga, errores, límites | §5.4 |
| Pruebas: válido, difícil, inválido, flujo completo, README | §4.8, §5.5, §6 |
| Código en inglés, UI y documentación en español | Convención en todo el plan |
