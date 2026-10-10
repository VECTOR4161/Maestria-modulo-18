export interface InferenceDay {
  readonly date: string;
  readonly qty: number;
}

export interface InferenceDiscount {
  readonly start: string;
  readonly end: string;
  readonly kind: string;
  readonly value: number;
}

export interface InferenceInput {
  readonly productId: string;
  readonly cutoffDate: string;
  readonly horizon: number;
  readonly history: InferenceDay[];
  readonly discounts: InferenceDiscount[];
}

export interface ModelPrediction {
  readonly date: string;
  readonly forecast: number;
  readonly baseline: number;
  readonly sameWeekdayMean: number;
  readonly isClosed: boolean;
  readonly discountPct: number;
}

export interface InferenceResult {
  readonly modelVersion: string;
  readonly productId: string;
  readonly cutoffDate: string;
  readonly horizon: number;
  readonly historyDays: number;
  readonly predictions: ModelPrediction[];
}
