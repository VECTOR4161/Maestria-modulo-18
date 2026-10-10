import { PredictiveModelRepository } from '../../../PredictiveModel/Application';
import { PredictiveModel } from '../../../PredictiveModel/Domain';
import { Product } from '../../../Product/Domain';
import { SalesRepository } from '../../../Sales/Application';
import { SalesHistory } from '../../../Sales/Domain';
import { Forecast, ForecastSource } from '../../Domain';

export interface RunForecastDependencies {
  salesRepository: SalesRepository;
  modelRepository: PredictiveModelRepository;
}

export interface RunForecastContext {
  model: PredictiveModel;
  product: Product;
  cutoff: string;
  horizon: number;
  history: SalesHistory;
  actuals: SalesHistory | null;
  source: ForecastSource;
  warnings: string[];
}

export async function runForecast(
  dependencies: RunForecastDependencies,
  context: RunForecastContext,
): Promise<Forecast> {
  const { product, model, history } = context;
  const warnings = [
    ...context.warnings,
    ...Forecast.assessInputs({
      trained: product.trained,
      discontinued: product.discontinued,
      lastSale: product.lastSale,
      historyDays: history.length,
      minHistoryDays: model.minHistoryDays,
    }),
  ];

  const productId = product.id.value;
  const discounts = await dependencies.salesRepository.getDiscounts(productId);
  const inference = await dependencies.modelRepository.predict({
    productId,
    cutoffDate: context.cutoff,
    horizon: context.horizon,
    history: history.toArray(),
    discounts,
  });

  const actuals = new Map(
    (context.actuals?.toArray() ?? []).map((day) => [day.date, day.qty]),
  );

  return Forecast.create({
    source: context.source,
    product: {
      stocked: product.stocked,
      batchSize: product.batchSize,
      batchLabel: product.batchLabel,
    },
    modelVersion: inference.modelVersion,
    cutoffDate: inference.cutoffDate,
    horizon: inference.horizon,
    historyDays: inference.historyDays,
    history: history.toArray(),
    days: inference.predictions,
    actuals,
    warnings,
  });
}
