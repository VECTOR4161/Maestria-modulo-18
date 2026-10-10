import { number } from '../format'
import type { MethodKey, ModelInfo } from '../types'

const METHODS: { key: MethodKey; label: string }[] = [
  { key: 'lightgbm', label: 'LightGBM' },
  { key: 'seasonal_naive', label: 'Línea base: mismo día semana anterior' },
  { key: 'same_weekday_mean', label: 'Media de los 4 mismos días' },
]

export function ModelMetricsCard({ info }: { info: ModelInfo }) {
  return (
    <section className="card">
      <header className="card-header">
        <h2>Desempeño del modelo en la prueba</h2>
        <span className={info.success ? 'badge ok' : 'badge warn'}>
          {info.success ? 'MASE < 1: supera la línea base' : 'No supera la línea base'}
        </span>
      </header>
      <p className="muted">
        Prueba {info.ranges.test[0]} → {info.ranges.test[1]} ({info.testRows} combinaciones producto-día,{' '}
        {info.productsEvaluated} productos). Entrenado hasta {info.trainedUntil} con división temporal; la prueba
        no se usó para ajustar el modelo.
      </p>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Método</th>
              <th className="num">MASE</th>
              <th className="num">MAE</th>
              <th className="num">RMSE</th>
              <th className="num">WAPE</th>
              <th className="num">Sesgo</th>
            </tr>
          </thead>
          <tbody>
            {METHODS.map(({ key, label }) => {
              const m = info.overall[key]
              return (
                <tr key={key} className={key === 'lightgbm' ? 'highlight' : undefined}>
                  <td>{label}</td>
                  <td className="num strong">{number(m.mase_macro, 3)}</td>
                  <td className="num">{number(m.mae)}</td>
                  <td className="num">{number(m.rmse)}</td>
                  <td className="num">{m.wape === null ? '—' : `${number(m.wape * 100, 1)}%`}</td>
                  <td className="num">{number(m.bias)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        MASE = MAE del método ÷ MAE de la línea base semanal en el entrenamiento. Valores menores a 1 indican un
        pronóstico mejor que repetir la venta de la semana anterior. Modelo {info.modelVersion} · LightGBM{' '}
        {info.lightgbmVersion}.
      </p>
    </section>
  )
}
