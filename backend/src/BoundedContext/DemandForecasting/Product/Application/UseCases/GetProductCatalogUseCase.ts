import { PredictiveModelRepository } from '../../../PredictiveModel/Application';
import { ProductCatalogResponse } from '../Dtos/ProductCatalogResponse';
import { ProductRepository } from '../Repositories/ProductRepository';
import { loadTrainedCatalog } from '../Services/LoadTrainedCatalog';

export interface IGetProductCatalogUseCase {
  execute(): Promise<ProductCatalogResponse>;
}

export class GetProductCatalogUseCase implements IGetProductCatalogUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly modelRepository: PredictiveModelRepository,
  ) {}

  async execute(): Promise<ProductCatalogResponse> {
    const catalog = await loadTrainedCatalog(
      this.productRepository,
      this.modelRepository,
    );
    return ProductCatalogResponse.createFromAggregate(catalog);
  }
}
