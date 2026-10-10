import { addDays } from './format'
import type { Product } from './types'

export const MAX_HORIZON = 7
export const MIN_HISTORY_DAYS = 28
export const MAX_FILE_BYTES = 1024 * 1024

export function earliestCutoff(product: Product): string {
  return addDays(product.firstSale, MIN_HISTORY_DAYS - 1)
}

export function validateHorizon(horizon: number): string | null {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > MAX_HORIZON) {
    return `El horizonte debe ser un número entero entre 1 y ${MAX_HORIZON} días.`
  }
  return null
}

export function validateForecastForm(params: {
  product: Product | undefined
  cutoffDate: string
  horizon: number
  lastDataDate: string
}): string | null {
  const { product, cutoffDate, horizon, lastDataDate } = params
  if (!product) {
    return 'Seleccione un producto.'
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) {
    return 'Ingrese una fecha de corte válida.'
  }
  if (cutoffDate > lastDataDate) {
    return `La fecha de corte no puede superar el último dato disponible (${lastDataDate}).`
  }
  if (cutoffDate < earliestCutoff(product)) {
    return `Se requieren al menos ${MIN_HISTORY_DAYS} días de historial: la fecha de corte mínima es ${earliestCutoff(product)}.`
  }
  return validateHorizon(horizon)
}

export function validateCsvFile(file: File | null): string | null {
  if (!file) {
    return 'Seleccione un archivo CSV.'
  }
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return 'El archivo debe tener extensión .csv.'
  }
  if (file.size === 0) {
    return 'El archivo está vacío.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'El archivo supera el tamaño máximo de 1 MB.'
  }
  return null
}
