import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { number, shortDate, weekday } from '../format'
import type { ForecastResponse } from '../types'

interface ChartRow {
  date: string
  real: number | null
  forecast: number | null
  baseline: number | null
}

function buildRows(result: ForecastResponse): ChartRow[] {
  const history = result.history.map((point): ChartRow => ({
    date: point.date,
    real: point.qty,
    forecast: null,
    baseline: null,
  }))
  const lastHistory = history[history.length - 1]
  if (lastHistory) {
    lastHistory.forecast = lastHistory.real
    lastHistory.baseline = lastHistory.real
  }
  const future = result.predictions.map((p) => ({
    date: p.date,
    real: p.actual,
    forecast: p.forecast,
    baseline: p.baseline,
  }))
  return [...history, ...future]
}

export function ForecastChart({ result }: { result: ForecastResponse }) {
  const rows = buildRows(result)
  return (
    <figure className="chart" aria-label="Gráfico de historial y pronóstico">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            minTickGap={16}
          />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <Tooltip
            labelFormatter={(label) => `${weekday(String(label))} ${shortDate(String(label))}`}
            formatter={(value) => (typeof value === 'number' ? number(value) : '—')}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
          />
          <Legend />
          <ReferenceLine
            x={result.cutoffDate}
            stroke="var(--muted)"
            strokeDasharray="4 4"
            label={{ value: 'Corte', fill: 'var(--muted)', fontSize: 12, position: 'insideTopRight' }}
          />
          <Line
            type="monotone"
            dataKey="real"
            name="Ventas reales"
            stroke="var(--series-real)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="LightGBM"
            stroke="var(--series-model)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Línea base (semana anterior)"
            stroke="var(--series-baseline)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}
