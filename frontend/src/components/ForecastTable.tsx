import { number, shortDate, weekday } from '../format'
import type { ForecastPoint } from '../types'

export function ForecastTable({ predictions }: { predictions: ForecastPoint[] }) {
  const hasActuals = predictions.some((p) => p.actual !== null)
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th className="num">LightGBM</th>
            <th className="num">Línea base</th>
            <th className="num">A preparar</th>
            {hasActuals && <th className="num">Real</th>}
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p) => (
            <tr key={p.date} className={p.isClosed ? 'closed' : undefined}>
              <td>
                <span className="weekday">{weekday(p.date)}</span> {shortDate(p.date)}
              </td>
              <td className="num strong">{number(p.forecast)}</td>
              <td className="num">{number(p.baseline, 0)}</td>
              <td className="num">{p.suggestedUnits}</td>
              {hasActuals && <td className="num">{number(p.actual, 0)}</td>}
              <td>
                {p.isClosed && <span className="tag">Cerrado (feriado)</span>}
                {p.discountPct > 0 && <span className="tag">Descuento {number(p.discountPct, 0)}%</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
