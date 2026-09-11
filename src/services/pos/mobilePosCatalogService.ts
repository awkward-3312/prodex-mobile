import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';
import type { MobilePosCatalogItem, MobilePosCatalogResponse, MobilePosCategory, MobilePosPagination } from '../../types/mobilePosCatalog';
import type { BarcodeSymbology, PosProduct, ProductStockStatus } from '../../types/pos';
import { parseMinorUnits } from '../../utils/formatCurrency';
import { buildApiCartProductId, normalizeBarcodeSymbology } from './productBarcodeService';

export type MobilePosCatalogErrorStatus =
  | 'session_expired'
  | 'forbidden'
  | 'invalid_location'
  | 'rate_limited'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export class MobilePosCatalogError extends Error {
  status: MobilePosCatalogErrorStatus;
  httpStatus?: number;
  code?: string;

  constructor(status: MobilePosCatalogErrorStatus, message: string, options: { httpStatus?: number; code?: string } = {}) {
    super(message);
    this.name = 'MobilePosCatalogError';
    this.status = status;
    this.httpStatus = options.httpStatus;
    this.code = options.code;
  }
}

type GetMobilePosCatalogInput = {
  baseUrl: string;
  accessToken: string;
  inventoryLocationId: string | number;
  search?: string;
  categoryId?: string | number | null;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
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

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return asString(value);
}

function parseCategory(value: unknown): MobilePosCategory | null {
  if (isRecord(value)) {
    const id = asString(value.id);
    const name = asString(value.name);
    if (id !== null && name) return { id, name };
    if (name) return { id: name, name };
    return null;
  }
  const name = asString(value);
  return name ? { id: name, name } : null;
}

function parseItem(value: unknown): MobilePosCatalogItem | null {
  if (!isRecord(value) || !isRecord(value.pricing) || !isRecord(value.inventory) || !isRecord(value.sellability)) return null;
  const productId = asString(value.product_id);
  const displayName = asString(value.display_name);
  const name = asString(value.name);
  const price = asString(value.pricing.price);
  const inventoryLocationId = asString(value.inventory.inventory_location_id);
  if (!productId || !displayName || !name || !price || inventoryLocationId === null) return null;

  return {
    product_id: productId,
    product_variant_id: asNullableString(value.product_variant_id),
    name,
    variant_name: asNullableString(value.variant_name),
    display_name: displayName,
    code: asNullableString(value.code),
    gtin: asNullableString(value.gtin),
    barcode_symbology: asNullableString(value.barcode_symbology),
    type: asNullableString(value.type),
    unit: asNullableString(value.unit),
    unit_id: asNullableString(value.unit_id),
    category: parseCategory(value.category),
    image_url: asNullableString(value.image_url),
    pricing: {
      price,
      source: asNullableString(value.pricing.source),
    },
    inventory: {
      inventory_location_id: inventoryLocationId,
      quantity: asNumber(value.inventory.quantity) ?? 0,
      reserved_quantity: asNumber(value.inventory.reserved_quantity) ?? 0,
      available_quantity: asNumber(value.inventory.available_quantity) ?? 0,
      manage_stock: asBoolean(value.inventory.manage_stock) ?? false,
      out_of_stock: asBoolean(value.inventory.out_of_stock) ?? false,
      low_stock: asBoolean(value.inventory.low_stock) ?? false,
      overselling_allowed: asBoolean(value.inventory.overselling_allowed) ?? false,
    },
    sellability: {
      can_sell: asBoolean(value.sellability.can_sell) ?? false,
      reason: asNullableString(value.sellability.reason),
    },
  };
}

function parsePagination(value: unknown): MobilePosPagination | null {
  if (!isRecord(value)) return null;
  const page = asNumber(value.page);
  const perPage = asNumber(value.per_page);
  const total = asNumber(value.total);
  const lastPage = asNumber(value.last_page);
  const hasMore = asBoolean(value.has_more);
  if (page === null || perPage === null || total === null || lastPage === null || hasMore === null) return null;
  return { page, per_page: perPage, total, last_page: lastPage, has_more: hasMore };
}

function unwrapCatalogPayload(payload: unknown): unknown {
  if (isRecord(payload) && isRecord(payload.data)) return payload.data;
  return payload;
}

export function parseMobilePosCatalogResponse(payload: unknown): MobilePosCatalogResponse {
  const data = unwrapCatalogPayload(payload);
  if (!isRecord(data) || !Array.isArray(data.items) || !Array.isArray(data.categories)) {
    throw new MobilePosCatalogError('invalid_response', 'Malformed catalog response');
  }
  const pagination = parsePagination(data.pagination);
  const items = data.items.map(parseItem);
  const categories = data.categories.map(parseCategory);
  if (!pagination || items.some((item) => item === null) || categories.some((category) => category === null)) {
    throw new MobilePosCatalogError('invalid_response', 'Malformed catalog response');
  }
  return {
    items: items as MobilePosCatalogItem[],
    categories: categories as MobilePosCategory[],
    pagination,
  };
}

function mapApiError(error: ApiError): MobilePosCatalogError {
  if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') return new MobilePosCatalogError('session_expired', 'Session expired', { httpStatus: error.status, code: error.code });
  if (error.status === 403) return new MobilePosCatalogError('forbidden', 'Forbidden', { httpStatus: error.status, code: error.code });
  if (error.status === 422 || error.code === 'invalid_location') return new MobilePosCatalogError('invalid_location', 'Invalid location', { httpStatus: error.status, code: error.code });
  if (error.status === 429) return new MobilePosCatalogError('rate_limited', 'Rate limited', { httpStatus: error.status, code: error.code });
  if (error.status >= 500) return new MobilePosCatalogError('server_error', 'Server error', { httpStatus: error.status, code: error.code });
  if (error.code === 'timeout') return new MobilePosCatalogError('timeout', 'Timeout', { httpStatus: error.status, code: error.code });
  if (error.code === 'network_error') return new MobilePosCatalogError('network_error', 'Network error', { httpStatus: error.status, code: error.code });
  return new MobilePosCatalogError('invalid_response', 'Unexpected catalog error', { httpStatus: error.status, code: error.code });
}

export async function getMobilePosCatalog({ baseUrl, accessToken, inventoryLocationId, search, categoryId, page = 1, perPage = 30, signal }: GetMobilePosCatalogInput) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/mobile/pos/catalog`);
  const params = new URLSearchParams({
    inventory_location_id: String(inventoryLocationId),
    page: String(page),
    per_page: String(perPage),
  });
  const trimmedSearch = search?.trim() ?? '';
  if (trimmedSearch.length > 0) params.set('search', trimmedSearch);
  if (categoryId !== null && categoryId !== undefined && String(categoryId).length > 0) params.set('category_id', String(categoryId));
  url.search = params.toString();

  try {
    const payload = await apiClient.get<unknown>(url.toString(), { token: accessToken, authenticated: true, signal });
    return parseMobilePosCatalogResponse(payload);
  } catch (error) {
    if (error instanceof MobilePosCatalogError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new MobilePosCatalogError('network_error', 'Network error');
  }
}

function stockStatus(item: MobilePosCatalogItem): ProductStockStatus {
  if (item.inventory.out_of_stock && !item.inventory.overselling_allowed) return 'Sin stock';
  if (item.inventory.low_stock) return 'Bajo stock';
  return 'Disponible';
}

function categoryName(category: MobilePosCatalogItem['category']) {
  if (!category) return 'Sin categoría';
  if (typeof category === 'string') return category;
  return category.name;
}

export function mapMobilePosCatalogItemToPosProduct(item: MobilePosCatalogItem): PosProduct {
  const priceMinorUnits = parseMinorUnits(item.pricing.price);
  const code = item.code ?? item.gtin ?? String(item.product_variant_id ?? item.product_id);
  const symbology = item.barcode_symbology ? normalizeBarcodeSymbology(item.barcode_symbology) : null;

  return {
    id: buildApiCartProductId(item.product_id, item.product_variant_id),
    source: 'api',
    productId: item.product_id,
    productVariantId: item.product_variant_id,
    variantName: item.variant_name,
    displayName: item.display_name,
    name: item.display_name || item.name,
    sku: code,
    barcode: item.gtin ?? item.code ?? code,
    barcodeSymbology: symbology ?? ('CODE128' as BarcodeSymbology),
    category: categoryName(item.category),
    price: priceMinorUnits / 100,
    priceMinorUnits,
    imageUrl: item.image_url,
    stock: Math.max(0, item.inventory.available_quantity),
    manageStock: item.inventory.manage_stock,
    oversellingAllowed: item.inventory.overselling_allowed,
    canSell: item.sellability.can_sell,
    sellabilityReason: item.sellability.reason,
    stockStatus: stockStatus(item),
    favorite: false,
    icon: 'cube-outline',
    tone: item.sellability.can_sell ? (item.inventory.low_stock ? 'amber' : 'blue') : 'red',
  };
}

export function catalogItemKey(item: MobilePosCatalogItem) {
  return `${item.product_id}:${item.product_variant_id ?? 'simple'}`;
}

export function mergeCatalogPages(current: MobilePosCatalogItem[], incoming: MobilePosCatalogItem[]) {
  const seen = new Set(current.map(catalogItemKey));
  const merged = [...current];
  incoming.forEach((item) => {
    const key = catalogItemKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  });
  return merged;
}
