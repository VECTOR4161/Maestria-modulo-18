import { useState, type FormEvent } from 'react'
import type { ForecastRequest, Product } from '../types'
import { earliestCutoff, MAX_HORIZON, validateForecastForm } from '../validation'
import { HorizonSelect } from './HorizonSelect'
import { ProductSelect } from './ProductSelect'

interface Props {
  products: Product[]
  lastDataDate: string
  loading: boolean
  onSubmit: (request: ForecastRequest) => void
}

export function ForecastForm({ products, lastDataDate, loading, onSubmit }: Props) {
  const [productId, setProductId] = useState('')
  const [cutoffDate, setCutoffDate] = useState(lastDataDate)
  const [horizon, setHorizon] = useState(MAX_HORIZON)
  const [error, setError] = useState<string | null>(null)

  const product = products.find((p) => p.id === productId)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validation = validateForecastForm({ product, cutoffDate, horizon, lastDataDate })
    setError(validation)
    if (!validation) {
      onSubmit({ productId, cutoffDate, horizon })
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <ProductSelect products={products} value={productId} onChange={setProductId} disabled={loading} />
      <label className="field">
        <span>Fecha de corte</span>
        <input
          type="date"
          value={cutoffDate}
          min={product ? earliestCutoff(product) : undefined}
          max={lastDataDate}
          onChange={(event) => setCutoffDate(event.target.value)}
          disabled={loading}
        />
        <small>
          Último dato disponible: {lastDataDate}. Con una fecha anterior se compara el pronóstico con las ventas reales.
        </small>
      </label>
      <HorizonSelect value={horizon} onChange={setHorizon} disabled={loading} />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary" disabled={loading}>
        {loading ? 'Ejecutando modelo…' : 'Generar pronóstico'}
      </button>
    </form>
  )
}
