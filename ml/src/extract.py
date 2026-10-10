from config import DAILY_SALES_PATH, DATA_DIR, DISCOUNTS_PATH, PRODUCTS_PATH
from db import read_sql

DAILY_SALES_SQL = """
SELECT dv.id_producto::text AS product_id,
       DATE(v.fecha_venta) AS date,
       SUM(dv.cantidad)::float AS qty
FROM venta v
JOIN detalle_venta dv ON dv.id_venta = v.id
JOIN estado_venta ev ON ev.id = v.id_estado_venta
JOIN producto p ON p.id = dv.id_producto
WHERE ev.nombre = 'Completada'
  AND v.borrado = false
  AND dv.borrado = false
  AND p.vendible = true
GROUP BY 1, 2
ORDER BY 1, 2
"""

PRODUCTS_SQL = """
SELECT p.id::text AS product_id,
       p.nombre AS name,
       c.nombre AS category,
       t.nombre AS type,
       p.precio::float AS price,
       p.es_stock_directo AS stocked,
       COALESCE(
         (SELECT MAX(r.cantidad) FROM receta r
          WHERE r.id_producto_obtenido = p.id AND r.borrado = false AND r.cantidad > 1),
         (SELECT MAX(cv.factor_conversion) FROM producto ch
          JOIN conversiones cv ON cv.id_unidad_origen = ch.unidad_actual AND cv.id_unidad_destino = p.unidad_actual
          WHERE ch.id_producto_padre = p.id AND ch.borrado = false),
         1
       )::float AS batch_size
FROM producto p
JOIN categoria c ON c.id = p.id_categoria
JOIN tipo t ON t.id = p.id_tipo
WHERE p.vendible = true AND p.borrado = false
ORDER BY p.nombre
"""

DISCOUNTS_SQL = """
SELECT d.id_producto::text AS product_id,
       d.fecha_inicio::date AS start,
       d.fecha_final::date AS "end",
       td.nombre AS kind,
       d.descuento::float AS value
FROM descuentos d
JOIN tipo_descuento td ON td.id = d.id_tipo_descuento
WHERE d.borrado = false AND d.estado = true
ORDER BY d.fecha_inicio
"""


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    sales = read_sql(DAILY_SALES_SQL)
    products = read_sql(PRODUCTS_SQL)
    discounts = read_sql(DISCOUNTS_SQL)
    sales.to_csv(DAILY_SALES_PATH, index=False)
    products.to_csv(PRODUCTS_PATH, index=False)
    discounts.to_csv(DISCOUNTS_PATH, index=False)
    print(f"daily_sales: {len(sales)} rows, {sales.product_id.nunique()} products, {sales.date.min()} -> {sales.date.max()}")
    print(f"products: {len(products)} rows")
    print(f"discounts: {len(discounts)} rows")


if __name__ == "__main__":
    main()
