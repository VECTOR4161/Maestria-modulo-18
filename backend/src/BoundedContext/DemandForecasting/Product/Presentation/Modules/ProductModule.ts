import { Module } from '@nestjs/common';
import { PredictiveModelModule } from '../../../PredictiveModel/Presentation';
import { ProductDatasource, ProductRepository } from '../../Application';
import {
  ProductDatasourceImpl,
  ProductRepositoryImpl,
} from '../../Infrastructure';
import { ProductControllerV1 } from '../Controllers/V1/ProductControllerV1';

@Module({
  imports: [PredictiveModelModule],
  controllers: [ProductControllerV1],
  providers: [
    { provide: ProductDatasource, useClass: ProductDatasourceImpl },
    { provide: ProductRepository, useClass: ProductRepositoryImpl },
  ],
  exports: [ProductRepository],
})
export class ProductModule {}
