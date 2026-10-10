import { Product } from '../../Domain';

export class ProductResponse {
  private constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly category: string,
    private readonly type: string,
    private readonly price: number,
    private readonly stocked: boolean,
    private readonly batchSize: number,
    private readonly batchLabel: string,
    private readonly firstSale: string,
    private readonly lastSale: string,
    private readonly discontinued: boolean,
    private readonly trained: boolean,
  ) {}

  static createFromAggregate(product: Product): ProductResponse {
    return new ProductResponse(
      product.id.value,
      product.name,
      product.category,
      product.type,
      product.price,
      product.stocked,
      product.batchSize,
      product.batchLabel,
      product.firstSale,
      product.lastSale,
      product.discontinued,
      product.trained,
    );
  }
}
