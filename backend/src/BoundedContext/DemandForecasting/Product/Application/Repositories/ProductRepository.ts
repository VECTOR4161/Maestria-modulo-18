import { ProductCatalog } from '../../Domain';

export abstract class ProductRepository {
  abstract getCatalog(): Promise<ProductCatalog>;
}
