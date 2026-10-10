import type { Product } from '../types'

export const PRODUCTS: Product[] = [
  {
    id: '8e432348-4d75-410a-9f54-847a57dcc74f',
    name: 'Galletas de mantequilla',
    category: 'Pasteleria',
    type: 'Producto elaborado',
    price: 3.5,
    stocked: true,
    batchSize: 24,
    batchLabel: 'tanda',
    firstSale: '2021-10-01',
    lastSale: '2026-10-03',
    discontinued: false,
    trained: true,
  },
  {
    id: '1724d0e2-e253-4f72-a26d-159f32d19591',
    name: 'Agua con gas 500 ml',
    category: 'Bebidas',
    type: 'Reventa',
    price: 7,
    stocked: true,
    batchSize: 12,
    batchLabel: 'paquete x12',
    firstSale: '2021-10-01',
    lastSale: '2026-03-27',
    discontinued: true,
    trained: true,
  },
]
