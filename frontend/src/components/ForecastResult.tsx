import { longDate } from '../format'
import type { ForecastResponse } from '../types'
import { ForecastChart } from './ForecastChart'
import { ForecastSummary } from './ForecastSummary'
import { ForecastTable } from './ForecastTable'
import { WarningList } from './StatusMessages'

export function ForecastResult({ result }: { result: ForecastResponse }) {
  const isBacktest = result.predictions.some((p) => p.actual !== null)
  return (
    <section className="card result" aria-label="Resultado del pronóstico">
      <header className="card-header">
        <div>
          <h2>{result.product.name}</h2>
          <p className="muted">
            {result.product.category} · corte {longDate(result.cutoffDate)} · {result.horizon}{' '}
            {result.horizon === 1 ? 'día' : 'días'} · {result.historyDays} días de historial
            {result.source === 'upload' ? ' (archivo cargado)' : ''}
          </p>
        </div>
        <span className="badge">{isBacktest ? 'Comparación con ventas reales' : 'Pronóstico a futuro'}</span>
      </header>
      <WarningList warnings={result.warnings} />
      <ForecastSummary result={result} />
      <ForecastChart result={result} />
      <ForecastTable predictions={result.predictions} />
    </section>
  )
}
