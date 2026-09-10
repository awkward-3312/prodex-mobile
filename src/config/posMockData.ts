import type { PosProduct, PosTaxConfig } from '../types/pos';

export const posTaxConfig: PosTaxConfig = {
  label: 'Impuesto mock',
  rate: 0.15,
};

export const posCategories = ['Todos', 'Favoritos', 'Bebidas', 'Snacks', 'Abarrotes'] as const;

export const posProducts: PosProduct[] = [
  { id: 'prod-1', name: 'Café molido 500 g', sku: 'CAF-500-001', barcode: '7501000000012', category: 'Abarrotes', price: 148.5, stock: 24, stockStatus: 'Disponible', favorite: true, icon: 'cafe-outline', tone: 'amber' },
  { id: 'prod-2', name: 'Agua mineral 600 ml', sku: 'AGU-600-001', barcode: '7501000000029', category: 'Bebidas', price: 24, stock: 42, stockStatus: 'Disponible', favorite: false, icon: 'water-outline', tone: 'blue' },
  { id: 'prod-3', name: 'Refresco cola 2 L', sku: 'REF-2L-001', barcode: 'PX-00000003', category: 'Bebidas', price: 52.5, stock: 7, stockStatus: 'Bajo stock', favorite: true, icon: 'nutrition-outline', tone: 'red' },
  { id: 'prod-4', name: 'Galletas de avena', sku: 'GAL-AVE-001', barcode: 'PX-00000004', category: 'Snacks', price: 38, stock: 18, stockStatus: 'Disponible', favorite: false, icon: 'square-outline', tone: 'teal' },
  { id: 'prod-5', name: 'Papas clásicas 150 g', sku: 'PAP-150-001', barcode: 'PX-00000005', category: 'Snacks', price: 31.5, stock: 4, stockStatus: 'Bajo stock', favorite: false, icon: 'layers-outline', tone: 'amber' },
  { id: 'prod-6', name: 'Arroz premium 1 kg', sku: 'ARR-1K-001', barcode: 'PX-00000006', category: 'Abarrotes', price: 49.75, stock: 16, stockStatus: 'Disponible', favorite: false, icon: 'archive-outline', tone: 'blue' },
  { id: 'prod-7', name: 'Jugo de naranja 1 L', sku: 'JUG-1L-001', barcode: 'PX-00000007', category: 'Bebidas', price: 44.25, stock: 0, stockStatus: 'Sin stock', favorite: false, icon: 'wine-outline', tone: 'red' },
  { id: 'prod-8', name: 'Chocolate amargo 80 g', sku: 'CHO-080-001', barcode: 'PX-00000008', category: 'Snacks', price: 67, stock: 9, stockStatus: 'Bajo stock', favorite: true, icon: 'gift-outline', tone: 'teal' },
];
