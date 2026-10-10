import { PredictiveModelRepository } from '../../../PredictiveModel/Application';
import {
  loadTrainedCatalog,
  ProductRepository,
  ProductResponse,
} from '../../../Product/Application';
import { SalesRepository } from '../../../Sales/Application';
import { SalesHistory } from '../../../Sales/Domain';
import { ForecastResponse } from '../Dtos/ForecastResponse';
import { UploadForecastRequest } from '../Dtos/UploadForecastRequest';
import { runForecast } from '../Services/RunForecast';

export interface IForecastFromUploadUseCase {
  execute(request: UploadForecastRequest): Promise<ForecastResponse>;
}

export class ForecastFromUploadUseCase implements IForecastFromUploadUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly salesRepository: SalesRepository,
    private readonly modelRepository: PredictiveModelRepository,
  ) {}

  async execute(request: UploadForecastRequest): Promise<ForecastResponse> {
    const model = this.modelRepository.getModel();
    const catalog = await loadTrainedCatalog(
      this.productRepository,
      this.modelRepository,
    );
    const product = catalog.findById(request.productId);
    const uploaded = SalesHistory.fromContiguousPoints(request.points);

    const warnings: string[] = [];
    if (uploaded.filledDays > 0) {
      warnings.push(
        `Se completaron con 0 ${uploaded.filledDays} días ausentes en el CSV.`,
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
        cutoff: uploaded.lastDate,
        horizon: request.horizon,
        history: uploaded.lastDays(model.inferenceHistoryDays),
        actuals: null,
        source: 'upload',
        warnings,
      },
    );
    return ForecastResponse.createFromAggregate(
      forecast,
      ProductResponse.createFromAggregate(product),
    );
  }
}
