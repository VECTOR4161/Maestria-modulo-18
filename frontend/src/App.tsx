import { useEffect, useState } from 'react'
import { getModelInfo, getProducts, postForecast, uploadForecast } from './api/client'
import { CsvUpload } from './components/CsvUpload'
import { ForecastForm } from './components/ForecastForm'
import { ForecastResult } from './components/ForecastResult'
import { LimitationsNotice } from './components/LimitationsNotice'
import { ModelMetricsCard } from './components/ModelMetricsCard'
import { ErrorAlert, LoadingState } from './components/StatusMessages'
import { number } from './format'
import type { ForecastResponse, ModelInfo, ProductsResponse } from './types'

type Mode = 'database' | 'upload'

type ForecastState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; result: ForecastResponse }

type CatalogState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; catalog: ProductsResponse; info: ModelInfo }

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Ocurrió un error inesperado.'

const fetchCatalog = (): Promise<CatalogState> =>
  Promise.all([getProducts(), getModelInfo()])
    .then(([catalog, info]): CatalogState => ({ kind: 'ready', catalog, info }))
    .catch((error: unknown): CatalogState => ({ kind: 'error', message: errorMessage(error) }))

function App() {
  const [catalogState, setCatalogState] = useState<CatalogState>({ kind: 'loading' })
  const [mode, setMode] = useState<Mode>('database')
  const [forecast, setForecast] = useState<ForecastState>({ kind: 'idle' })

  function reloadCatalog() {
    setCatalogState({ kind: 'loading' })
    void fetchCatalog().then(setCatalogState)
  }

  useEffect(() => {
    void fetchCatalog().then(setCatalogState)
  }, [])

  async function runForecast(call: () => Promise<ForecastResponse>) {
    setForecast({ kind: 'loading' })
    try {
      setForecast({ kind: 'success', result: await call() })
    } catch (error) {
      setForecast({ kind: 'error', message: errorMessage(error) })
    }
  }

  const loading = forecast.kind === 'loading'

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Cafetería · Machine Learning</p>
          <h1>Pronóstico de demanda diaria por artículo</h1>
          <p className="muted">
            Estima cuántas unidades se venderán en los próximos días para ajustar la producción y reducir mermas.
          </p>
        </div>
        {catalogState.kind === 'ready' && (
          <div className="model-chip">
            <span>MASE LightGBM</span>
            <strong>{number(catalogState.info.overall.lightgbm.mase_macro, 3)}</strong>
            <span>línea base {number(catalogState.info.overall.seasonal_naive.mase_macro, 3)}</span>
          </div>
        )}
      </header>

      {catalogState.kind === 'loading' && <LoadingState message="Cargando productos y modelo…" />}
      {catalogState.kind === 'error' && <ErrorAlert message={catalogState.message} onRetry={reloadCatalog} />}

      {catalogState.kind === 'ready' && (
        <>
          <div className="layout">
            <section className="card input-card">
              <div className="tabs" role="tablist" aria-label="Origen de los datos">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'database'}
                  className={mode === 'database' ? 'tab active' : 'tab'}
                  onClick={() => setMode('database')}
                >
                  Desde la base de datos
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'upload'}
                  className={mode === 'upload' ? 'tab active' : 'tab'}
                  onClick={() => setMode('upload')}
                >
                  Cargar CSV
                </button>
              </div>
              {mode === 'database' ? (
                <ForecastForm
                  products={catalogState.catalog.products}
                  lastDataDate={catalogState.catalog.lastDataDate}
                  loading={loading}
                  onSubmit={(request) => runForecast(() => postForecast(request))}
                />
              ) : (
                <CsvUpload
                  products={catalogState.catalog.products}
                  loading={loading}
                  onSubmit={(request) => runForecast(() => uploadForecast(request))}
                />
              )}
            </section>

            <div className="output">
              {forecast.kind === 'idle' && (
                <div className="card empty">
                  <h2>Sin resultados todavía</h2>
                  <p className="muted">
                    Elija un producto y una fecha de corte, o cargue un historial en CSV, y presione «Generar
                    pronóstico».
                  </p>
                </div>
              )}
              {forecast.kind === 'loading' && <LoadingState message="Ejecutando el modelo LightGBM…" />}
              {forecast.kind === 'error' && <ErrorAlert message={forecast.message} />}
              {forecast.kind === 'success' && <ForecastResult result={forecast.result} />}
            </div>
          </div>

          <ModelMetricsCard info={catalogState.info} />
          <LimitationsNotice lastDataDate={catalogState.catalog.lastDataDate} />
        </>
      )}

      <footer className="page-footer muted small">
        Proyecto final de Machine Learning · N° 30 · Fernando Ichazo Cisneros
      </footer>
    </div>
  )
}

export default App
