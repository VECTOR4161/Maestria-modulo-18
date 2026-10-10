import {
  DomainException,
  mean,
  round2,
  sum,
} from '../../../../../shared/Domain';
import {
  DISPLAYED_HISTORY_DAYS,
  FULL_YEAR_DAYS,
} from '../Constants/ForecastRules';
import {
  ForecastedDay,
  ForecastedProduct,
  ForecastPoint,
  ForecastSource,
  ForecastSummary,
  HistoryDay,
  ProductionPlan,
} from '../ValueObjects/ForecastValues';

export interface ForecastInputs {
  trained: boolean;
  discontinued: boolean;
  lastSale: string;
  historyDays: number;
  minHistoryDays: number;
}

export interface ForecastProps {
  source: ForecastSource;
  product: ForecastedProduct;
  modelVersion: string;
  cutoffDate: string;
  horizon: number;
  historyDays: number;
  history: HistoryDay[];
  days: ForecastedDay[];
  actuals: Map<string, number>;
  warnings: string[];
}

export class Forecast {
  private constructor(
    private readonly props: ForecastProps,
    readonly predictions: ForecastPoint[],
    readonly summary: ForecastSummary,
    readonly production: ProductionPlan | null,
    readonly warnings: string[],
  ) {}

  static assessInputs(inputs: ForecastInputs): string[] {
    if (!inputs.trained) {
      DomainException.throwException(
        422,
        'El producto no forma parte de los productos con los que se entrenó el modelo.',
      );
    }
    if (inputs.historyDays < inputs.minHistoryDays) {
      DomainException.throwException(
        422,
        `Se requieren al menos ${inputs.minHistoryDays} días de historial; hay ${inputs.historyDays}.`,
      );
    }
    const warnings: string[] = [];
    if (inputs.discontinued) {
      warnings.push(
        `El producto no registra ventas desde ${inputs.lastSale}; podría estar discontinuado y el pronóstico no es confiable.`,
      );
    }
    if (inputs.historyDays < FULL_YEAR_DAYS) {
      warnings.push(
        'El historial es menor a un año: no se dispone de la demanda del mismo día del año anterior y la incertidumbre es mayor.',
      );
    }
    return warnings;
  }

  static create(props: ForecastProps): Forecast {
    const predictions = props.days.map((day) => ({
      ...day,
      suggestedUnits: day.isClosed ? 0 : Math.ceil(day.forecast - 1e-9),
      actual: props.actuals.get(day.date) ?? null,
    }));

    const warnings = [...props.warnings];
    const closedDates = predictions
      .filter((point) => point.isClosed)
      .map((point) => point.date);
    if (closedDates.length > 0) {
      warnings.push(
        `El local permanece cerrado por feriado el ${closedDates.join(', ')}: el pronóstico es 0.`,
      );
    }

    return new Forecast(
      props,
      predictions,
      Forecast.summarize(predictions),
      Forecast.planProduction(props.product, predictions),
      warnings,
    );
  }

  get source(): ForecastSource {
    return this.props.source;
  }

  get modelVersion(): string {
    return this.props.modelVersion;
  }

  get cutoffDate(): string {
    return this.props.cutoffDate;
  }

  get horizon(): number {
    return this.props.horizon;
  }

  get historyDays(): number {
    return this.props.historyDays;
  }

  get displayedHistory(): HistoryDay[] {
    return this.props.history.slice(-DISPLAYED_HISTORY_DAYS);
  }

  private static summarize(predictions: ForecastPoint[]): ForecastSummary {
    const evaluated = predictions.filter(
      (point) => point.actual !== null && !point.isClosed,
    );
    const hasActuals = evaluated.length > 0;
    return {
      totalForecast: round2(sum(predictions.map((point) => point.forecast))),
      totalBaseline: round2(sum(predictions.map((point) => point.baseline))),
      totalActual: hasActuals
        ? round2(sum(predictions.map((point) => point.actual ?? 0)))
        : null,
      maeModel: hasActuals
        ? round2(
            mean(evaluated.map((p) => Math.abs(p.forecast - (p.actual ?? 0)))),
          )
        : null,
      maeBaseline: hasActuals
        ? round2(
            mean(evaluated.map((p) => Math.abs(p.baseline - (p.actual ?? 0)))),
          )
        : null,
    };
  }

  private static planProduction(
    product: ForecastedProduct,
    predictions: ForecastPoint[],
  ): ProductionPlan | null {
    if (!product.stocked) {
      return null;
    }
    const units = sum(predictions.map((point) => point.suggestedUnits));
    return {
      batchSize: product.batchSize,
      batchLabel: product.batchLabel,
      units,
      batches: Math.ceil(units / product.batchSize),
    };
  }
}
