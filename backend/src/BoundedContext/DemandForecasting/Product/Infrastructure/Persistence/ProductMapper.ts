import { Product, ProductId } from '../../Domain';

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  type: string;
  price: number;
  stocked: boolean;
  batchSize: number;
  batchLabel: string;
  firstSale: string;
  lastSale: string;
}

export class ProductMapper {
  static toDomain(row: ProductRow, lastDataDate: string): Product {
    return Product.restore(
      {
        id: ProductId.create(row.id),
        name: row.name,
        category: row.category,
        type: row.type,
        price: row.price,
        stocked: row.stocked,
        batchSize: row.batchSize,
        batchLabel: row.batchLabel,
        firstSale: row.firstSale,
        lastSale: row.lastSale,
      },
      lastDataDate,
    );
  }
}
