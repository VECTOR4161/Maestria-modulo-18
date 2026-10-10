import { addDays, DomainException } from '../../../../../shared/Domain';
import { PredictiveModelRepository } from '../../../PredictiveModel/Application';
import {
  loadTrainedCatalog,
  ProductRepository,
  ProductResponse,
} from '../../../Product/Application';
import { SalesRepository } from '../../../Sales/Application';
import { SalesHistory } from '../../../Sales/Domain';
import { ForecastRequest } from '../Dtos/ForecastRequest';
import { ForecastResponse } from '../Dtos/ForecastResponse';
import { runForecast } from '../Services/RunForecast';

export interface IForecastFromDatabaseUseCase {
  execute(request: ForecastRequest): Promise<ForecastResponse>;
}

export class ForecastFromDatabaseUseCase implements IForecastFromDatabaseUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly salesRepository: SalesRepository,
    private readonly modelRepository: PredictiveModelRepository,
  ) {}

  async execute(request: ForecastRequest): Promise<ForecastResponse> {
    const model = this.modelRepository.getModel();
    const catalog = await loadTrainedCatalog(
      this.productRepository,
      this.modelRepository,
    );
    const product = catalog.findById(request.productId);
    const lastDataDate = catalog.lastDataDate;
    const cutoff = request.cutoffDate ?? lastDataDate;

    if (cutoff > lastDataDate) {
      DomainException.throwException(
        400,
        `La fecha de corte (${cutoff}) supera los datos disponibles (${lastDataDate}).`,
      );
    }
    if (cutoff < product.firstSale) {
      DomainException.throwException(
        422,
        `La fecha de corte es anterior a la primera venta del producto (${product.firstSale}).`,
      );
    }

    const windowStart = addDays(cutoff, -(model.inferenceHistoryDays - 1));
    const historyStart =
      windowStart > product.firstSale ? windowStart : product.firstSale;
    const history = await this.salesRepository.getHistory(
      product.id.value,
      historyStart,
      cutoff,
    );

    let actuals: SalesHistory | null = null;
    if (cutoff < lastDataDate) {
      const horizonEnd = addDays(cutoff, request.horizon);
      actuals = await this.salesRepository.getHistory(
        product.id.value,
        addDays(cutoff, 1),
        horizonEnd < lastDataDate ? horizonEnd : lastDataDate,
      );
    }

    const forecast = await runForecast(
      {
        salesRepository: this.salesRepository,
        modelRepository: this.modelRepository,
      },
      {
        model,
        product,
        cutoff,
        horizon: request.horizon,
        history,
        actuals,
        source: 'database',
        warnings: [],
      },
    );
    return ForecastResponse.createFromAggregate(
      forecast,
      ProductResponse.createFromAggregate(product),
    );
  }
}
