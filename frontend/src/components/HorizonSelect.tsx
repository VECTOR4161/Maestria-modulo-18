import { MAX_HORIZON } from '../validation'

interface Props {
  value: number
  onChange: (horizon: number) => void
  disabled?: boolean
}

export function HorizonSelect({ value, onChange, disabled }: Props) {
  return (
    <label className="field">
      <span>Horizonte</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
      >
        {Array.from({ length: MAX_HORIZON }, (_, i) => i + 1).map((days) => (
          <option key={days} value={days}>
            {days} {days === 1 ? 'día' : 'días'}
          </option>
        ))}
      </select>
    </label>
  )
}
