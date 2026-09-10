import { posProducts } from '../../config/posMockData';
import type { BarcodeLookupResult, CartItem } from '../../types/pos';

export function normalizeBarcode(value: string) {
  return value.trim();
}

export function findProductByBarcode(barcode: string, cartItems: CartItem[] = []): BarcodeLookupResult {
  const normalizedBarcode = normalizeBarcode(barcode);
  const product = posProducts.find((candidate) => candidate.barcode === normalizedBarcode);

  if (!product) return { status: 'not_found', barcode: normalizedBarcode };
  if (product.stock <= 0 || product.stockStatus === 'Sin stock') return { status: 'out_of_stock', product };

  const currentQuantity = cartItems.find((item) => item.product.id === product.id)?.quantity ?? 0;
  if (currentQuantity >= product.stock) return { status: 'stock_limit_reached', product };

  return { status: 'found', product };
}