import { ProductResponse } from '../../../Product/Application';
import {
  Forecast,
  ForecastPoint,
  ForecastSource,
  ForecastSummary,
  HistoryDay,
  ProductionPlan,
} from '../../Domain';

export class ForecastResponse {
  private constructor(
    private readonly source: ForecastSource,
    private readonly product: ProductResponse,
    private readonly modelVersion: string,
    private readonly cutoffDate: string,
    private readonly horizon: number,
    private readonly historyDays: number,
    private readonly history: HistoryDay[],
    private readonly predictions: ForecastPoint[],
    private readonly summary: ForecastSummary,
    private readonly production: ProductionPlan | null,
    private readonly warnings: string[],
  ) {}

  static createFromAggregate(
    forecast: Forecast,
    product: ProductResponse,
  ): ForecastResponse {
    return new ForecastResponse(
      forecast.source,
      product,
      forecast.modelVersion,
      forecast.cutoffDate,
      forecast.horizon,
      forecast.historyDays,
      forecast.displayedHistory,
      forecast.predictions.map((point) => ({
        date: point.date,
        forecast: point.forecast,
        baseline: point.baseline,
        sameWeekdayMean: point.sameWeekdayMean,
        isClosed: point.isClosed,
        discountPct: point.discountPct,
        suggestedUnits: point.suggestedUnits,
        actual: point.actual,
      })),
      forecast.summary,
      forecast.production,
      forecast.warnings,
    );
  }
}
