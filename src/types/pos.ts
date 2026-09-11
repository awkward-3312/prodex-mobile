import type { Ionicons } from '@expo/vector-icons';

export type ProductCategory = string;
export type ProductStockStatus = 'Disponible' | 'Bajo stock' | 'Sin stock';
export type BarcodeSymbology = 'CODE128' | 'CODE39' | 'EAN8' | 'EAN13' | 'UPC';
export type PosProductSource = 'mock' | 'api';

export type PosProduct = {
  id: string;
  source?: PosProductSource;
  productId?: string | number;
  productVariantId?: string | number | null;
  variantName?: string | null;
  displayName?: string | null;
  name: string;
  sku: string;
  barcode: string;
  barcodeSymbology: BarcodeSymbology;
  category: ProductCategory;
  price: number;
  priceMinorUnits?: number;
  imageUrl?: string | null;
  stock: number;
  manageStock?: boolean;
  oversellingAllowed?: boolean;
  canSell?: boolean;
  sellabilityReason?: string | null;
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
  | { status: 'found'; product: PosProduct; quantity?: number }
  | { status: 'not_found'; barcode: string }
  | { status: 'ambiguous_code' }
  | { status: 'invalid_location' }
  | { status: 'session_expired' }
  | { status: 'network_error' }
  | { status: 'timeout' }
  | { status: 'invalid_product_response' }
  | { status: 'not_sellable'; product?: PosProduct; reason?: string | null }
  | { status: 'out_of_stock'; product: PosProduct }
  | { status: 'stock_limit_reached'; product: PosProduct };
