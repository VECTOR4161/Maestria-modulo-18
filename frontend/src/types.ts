export interface Product {
  id: string
  name: string
  category: string
  type: string
  price: number
  stocked: boolean
  batchSize: number
  batchLabel: string
  firstSale: string
  lastSale: string
  discontinued: boolean
  trained: boolean
}

export interface ProductsResponse {
  lastDataDate: string
  products: Product[]
}

export interface DailySale {
  date: string
  qty: number
}

export interface ForecastPoint {
  date: string
  forecast: number
  baseline: number
  sameWeekdayMean: number
  isClosed: boolean
  discountPct: number
  suggestedUnits: number
  actual: number | null
}

export interface ForecastResponse {
  source: 'database' | 'upload'
  product: Product
  modelVersion: string
  cutoffDate: string
  horizon: number
  historyDays: number
  history: DailySale[]
  predictions: ForecastPoint[]
  summary: {
    totalForecast: number
    totalBaseline: number
    totalActual: number | null
    maeModel: number | null
    maeBaseline: number | null
  }
  production: {
    batchSize: number
    batchLabel: string
    units: number
    batches: number
  } | null
  warnings: string[]
}

export interface MethodMetrics {
  mase_macro: number
  mase_pooled: number
  mae: number
  rmse: number
  wape: number | null
  bias: number
}

export type MethodKey = 'lightgbm' | 'seasonal_naive' | 'same_weekday_mean'

export interface ModelInfo {
  modelVersion: string
  createdAt: string
  lightgbmVersion: string
  trainedUntil: string
  lastDataDate: string
  horizon: number
  minHistoryDays: number
  features: string[]
  selectedParams: Record<string, string | number>
  numBoostRound: number
  ranges: Record<'train' | 'validation' | 'test', [string, string]>
  testRows: number
  productsEvaluated: number
  success: boolean
  overall: Record<MethodKey, MethodMetrics>
  featureImportance: { feature: string; gain: number }[]
}

export interface ForecastRequest {
  productId: string
  cutoffDate?: string
  horizon: number
}

export interface UploadRequest {
  productId: string
  horizon: number
  file: File
}
