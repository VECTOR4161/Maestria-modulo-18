import type { Product } from '../types'

interface Props {
  products: Product[]
  value: string
  onChange: (productId: string) => void
  disabled?: boolean
}

export function ProductSelect({ products, value, onChange, disabled }: Props) {
  const categories = [...new Set(products.map((p) => p.category))]
  return (
    <label className="field">
      <span>Producto</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required
      >
        <option value="">Seleccione un producto…</option>
        {categories.map((category) => (
          <optgroup key={category} label={category}>
            {products
              .filter((p) => p.category === category)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.discontinued ? ' (discontinuado)' : ''}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
