import { Controller, Get } from '@nestjs/common';
import { PredictiveModelRepository } from '../../../../PredictiveModel/Application';
import {
  GetProductCatalogUseCase,
  ProductCatalogResponse,
  ProductRepository,
} from '../../../Application';

@Controller({ path: 'products', version: '1' })
export class ProductControllerV1 {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly modelRepository: PredictiveModelRepository,
  ) {}

  @Get()
  index(): Promise<ProductCatalogResponse> {
    return new GetProductCatalogUseCase(
      this.productRepository,
      this.modelRepository,
    ).execute();
  }
}
