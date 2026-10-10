import { DomainException } from '../../../../../shared/Domain';
import { Product } from './Product';

export class ProductCatalog {
  private constructor(
    readonly lastDataDate: string,
    private readonly items: Product[],
  ) {}

  static restore(lastDataDate: string, products: Product[]): ProductCatalog {
    return new ProductCatalog(lastDataDate, products);
  }

  get products(): Product[] {
    return [...this.items];
  }

  applyTrainingStatus(trainedProductIds: Set<string>): void {
    this.items.forEach((product) =>
      product.markTrainingStatus(trainedProductIds.has(product.id.value)),
    );
  }

  findById(productId: string): Product {
    const product = this.items.find((item) => item.id.equals(productId));
    if (!product) {
      DomainException.throwException(
        404,
        'El producto no existe, no es vendible o no tiene ventas registradas.',
      );
    }
    return product;
  }
}
