import { posProducts } from '../../config/posMockData';
import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';
import type { MobileProductResolveData, MobileProductResolveResponse } from '../../types/mobileProductResolver';
import type { BarcodeLookupResult, BarcodeSymbology, CartItem, PosProduct, ProductStockStatus } from '../../types/pos';
import { parseMinorUnits } from '../../utils/formatCurrency';
import { normalizeCartQuantity } from '../../utils/posCart';

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
type ResolveScannedProductInput = ResolveProductInput & {
  tenantBaseUrl: string;
  accessToken: string;
  inventoryLocationId: string | number;
  cartItems?: CartItem[];
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function unwrapData(payload: MobileProductResolveResponse | MobileProductResolveData): MobileProductResolveData | undefined {
  if (isRecord(payload) && isRecord((payload as MobileProductResolveResponse).data)) {
    return (payload as MobileProductResolveResponse).data;
  }
  return payload as MobileProductResolveData;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function devLog(message: string, value?: unknown) {
  if (__DEV__) console.log(`[PRODEX POS] ${message}`, value ?? '');
}

export function buildApiCartProductId(productId: string | number, productVariantId?: string | number | null) {
  return productVariantId === null || productVariantId === undefined || productVariantId === ''
    ? `api:product:${productId}`
    : `api:product:${productId}:variant:${productVariantId}`;
}

function stockStatus(inventory: NonNullable<MobileProductResolveData['inventory']>): ProductStockStatus {
  if (inventory.out_of_stock) return 'Sin stock';
  if (inventory.low_stock) return 'Bajo stock';
  return 'Disponible';
}

function displayName(product: NonNullable<MobileProductResolveData['product']>) {
  return asString(product.product_name) ?? asString(product.name) ?? 'Producto';
}

function mapResolvedProduct(data: MobileProductResolveData): { product: PosProduct; quantity: number; inventory: NonNullable<MobileProductResolveData['inventory']>; sellability: NonNullable<MobileProductResolveData['sellability']> } | null {
  const product = data.product;
  const pricing = data.pricing;
  const inventory = data.inventory;
  const sellability = data.sellability;
  const scanQuantity = normalizeCartQuantity(asNumber(data.scan_quantity) ?? 1);

  if (!product || !pricing || !inventory || !sellability || scanQuantity <= 0) return null;

  const productId = asString(product.product_id) ?? asString(product.id);
  const productVariantId = asString(product.product_variant_id) ?? asString(product.variant_id);
  const priceText = asString(pricing.price);
  if (!productId || !priceText) return null;

  const unitPriceCents = parseMinorUnits(priceText);
  if (unitPriceCents <= 0) return null;

  const variantName = asString(product.variant_name);
  const code = asString(product.code) ?? asString(product.gtin) ?? asString(data.match?.scanned_value) ?? productId;

  return {
    product: {
      id: buildApiCartProductId(productId, productVariantId),
      source: 'api',
      productId,
      productVariantId,
      variantName,
      name: displayName(product),
      sku: code,
      barcode: code,
      barcodeSymbology: normalizeBarcodeSymbology(asString(data.match?.scanner_type) ?? '') ?? 'CODE128',
      category: 'Abarrotes',
      price: unitPriceCents / 100,
      stock: Math.max(0, asNumber(inventory.available_quantity) ?? 0),
      manageStock: inventory.manage_stock ?? false,
      oversellingAllowed: inventory.overselling_allowed ?? false,
      sellabilityReason: sellability.reason ?? null,
      stockStatus: stockStatus(inventory),
      favorite: false,
      icon: 'cube-outline',
      tone: 'blue',
    },
    quantity: scanQuantity,
    inventory,
    sellability,
  };
}

function currentCartQuantity(productId: string, cartItems: CartItem[]) {
  return cartItems.find((item) => item.product.id === productId)?.quantity ?? 0;
}

function resultFromApiError(error: ApiError): BarcodeLookupResult {
  if (error.status === 401 || error.code === 'token_idle_timeout' || error.code === 'unauthenticated') return { status: 'session_expired' };
  if (error.status === 404 || error.code === 'product_not_found') return { status: 'not_found', barcode: '' };
  if (error.status === 409 || error.code === 'ambiguous_code') return { status: 'ambiguous_code' };
  if (error.code === 'invalid_location' || error.code === 'forbidden_location') return { status: 'invalid_location' };
  if (error.code === 'timeout') return { status: 'timeout' };
  if (error.code === 'network_error') return { status: 'network_error' };
  return { status: 'invalid_product_response' };
}

export async function resolveScannedProduct({ code, symbology, tenantBaseUrl, accessToken, inventoryLocationId, cartItems = [] }: ResolveScannedProductInput): Promise<BarcodeLookupResult> {
  const normalizedBarcode = normalizeBarcode(code);
  const url = new URL(`${tenantBaseUrl.replace(/\/$/, '')}/api/mobile/products/resolve`);
  url.search = new URLSearchParams({
    value: normalizedBarcode,
    inventory_location_id: String(inventoryLocationId),
    scanner_type: symbology.trim().toLowerCase(),
  }).toString();

  devLog('scan:start');

  try {
    const payload = await apiClient.get<MobileProductResolveResponse | MobileProductResolveData>(url.toString(), { token: accessToken, authenticated: true });
    devLog('resolve:status', 200);
    const data = unwrapData(payload);
    if (!data) return { status: 'invalid_product_response' };
    const mapped = data ? mapResolvedProduct(data) : null;
    if (!mapped) return { status: 'invalid_product_response' };

    devLog('resolve:match', data.match?.type ?? 'unknown');

    if (mapped.sellability.can_sell === false) {
      if (mapped.inventory.out_of_stock) return { status: 'out_of_stock', product: mapped.product };
      return { status: 'not_sellable', product: mapped.product, reason: mapped.sellability.reason };
    }

    if (mapped.inventory.manage_stock && !mapped.inventory.overselling_allowed) {
      const available = asNumber(mapped.inventory.available_quantity) ?? 0;
      if (currentCartQuantity(mapped.product.id, cartItems) + mapped.quantity > available) {
        return { status: 'stock_limit_reached', product: mapped.product };
      }
    }

    return { status: 'found', product: mapped.product, quantity: mapped.quantity };
  } catch (error) {
    if (error instanceof ApiError) {
      devLog('resolve:status', error.status);
      devLog('resolve:error', error.code ?? 'unknown');
      const result = resultFromApiError(error);
      if (result.status === 'not_found') return { status: 'not_found', barcode: normalizedBarcode };
      return result;
    }
    return { status: 'network_error' };
  }
}
