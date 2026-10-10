const weekdayFormatter = new Intl.DateTimeFormat('es-BO', {
  weekday: 'short',
  timeZone: 'UTC',
})

const shortDateFormatter = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

const longDateFormatter = new Intl.DateTimeFormat('es-BO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const toUtcDate = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`)

export const weekday = (isoDate: string) => weekdayFormatter.format(toUtcDate(isoDate))

export const shortDate = (isoDate: string) => shortDateFormatter.format(toUtcDate(isoDate))

export const longDate = (isoDate: string) => longDateFormatter.format(toUtcDate(isoDate))

export const number = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined
    ? '—'
    : value.toLocaleString('es-BO', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })

export function addDays(isoDate: string, days: number): string {
  const date = toUtcDate(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
