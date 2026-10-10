import { number } from '../format'
import type { ForecastResponse } from '../types'

export function ForecastSummary({ result }: { result: ForecastResponse }) {
  const { summary, production, product } = result
  const difference = summary.totalForecast - summary.totalBaseline
  return (
    <div className="stats">
      <div className="stat">
        <span className="stat-label">Demanda pronosticada</span>
        <span className="stat-value">{number(summary.totalForecast, 1)} u.</span>
        <span className="stat-note">
          {difference >= 0 ? '+' : ''}
          {number(difference, 1)} u. frente a la línea base ({number(summary.totalBaseline, 0)} u.)
        </span>
      </div>
      {summary.totalActual !== null && (
        <div className="stat">
          <span className="stat-label">Ventas reales</span>
          <span className="stat-value">{number(summary.totalActual, 0)} u.</span>
          <span className="stat-note">
            MAE LightGBM {number(summary.maeModel)} · MAE línea base {number(summary.maeBaseline)}
          </span>
        </div>
      )}
      <div className="stat">
        <span className="stat-label">Sugerencia de producción</span>
        {production ? (
          <>
            <span className="stat-value">
              {production.batches} × {production.batchLabel}
            </span>
            <span className="stat-note">
              {production.units} u. a preparar ({production.batchSize} u. por {production.batchLabel})
            </span>
          </>
        ) : (
          <>
            <span className="stat-value">Al momento</span>
            <span className="stat-note">
              {product.name} se prepara al pedido: use el pronóstico para planificar insumos y personal.
            </span>
          </>
        )}
      </div>
    </div>
  )
}
