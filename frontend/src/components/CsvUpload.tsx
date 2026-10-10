import { useState, type FormEvent } from 'react'
import type { Product, UploadRequest } from '../types'
import { MAX_HORIZON, MIN_HISTORY_DAYS, validateCsvFile, validateHorizon } from '../validation'
import { HorizonSelect } from './HorizonSelect'
import { ProductSelect } from './ProductSelect'

interface Props {
  products: Product[]
  loading: boolean
  onSubmit: (request: UploadRequest) => void
}

const TEMPLATE = [
  'fecha,cantidad',
  ...Array.from({ length: 35 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 8, 1 + i))
    return `${date.toISOString().slice(0, 10)},${[5, 8, 7, 8, 7, 8, 11][date.getUTCDay()]}`
  }),
].join('\n')

const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`

export function CsvUpload({ products, loading, onSubmit }: Props) {
  const [productId, setProductId] = useState('')
  const [horizon, setHorizon] = useState(MAX_HORIZON)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validation =
      (!productId ? 'Seleccione el producto al que corresponde el historial.' : null) ??
      validateCsvFile(file) ??
      validateHorizon(horizon)
    setError(validation)
    if (!validation && file) {
      onSubmit({ productId, horizon, file })
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <ProductSelect products={products} value={productId} onChange={setProductId} disabled={loading} />
      <label className="field">
        <span>Archivo de historial (.csv)</span>
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label="Archivo de historial"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          disabled={loading}
        />
        <small>
          Columnas <code>fecha</code> (AAAA-MM-DD) y <code>cantidad</code>, al menos {MIN_HISTORY_DAYS} días
          consecutivos; el pronóstico empieza el día siguiente a la última fecha.{' '}
          <a href={TEMPLATE_HREF} download="plantilla_historial.csv">
            Descargar plantilla
          </a>
        </small>
      </label>
      <HorizonSelect value={horizon} onChange={setHorizon} disabled={loading} />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary" disabled={loading}>
        {loading ? 'Ejecutando modelo…' : 'Pronosticar con el archivo'}
      </button>
    </form>
  )
}
