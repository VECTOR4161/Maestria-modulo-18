import type {
  ForecastRequest,
  ForecastResponse,
  ModelInfo,
  ProductsResponse,
  UploadRequest,
} from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, init)
  } catch {
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.',
    )
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String(body.message)
        : `Error ${response.status} del servidor.`
    throw new ApiError(response.status, message)
  }
  return body as T
}

export function getProducts(): Promise<ProductsResponse> {
  return request('/products')
}

export function getModelInfo(): Promise<ModelInfo> {
  return request('/model/info')
}

export function postForecast(payload: ForecastRequest): Promise<ForecastResponse> {
  return request('/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function uploadForecast(payload: UploadRequest): Promise<ForecastResponse> {
  const form = new FormData()
  form.append('productId', payload.productId)
  form.append('horizon', String(payload.horizon))
  form.append('file', payload.file)
  return request('/forecast/upload', { method: 'POST', body: form })
}
