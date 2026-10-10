import { ProductCatalog } from '../../Domain';
import { ProductResponse } from './ProductResponse';

export class ProductCatalogResponse {
  private constructor(
    private readonly lastDataDate: string,
    private readonly products: ProductResponse[],
  ) {}

  static createFromAggregate(catalog: ProductCatalog): ProductCatalogResponse {
    return new ProductCatalogResponse(
      catalog.lastDataDate,
      catalog.products.map((product) =>
        ProductResponse.createFromAggregate(product),
      ),
    );
  }
}
