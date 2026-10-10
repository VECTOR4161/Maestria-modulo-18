import { Injectable } from '@nestjs/common';
import { ProductDatasource, ProductRepository } from '../../Application';
import { ProductCatalog } from '../../Domain';

@Injectable()
export class ProductRepositoryImpl extends ProductRepository {
  constructor(private readonly datasource: ProductDatasource) {
    super();
  }

  getCatalog(): Promise<ProductCatalog> {
    return this.datasource.loadCatalog();
  }
}
