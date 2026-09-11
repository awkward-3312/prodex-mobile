import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';
import type {
  MobileInventoryCategory,
  MobileInventoryItem,
  MobileInventoryPagination,
  MobileInventoryResponse,
  MobileInventoryStockStatus,
  MobileInventorySummary,
} from '../../types/mobileInventory';

export type MobileInventoryErrorStatus =
  | 'session_expired'
  | 'forbidden_location'
  | 'invalid_location'
  | 'inventory_not_ready'
  | 'validation_error'
  | 'rate_limited'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export class MobileInventoryError extends Error {
  status: MobileInventoryErrorStatus;
  httpStatus?: number;
  code?: string;

  constructor(status: MobileInventoryErrorStatus, message: string, options: { httpStatus?: number; code?: string } = {}) {
    super(message);
    this.name = 'MobileInventoryError';
    this.status = status;
    this.httpStatus = options.httpStatus;
    this.code = options.code;
  }
}

type GetMobileInventoryInput = {
  baseUrl: string;
  accessToken: string;
  inventoryLocationId: string | number;
  search?: string | null;
  categoryId?: string | number | null;
  stockStatus?: MobileInventoryStockStatus | null;
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

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return asString(value);
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

/** Quantities travel as decimal strings ("12.000") — kept as strings, never coerced to number, so display formatting never re-introduces float rounding. */
function asDecimalString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function parseCategory(value: unknown): MobileInventoryCategory | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (id === null || !name) return null;
  return { id, name };
}

function parseItem(value: unknown): MobileInventoryItem | null {
  if (!isRecord(value) || !isRecord(value.inventory)) return null;
  const productId = asString(value.product_id);
  const displayName = asString(value.display_name);
  const name = asString(value.name);
  const inventory = value.inventory;

  const inventoryLocationId = asString(inventory.inventory_location_id);
  const quantity = asDecimalString(inventory.quantity);
  const reservedQuantity = asDecimalString(inventory.reserved_quantity);
  const availableQuantity = asDecimalString(inventory.available_quantity);
  const manageStock = asBoolean(inventory.manage_stock);
  const outOfStock = asBoolean(inventory.out_of_stock);
  const lowStock = asBoolean(inventory.low_stock);

  if (
    !productId || !displayName || !name
    || inventoryLocationId === null || quantity === null || reservedQuantity === null || availableQuantity === null
    || manageStock === null || outOfStock === null || lowStock === null
  ) {
    return null;
  }

  return {
    product_id: productId,
    product_variant_id: asNullableString(value.product_variant_id),
    name,
    variant_name: asNullableString(value.variant_name),
    display_name: displayName,
    code: asNullableString(value.code),
    gtin: asNullableString(value.gtin),
    category: parseCategory(value.category),
    image_url: asNullableString(value.image_url),
    inventory: {
      inventory_location_id: inventoryLocationId,
      quantity,
      reserved_quantity: reservedQuantity,
      available_quantity: availableQuantity,
      manage_stock: manageStock,
      out_of_stock: outOfStock,
      low_stock: lowStock,
    },
  };
}

function parseSummary(value: unknown): MobileInventorySummary | null {
  if (!isRecord(value)) return null;
  const totalItems = asNumber(value.total_items);
  const lowStockCount = asNumber(value.low_stock_count);
  const outOfStockCount = asNumber(value.out_of_stock_count);
  if (totalItems === null || lowStockCount === null || outOfStockCount === null) return null;
  return { total_items: totalItems, low_stock_count: lowStockCount, out_of_stock_count: outOfStockCount };
}

function parsePagination(value: unknown): MobileInventoryPagination | null {
  if (!isRecord(value)) return null;
  const page = asNumber(value.page);
  const perPage = asNumber(value.per_page);
  const total = asNumber(value.total);
  const lastPage = asNumber(value.last_page);
  const hasMore = typeof value.has_more === 'boolean' ? value.has_more : null;
  if (page === null || perPage === null || total === null || lastPage === null || hasMore === null) return null;
  return { page, per_page: perPage, total, last_page: lastPage, has_more: hasMore };
}

function unwrapInventoryPayload(payload: unknown): unknown {
  if (isRecord(payload) && isRecord(payload.data)) return payload.data;
  return payload;
}

export function parseMobileInventoryResponse(payload: unknown): MobileInventoryResponse {
  const data = unwrapInventoryPayload(payload);
  if (!isRecord(data) || !Array.isArray(data.items) || !Array.isArray(data.categories)) {
    throw new MobileInventoryError('invalid_response', 'Malformed inventory response');
  }

  const summary = parseSummary(data.summary);
  const pagination = parsePagination(data.pagination);
  const items = data.items.map(parseItem);
  const categories = data.categories.map(parseCategory);

  if (!summary || !pagination || items.some((item) => item === null) || categories.some((category) => category === null)) {
    throw new MobileInventoryError('invalid_response', 'Malformed inventory response');
  }

  return {
    items: items as MobileInventoryItem[],
    categories: categories as MobileInventoryCategory[],
    summary,
    pagination,
  };
}

function mapApiError(error: ApiError): MobileInventoryError {
  if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') {
    return new MobileInventoryError('session_expired', 'Session expired', { httpStatus: error.status, code: error.code });
  }
  if (error.status === 403) {
    return new MobileInventoryError('forbidden_location', 'Forbidden', { httpStatus: error.status, code: error.code });
  }
  if (error.status === 409) {
    return new MobileInventoryError('inventory_not_ready', 'Inventory not ready', { httpStatus: error.status, code: error.code });
  }
  if (error.status === 422) {
    if (error.code === 'invalid_location') {
      return new MobileInventoryError('invalid_location', 'Invalid location', { httpStatus: error.status, code: error.code });
    }
    return new MobileInventoryError('validation_error', 'Validation error', { httpStatus: error.status, code: error.code });
  }
  if (error.status === 429) {
    return new MobileInventoryError('rate_limited', 'Rate limited', { httpStatus: error.status, code: error.code });
  }
  if (error.status >= 500) {
    return new MobileInventoryError('server_error', 'Server error', { httpStatus: error.status, code: error.code });
  }
  if (error.code === 'timeout') {
    return new MobileInventoryError('timeout', 'Timeout', { httpStatus: error.status, code: error.code });
  }
  if (error.code === 'network_error') {
    return new MobileInventoryError('network_error', 'Network error', { httpStatus: error.status, code: error.code });
  }
  return new MobileInventoryError('invalid_response', 'Unexpected inventory error', { httpStatus: error.status, code: error.code });
}

/** Pure query-param builder, kept separate from the fetch call so it is unit-testable without mocking fetch. */
export function buildMobileInventoryQueryParams({
  inventoryLocationId,
  search,
  categoryId,
  stockStatus,
  page = 1,
  perPage = 30,
}: Omit<GetMobileInventoryInput, 'baseUrl' | 'accessToken' | 'signal'>): URLSearchParams {
  const params = new URLSearchParams({
    inventory_location_id: String(inventoryLocationId),
    page: String(page),
    per_page: String(perPage),
  });

  const trimmedSearch = search?.trim() ?? '';
  if (trimmedSearch.length > 0) params.set('search', trimmedSearch);
  if (categoryId !== null && categoryId !== undefined && String(categoryId).length > 0) params.set('category_id', String(categoryId));
  if (stockStatus) params.set('stock_status', stockStatus);

  return params;
}

export async function getMobileInventory({
  baseUrl,
  accessToken,
  inventoryLocationId,
  search,
  categoryId,
  stockStatus,
  page = 1,
  perPage = 30,
  signal,
}: GetMobileInventoryInput): Promise<MobileInventoryResponse> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/mobile/inventory`);
  url.search = buildMobileInventoryQueryParams({ inventoryLocationId, search, categoryId, stockStatus, page, perPage }).toString();

  try {
    const payload = await apiClient.get<unknown>(url.toString(), { token: accessToken, authenticated: true, signal });
    return parseMobileInventoryResponse(payload);
  } catch (error) {
    if (error instanceof MobileInventoryError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new MobileInventoryError('network_error', 'Network error');
  }
}

export function mobileInventoryItemKey(item: MobileInventoryItem): string {
  return `${item.product_id}:${item.product_variant_id ?? 'simple'}`;
}

export function mergeMobileInventoryPages(current: MobileInventoryItem[], incoming: MobileInventoryItem[]): MobileInventoryItem[] {
  const seen = new Set(current.map(mobileInventoryItemKey));
  const merged = [...current];
  incoming.forEach((item) => {
    const key = mobileInventoryItemKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  });
  return merged;
}
