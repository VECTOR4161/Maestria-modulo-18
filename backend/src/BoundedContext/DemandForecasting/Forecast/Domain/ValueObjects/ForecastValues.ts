export type ForecastSource = 'database' | 'upload';

export interface ForecastedDay {
  readonly date: string;
  readonly forecast: number;
  readonly baseline: number;
  readonly sameWeekdayMean: number;
  readonly isClosed: boolean;
  readonly discountPct: number;
}

export interface ForecastPoint extends ForecastedDay {
  readonly suggestedUnits: number;
  readonly actual: number | null;
}

export interface ForecastSummary {
  readonly totalForecast: number;
  readonly totalBaseline: number;
  readonly totalActual: number | null;
  readonly maeModel: number | null;
  readonly maeBaseline: number | null;
}

export interface ProductionPlan {
  readonly batchSize: number;
  readonly batchLabel: string;
  readonly units: number;
  readonly batches: number;
}

export interface ForecastedProduct {
  readonly stocked: boolean;
  readonly batchSize: number;
  readonly batchLabel: string;
}

export interface HistoryDay {
  readonly date: string;
  readonly qty: number;
}
