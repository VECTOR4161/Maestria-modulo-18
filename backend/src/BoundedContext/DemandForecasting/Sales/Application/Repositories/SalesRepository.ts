import { Discount, SalesHistory } from '../../Domain';

export abstract class SalesRepository {
  abstract getHistory(
    productId: string,
    from: string,
    to: string,
  ): Promise<SalesHistory>;

  abstract getDiscounts(productId: string): Promise<Discount[]>;
}
