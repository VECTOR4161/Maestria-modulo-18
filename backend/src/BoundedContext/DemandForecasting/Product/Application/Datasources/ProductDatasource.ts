import { ProductCatalog } from '../../Domain';

export abstract class ProductDatasource {
  abstract loadCatalog(): Promise<ProductCatalog>;
}
