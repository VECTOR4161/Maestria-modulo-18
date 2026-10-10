import { Injectable } from '@nestjs/common';
import {
  COMPLETED_SALES_FROM,
  DatabaseClient,
} from '../../../../../shared/Infrastructure';
import { ProductDatasource } from '../../Application';
import { ProductCatalog } from '../../Domain';
import { ProductMapper, ProductRow } from '../Persistence/ProductMapper';

const PRODUCTS_SQL = `
  WITH sales AS (
    SELECT dv.id_producto,
           MIN(DATE(v.fecha_venta)) AS first_sale,
           MAX(DATE(v.fecha_venta)) AS last_sale
    ${COMPLETED_SALES_FROM}
    GROUP BY dv.id_producto
  )
  SELECT p.id::text AS id,
         p.nombre AS name,
         c.nombre AS category,
         t.nombre AS type,
         p.precio::float8 AS price,
         p.es_stock_directo AS stocked,
         COALESCE(recipe.size, pack.size, 1)::float8 AS "batchSize",
         COALESCE(recipe.label, pack.label, 'unidad') AS "batchLabel",
         to_char(s.first_sale, 'YYYY-MM-DD') AS "firstSale",
         to_char(s.last_sale, 'YYYY-MM-DD') AS "lastSale"
  FROM producto p
  JOIN categoria c ON c.id = p.id_categoria
  JOIN tipo t ON t.id = p.id_tipo
  JOIN sales s ON s.id_producto = p.id
  LEFT JOIN LATERAL (
    SELECT r.cantidad AS size, substring(r.titulo FROM '\\((\\S+) de') AS label
    FROM receta r
    WHERE r.id_producto_obtenido = p.id AND r.borrado = false AND r.cantidad > 1
    LIMIT 1
  ) recipe ON true
  LEFT JOIN LATERAL (
    SELECT cv.factor_conversion AS size, lower(u.unidad) AS label
    FROM producto ch
    JOIN conversiones cv ON cv.id_unidad_origen = ch.unidad_actual AND cv.id_unidad_destino = p.unidad_actual
    JOIN unidad u ON u.id = ch.unidad_actual
    WHERE ch.id_producto_padre = p.id AND ch.borrado = false
    LIMIT 1
  ) pack ON true
  WHERE p.vendible = true AND p.borrado = false
  ORDER BY c.nombre, p.nombre
`;

const LAST_DATA_DATE_SQL = `
  SELECT to_char(MAX(DATE(v.fecha_venta)), 'YYYY-MM-DD') AS "lastDate"
  ${COMPLETED_SALES_FROM}
`;

@Injectable()
export class ProductDatasourceImpl extends ProductDatasource {
  constructor(private readonly db: DatabaseClient) {
    super();
  }

  async loadCatalog(): Promise<ProductCatalog> {
    const [rows, [last]] = await Promise.all([
      this.db.query<ProductRow>(PRODUCTS_SQL),
      this.db.query<{ lastDate: string }>(LAST_DATA_DATE_SQL),
    ]);
    return ProductCatalog.restore(
      last.lastDate,
      rows.map((row) => ProductMapper.toDomain(row, last.lastDate)),
    );
  }
}
