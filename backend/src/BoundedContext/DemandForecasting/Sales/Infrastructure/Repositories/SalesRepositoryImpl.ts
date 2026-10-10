import { Injectable } from '@nestjs/common';
import { SalesDatasource, SalesRepository } from '../../Application';
import { Discount, SalesHistory } from '../../Domain';

@Injectable()
export class SalesRepositoryImpl extends SalesRepository {
  constructor(private readonly datasource: SalesDatasource) {
    super();
  }

  async getHistory(
    productId: string,
    from: string,
    to: string,
  ): Promise<SalesHistory> {
    const sales = await this.datasource.findDailySales(productId, from, to);
    return SalesHistory.fromSales(sales, from, to);
  }

  getDiscounts(productId: string): Promise<Discount[]> {
    return this.datasource.findDiscounts(productId);
  }
}
