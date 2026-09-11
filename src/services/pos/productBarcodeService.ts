import { posProducts } from '../../config/posMockData';
import type { BarcodeLookupResult, BarcodeSymbology, CartItem } from '../../types/pos';

const symbologyMap: Record<string, BarcodeSymbology> = {
  code128: 'CODE128',
  code39: 'CODE39',
  ean8: 'EAN8',
  ean13: 'EAN13',
  upc_a: 'UPC',
  upc_e: 'UPC',
};

export function normalizeBarcode(value: string) {
  return value.trim();
}

export function normalizeBarcodeSymbology(value: string): BarcodeSymbology | null {
  return symbologyMap[value.trim().toLowerCase()] ?? null;
}

type ResolveProductInput = { code: string; symbology: string };

export function resolveProductByCode({ code, symbology }: ResolveProductInput, cartItems: CartItem[] = []): BarcodeLookupResult {
  const normalizedBarcode = normalizeBarcode(code);
  const normalizedSymbology = normalizeBarcodeSymbology(symbology);
  if (!normalizedSymbology) return { status: 'not_found', barcode: normalizedBarcode };
  const product = posProducts.find((candidate) => candidate.barcode === normalizedBarcode);

  if (!product) return { status: 'not_found', barcode: normalizedBarcode };
  if (product.stock <= 0 || product.stockStatus === 'Sin stock') return { status: 'out_of_stock', product };

  const currentQuantity = cartItems.find((item) => item.product.id === product.id)?.quantity ?? 0;
  if (currentQuantity >= product.stock) return { status: 'stock_limit_reached', product };

  return { status: 'found', product };
}

export function findProductByBarcode(barcode: string, cartItems: CartItem[] = []): BarcodeLookupResult {
  return resolveProductByCode({ code: barcode, symbology: 'code128' }, cartItems);
}