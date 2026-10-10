import { Injectable } from '@nestjs/common';
import {
  COMPLETED_SALES_FROM,
  DatabaseClient,
} from '../../../../../shared/Infrastructure';
import { SalesDatasource } from '../../Application';
import { DailySale, Discount } from '../../Domain';

const DAILY_SALES_SQL = `
  SELECT to_char(DATE(v.fecha_venta), 'YYYY-MM-DD') AS date,
         SUM(dv.cantidad)::float8 AS qty
  ${COMPLETED_SALES_FROM}
    AND dv.id_producto = $1::uuid
    AND v.fecha_venta >= $2::date
    AND v.fecha_venta < $3::date + 1
  GROUP BY DATE(v.fecha_venta)
  ORDER BY DATE(v.fecha_venta)
`;

const DISCOUNTS_SQL = `
  SELECT to_char(d.fecha_inicio, 'YYYY-MM-DD') AS start,
         to_char(d.fecha_final, 'YYYY-MM-DD') AS "end",
         td.nombre AS kind,
         d.descuento::float8 AS value
  FROM descuentos d
  JOIN tipo_descuento td ON td.id = d.id_tipo_descuento
  WHERE d.id_producto = $1::uuid AND d.borrado = false AND d.estado = true
  ORDER BY d.fecha_inicio
`;

@Injectable()
export class SalesDatasourceImpl extends SalesDatasource {
  constructor(private readonly db: DatabaseClient) {
    super();
  }

  findDailySales(
    productId: string,
    from: string,
    to: string,
  ): Promise<DailySale[]> {
    return this.db.query<DailySale>(DAILY_SALES_SQL, [productId, from, to]);
  }

  findDiscounts(productId: string): Promise<Discount[]> {
    return this.db.query<Discount>(DISCOUNTS_SQL, [productId]);
  }
}
