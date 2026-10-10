export const COMPLETED_SALES_FROM = `
  FROM venta v
  JOIN detalle_venta dv ON dv.id_venta = v.id AND dv.borrado = false
  JOIN estado_venta ev ON ev.id = v.id_estado_venta AND ev.nombre = 'Completada'
  WHERE v.borrado = false
`;
