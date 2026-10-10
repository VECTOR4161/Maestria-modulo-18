import { DailySale, Discount } from '../../Domain';

export abstract class SalesDatasource {
  abstract findDailySales(
    productId: string,
    from: string,
    to: string,
  ): Promise<DailySale[]>;

  abstract findDiscounts(productId: string): Promise<Discount[]>;
}
