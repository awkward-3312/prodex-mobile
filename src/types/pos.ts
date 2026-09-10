import type { Ionicons } from '@expo/vector-icons';

export type ProductCategory = 'Bebidas' | 'Snacks' | 'Abarrotes';
export type ProductStockStatus = 'Disponible' | 'Bajo stock' | 'Sin stock';

export type PosProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: ProductCategory;
  price: number;
  stock: number;
  stockStatus: ProductStockStatus;
  favorite: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'blue' | 'teal' | 'amber' | 'red';
};

export type CartItem = {
  product: PosProduct;
  quantity: number;
  unitPriceCents: number;
};

export type PosTaxConfig = {
  label: string;
  rate: number;
};

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed';

export type BarcodeLookupResult =
  | { status: 'found'; product: PosProduct }
  | { status: 'not_found'; barcode: string }
  | { status: 'out_of_stock'; product: PosProduct }
  | { status: 'stock_limit_reached'; product: PosProduct };
