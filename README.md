# Pronóstico de demanda diaria por artículo

**Estudiante:** Fernando Ichazo Cisneros

Este sistema pronostica, para cada artículo de una cafetería, cuántas unidades se venderán en los próximos 1 a 7 días. El objetivo es ajustar el volumen de fabricación y reducir las mermas. Usa un modelo **LightGBM** y lo compara con la línea base *seasonal naive*, que repite la venta del mismo día de la semana anterior.

| Componente | Tecnología | Carpeta |
|---|---|---|
| Base de datos | PostgreSQL 16 (restaurada desde `backup.sql`) | `docker-compose.yml` |
| Modelo | Python 3.11+, LightGBM 4.7, pandas | `ml/` |
| API | NestJS 11, que ejecuta el modelo real con `ml/src/predict.py` | `backend/` |
| Interfaz | React 19 + Vite + Recharts | `frontend/` |

---

## 1. Puesta en marcha

Requisitos: Docker Desktop, Node.js 20+ y Python 3.11+.

```bash
# 1. Base de datos (la primera vez restaura backup.sql automáticamente, ~1 minuto)
docker compose up -d
docker logs -f cafeteria-db        # esperar "database system is ready to accept connections"

# 2. Modelo
python -m venv .venv && .venv\Scripts\activate      # Windows (Linux/macOS: source .venv/bin/activate)
pip install -r ml/requirements.txt
python ml/src/extract.py           # SQL -> ml/data/*.csv
python ml/src/train.py             # validación temporal, entrenamiento y evaluación en la prueba
python ml/src/evaluate.py          # análisis de errores y figuras (ml/reports/)
cd ml && python -m pytest && cd ..

# 3. Backend (http://localhost:3000/api/v1)
cd backend
cp .env.example .env               # ajustar PYTHON_BIN si se usa el entorno virtual (p. ej. ../.venv/Scripts/python)
npm install
npm run start:dev

# 4. Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
npm test
```

Si ya tiene PostgreSQL 16 instalado, puede restaurar la base sin Docker con `createdb cafeteria` y luego `psql -d cafeteria -f backup.sql`. Necesita **psql ≥ 16.10**, porque el volcado usa el comando `\restrict`.

---

## 2. Dataset

- **Origen:** `backup.sql`, un volcado de PostgreSQL 16.14 del sistema operativo de una cafetería con pastelería (ventas, inventario, producción y recetas). Las coordenadas de los pedidos corresponden a Tarija, Bolivia. *Se debe confirmar si los datos son reales o simulados. Las regularidades del volcado sugieren una base simulada; si lo es, hay que adjuntar el generador, la semilla y sus limitaciones.*
- **Periodo:** del 2021-10-01 al 2026-10-03 (1 829 días).
- **Tablas usadas:**
  - `venta` (95 313 ventas: 94 554 completadas y 759 anuladas)
  - `detalle_venta` (136 627 líneas)
  - `producto`, `categoria`, `tipo`
  - `descuentos` (36 promociones activas)
  - `receta` y `conversiones` (tamaño de tanda o paquete)
- **Unidad de observación:** producto × día. **Objetivo:** la cantidad vendida ese día (`SUM(detalle_venta.cantidad)`).
- **Preparación** (`ml/src/extract.py`, `ml/src/dataset.py`):
  1. Solo se toman ventas *Completadas* no borradas de productos vendibles; las anuladas se excluyen.
  2. Cada serie va desde la primera venta del producto hasta el último día con datos, y los días sin venta se completan con 0. El resultado son 17 productos y unas 29 000 filas.
  3. Se descartan los primeros 28 días de cada serie, que no tienen rezagos completos.
  4. Los **30 días sin ninguna venta** coinciden con los cierres del local: 1 de enero, lunes y martes de Carnaval, Viernes Santo, 1 de mayo y 25 de diciembre. Se generan con un calendario (`calendar_bo.py`), no mirando el objetivo. Se excluyen del entrenamiento y, en inferencia, una regla de negocio devuelve 0 para esos días.
  5. Un producto se marca como **discontinuado** si no tiene ventas en los últimos 30 días. Es el caso de *Agua con gas 500 ml*, cuya última venta fue el 2026-03-27.

## 3. Modelo

- **Variables** (`ml/src/features.py`, compartido entre el entrenamiento y la inferencia):
  - rezagos de 7, 14, 21, 28 y 364 días;
  - medias móviles de 7 y 28 días y desviación de 28 días, todas desplazadas 7 días;
  - media de los 4 últimos mismos días de la semana;
  - calendario: día de la semana, del mes, mes y semana del año;
  - cierre, víspera de cierre y vacaciones escolares;
  - descuento activo y porcentaje de descuento;
  - días desde el lanzamiento del producto;
  - código de producto y de categoría (categóricas).
- **Estrategia directa:** todos los rezagos son de 7 días o más, así que un solo modelo pronostica de t+1 a t+7 sin recursión y sin usar datos posteriores a la fecha de corte. `tests/test_features.py` lo verifica.
- **Entrenamiento** (`ml/src/train.py`, semilla 42):
  - Se compararon 6 configuraciones (objetivo `regression_l1`, `tweedie` o `regression`, con `num_leaves` 15 o 31).
  - Se usó validación temporal *rolling origin* con 4 pliegues sobre el periodo de validación y *early stopping*.
  - Configuración elegida: `tweedie`, `num_leaves=31`, `learning_rate=0.03`, `min_data_in_leaf=50`, `feature_fraction=0.8`, `bagging_fraction=0.8` y 280 árboles.
- **Artefactos:**
  - `ml/artifacts/model.txt`: el *booster* de LightGBM.
  - `ml/artifacts/metadata.json`: variables, códigos de producto, parámetros y versiones.
  - El modelo se entrenó desde cero con estos datos; no se reutiliza ningún modelo preentrenado.

| Conjunto | Rango | Uso |
|---|---|---|
| Entrenamiento | 2021-10-01 → 2025-09-30 | Ajuste. |
| Validación | 2025-10-01 → 2026-03-31 | Selección de hiperparámetros y número de árboles (4 pliegues temporales). |
| Prueba | 2026-04-01 → 2026-10-03 | Evaluación única y final. El modelo final se entrena con entrenamiento + validación. |

## 4. Resultados en la prueba

La métrica principal es **MASE**: el MAE del método dividido por el MAE del *seasonal naive* (t-7) dentro del periodo de desarrollo de cada producto, promediado entre productos. No depende de la escala de cada producto y MASE < 1 equivale a "mejor que repetir la semana anterior", que es justo el criterio de éxito de la ficha. Como métricas complementarias se reportan MAE (en unidades), RMSE, WAPE y el sesgo (si es positivo, hay sobreproducción).

| Método | MASE | MAE | RMSE | WAPE | Sesgo |
|---|---|---|---|---|---|
| **LightGBM** | **0.751** | **2.13** | **2.78** | **35.7 %** | -0.23 |
| Seasonal naive (t-7), línea base | 1.088 | 3.10 | 4.05 | 52.0 % | -0.07 |
| Media de los 4 últimos mismos días | 0.856 | 2.43 | 3.19 | 40.8 % | -0.09 |

- **Se cumple el criterio de éxito (MASE < 1).** LightGBM mejora a la línea base en los 16 productos activos, con un MASE entre 0.61 y 0.87.
- **Sobrantes y faltantes:** se simuló preparar `ceil(pronóstico)` unidades por día en los productos con stock (galletas, brownie, croissant, agua y té frío). Con LightGBM sobran 1 073 u. y faltan 802 u.; con la línea base sobran 1 292 u. y faltan 1 338 u.
- **Análisis de errores** completo (por producto, día de la semana, feriados, descuentos y peores casos) en [`ml/reports/error_analysis.md`](ml/reports/error_analysis.md), con figuras en `ml/reports/figures/`.
- **Hallazgos principales:**
  - Las variables más importantes son el nivel reciente (`roll_mean_28`), la media de los mismos días de la semana y el producto.
  - El modelo subestima levemente (sesgo -0.23 u/día), sobre todo en Cafe Americano (-1.03).
  - Los días con descuento son los más difíciles: MAE de 3.20 y sesgo de -1.70.
  - La semana siguiente a un cierre es donde la línea base falla más (MAE 5.84 frente a 2.02), porque copia el 0 del feriado.
  - En el producto discontinuado, el modelo sigue pronosticando alrededor de 1 u/día; por eso la API emite una advertencia.
  - Algunos días con venta 0 en productos de vitrina (por ejemplo, galletas el 2026-08-08) parecen quiebres de stock: la demanda observada está censurada.

## 5. API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/health` | Estado de la base de datos y de los artefactos del modelo. |
| GET | `/api/v1/products` | Productos vendibles, último dato disponible, tamaño de tanda o paquete y si está discontinuado. |
| POST | `/api/v1/forecast` | Recibe `{ productId, cutoffDate?, horizon (1–7) }`. Lee el historial de la base, ejecuta el modelo y devuelve el pronóstico, la línea base, las ventas reales (si la fecha de corte es pasada), la sugerencia de producción y las advertencias. |
| POST | `/api/v1/forecast/upload` | Recibe un `multipart` con `file` (CSV `fecha,cantidad`, mínimo 28 días), `productId` y `horizon`, y pronostica desde ese historial. |
| GET | `/api/v1/model/info` | Versión, rangos, hiperparámetros y métricas de prueba leídas de `ml/reports/metrics.json`. |

**Arquitectura del backend** (`backend/src`), organizada por contexto delimitado y slices de cuatro capas:

```
src/
├── main.ts                       prefijo /api, versionado por URI (/api/v1), CORS abierto (MVP) y filtro global de errores
├── app.module.ts                 solo importa la configuración, la base de datos y el módulo de cada slice
├── config/EnvConfiguration.ts    EnvConfiguration() y validateEnvironment()
├── shared/
│   ├── Domain/                   BaseException, DomainException, SystemException y utilidades (fechas, números)
│   ├── Application/              Validator para los DTO de entrada
│   ├── Infrastructure/           DatabaseClient (PostgreSQL) y DatabaseModule
│   └── Presentation/             BaseExceptionFilter y UnhandledExceptionFilter
└── BoundedContext/DemandForecasting/
    ├── Product/                  catálogo de productos (discontinuado, entrenado)
    ├── Sales/                    ventas diarias y descuentos
    ├── PredictiveModel/          artefactos del modelo e inferencia con Python
    ├── Forecast/                 pronóstico desde la base o desde un CSV
    └── SystemHealth/             estado de la base y del modelo
```

Cada slice tiene las capas `Domain`, `Application`, `Infrastructure` y `Presentation`, con un `index.ts` por capa:

| Capa | Contiene | Regla |
|---|---|---|
| `Domain` | Agregados (constructor privado y `restore`/`create`), value objects y constantes de negocio | No importa NestJS ni librerías de infraestructura. |
| `Application` | `Datasource` y `Repository` abstractos, `*UseCase` con su interfaz `I*UseCase`, DTO `*Request` (`createFromRequest` + `Validator`) y `*Response` (`createFrom...`), servicios de aplicación | No conoce SQL, archivos ni HTTP. |
| `Infrastructure` | `*DatasourceImpl` (SQL, archivos del modelo, proceso de Python), `*RepositoryImpl` y mappers | No agrega reglas de negocio. |
| `Presentation` | `*ControllerV1` y `*Module` | El controlador arma el DTO, crea el caso de uso y lo ejecuta. |

Cada módulo registra `{ provide: XDatasource, useClass: XDatasourceImpl }` y `{ provide: XRepository, useClass: XRepositoryImpl }`, y exporta solo el `Repository` abstracto. Los casos de uso no son providers.

Validación y errores, con el formato `{ codigo, tipo, message, timestamp }` (`tipo` es `DomainException` o `SystemException`):
- **400:** UUID inválido, horizonte fuera de rango, fecha mal formada o posterior al último dato, o CSV inválido (fila y motivo).
- **404:** producto inexistente.
- **422:** historial insuficiente.
- **503:** el modelo o Python no están disponibles.

## 6. Pruebas

| Nivel | Comando | Cubre |
|---|---|---|
| ML | `cd ml && python -m pytest` | Ausencia de fuga en las variables, calendario de cierres, igualdad entre la inferencia en línea y la evaluación offline, entradas inválidas. |
| Frontend | `cd frontend && npm test` | Validación de formularios, carga de CSV, estado de carga y mensajes de error. |

El backend no incluye pruebas automáticas. Su flujo completo se verifica manualmente con la interfaz o con las llamadas a la API descritas en `instrucciones_ejecucion.md` (sección 3).

**Prueba manual sugerida en la interfaz:**
1. **Caso válido:** Cafe Americano, fecha de corte 2026-09-26 y 7 días. Se ve el pronóstico frente a las ventas reales.
2. **Caso difícil:** Galletas de mantequilla, fecha de corte 2026-02-14. El lunes y martes de Carnaval quedan en 0 y se sugieren tandas de 24.
3. **Entrada inválida:** cargar un CSV con una cantidad negativa o con menos de 28 días. Se muestra el error.

## 7. Límites

- El horizonte máximo es de 7 días y se requieren al menos 28 días de historial.
- No usa clima, eventos locales ni precios no registrados.
- Los descuentos solo se conocen si están en la tabla `descuentos`.
- La demanda se mide como ventas, así que cuando hubo faltantes la demanda real está subestimada.
- Los productos nuevos o discontinuados tienen mayor error.
- La sugerencia de producción usa `ceil(pronóstico)` y no considera el stock remanente ni la vida útil.
