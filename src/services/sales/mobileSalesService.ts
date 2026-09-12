import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';
import type {
  MobileSale,
  MobileSaleBranch,
  MobileSaleCustomer,
  MobileSaleFiscal,
  MobileSalePagination,
  MobileSalePaymentStatus,
  MobileSalesResponse,
} from '../../types/mobileSales';

export type MobileSalesErrorStatus =
  | 'session_expired'
  | 'forbidden'
  | 'validation_error'
  | 'rate_limited'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export class MobileSalesError extends Error {
  status: MobileSalesErrorStatus;
  httpStatus?: number;
  code?: string;

  constructor(status: MobileSalesErrorStatus, message: string, options: { httpStatus?: number; code?: string } = {}) {
    super(message);
    this.name = 'MobileSalesError';
    this.status = status;
    this.httpStatus = options.httpStatus;
    this.code = options.code;
  }
}

type GetMobileSalesInput = {
  baseUrl: string;
  accessToken: string;
  search?: string | null;
  paymentStatus?: MobileSalePaymentStatus | null;
  dateFrom?: string | null;
  dateTo?: string | null;
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

/** Money travels as decimal strings ("150.50") — kept as strings, never coerced to number, so display formatting never re-derives backend totals through float math. */
function asDecimalString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asPaymentStatus(value: unknown): MobileSalePaymentStatus | null {
  return value === 'paid' || value === 'partial' || value === 'unpaid' ? value : null;
}

function parseCustomer(value: unknown): MobileSaleCustomer | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (id === null || !name) return null;
  return { id, name };
}

function parseBranch(value: unknown): MobileSaleBranch | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (id === null || !name) return null;
  return { id, name };
}

function parseFiscal(value: unknown): MobileSaleFiscal | null {
  if (!isRecord(value)) return null;
  return { number: asNullableString(value.number), status: asNullableString(value.status) };
}

export function parseMobileSale(value: unknown): MobileSale | null {
  if (!isRecord(value)) return null;
  const saleId = asString(value.sale_id);
  const reference = asString(value.reference);
  const date = asString(value.date);
  const grandTotal = asDecimalString(value.grand_total);
  const paidAmount = asDecimalString(value.paid_amount);
  const dueAmount = asDecimalString(value.due_amount);
  const paymentStatus = asPaymentStatus(value.payment_status);
  const itemsCount = asNumber(value.items_count);

  if (
    saleId === null || reference === null || date === null
    || grandTotal === null || paidAmount === null || dueAmount === null
    || paymentStatus === null || itemsCount === null
  ) {
    return null;
  }

  return {
    sale_id: saleId,
    sale_uuid: asNullableString(value.sale_uuid),
    reference,
    date,
    customer: parseCustomer(value.customer),
    branch: parseBranch(value.branch),
    items_count: itemsCount,
    grand_total: grandTotal,
    paid_amount: paidAmount,
    due_amount: dueAmount,
    payment_status: paymentStatus,
    fiscal: parseFiscal(value.fiscal),
  };
}

function parsePagination(value: unknown): MobileSalePagination | null {
  if (!isRecord(value)) return null;
  const page = asNumber(value.page);
  const perPage = asNumber(value.per_page);
  const total = asNumber(value.total);
  const lastPage = asNumber(value.last_page);
  const hasMore = typeof value.has_more === 'boolean' ? value.has_more : null;
  if (page === null || perPage === null || total === null || lastPage === null || hasMore === null) return null;
  return { page, per_page: perPage, total, last_page: lastPage, has_more: hasMore };
}

function unwrapSalesPayload(payload: unknown): unknown {
  if (isRecord(payload) && isRecord(payload.data)) return payload.data;
  return payload;
}

export function parseMobileSalesResponse(payload: unknown): MobileSalesResponse {
  const data = unwrapSalesPayload(payload);
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new MobileSalesError('invalid_response', 'Malformed sales response');
  }

  const pagination = parsePagination(data.pagination);
  const items = data.items.map(parseMobileSale);

  if (!pagination || items.some((item) => item === null)) {
    throw new MobileSalesError('invalid_response', 'Malformed sales response');
  }

  return { items: items as MobileSale[], pagination };
}

function mapApiError(error: ApiError): MobileSalesError {
  if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') {
    return new MobileSalesError('session_expired', 'Session expired', { httpStatus: error.status, code: error.code });
  }
  if (error.status === 403) {
    return new MobileSalesError('forbidden', 'Forbidden', { httpStatus: error.status, code: error.code });
  }
  if (error.status === 422) {
    return new MobileSalesError('validation_error', 'Validation error', { httpStatus: error.status, code: error.code });
  }
  if (error.status === 429) {
    return new MobileSalesError('rate_limited', 'Rate limited', { httpStatus: error.status, code: error.code });
  }
  if (error.status >= 500) {
    return new MobileSalesError('server_error', 'Server error', { httpStatus: error.status, code: error.code });
  }
  if (error.code === 'timeout') {
    return new MobileSalesError('timeout', 'Timeout', { httpStatus: error.status, code: error.code });
  }
  if (error.code === 'network_error') {
    return new MobileSalesError('network_error', 'Network error', { httpStatus: error.status, code: error.code });
  }
  return new MobileSalesError('invalid_response', 'Unexpected sales error', { httpStatus: error.status, code: error.code });
}

/** Pure query-param builder, kept separate from the fetch call so it is unit-testable without mocking fetch. */
export function buildMobileSalesQueryParams({
  search,
  paymentStatus,
  dateFrom,
  dateTo,
  page = 1,
  perPage = 30,
}: Omit<GetMobileSalesInput, 'baseUrl' | 'accessToken' | 'signal'>): URLSearchParams {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  const trimmedSearch = search?.trim() ?? '';
  if (trimmedSearch.length > 0) params.set('search', trimmedSearch);
  if (paymentStatus) params.set('payment_status', paymentStatus);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);

  return params;
}

export async function getMobileSales({
  baseUrl,
  accessToken,
  search,
  paymentStatus,
  dateFrom,
  dateTo,
  page = 1,
  perPage = 30,
  signal,
}: GetMobileSalesInput): Promise<MobileSalesResponse> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/mobile/sales`);
  url.search = buildMobileSalesQueryParams({ search, paymentStatus, dateFrom, dateTo, page, perPage }).toString();

  try {
    const payload = await apiClient.get<unknown>(url.toString(), { token: accessToken, authenticated: true, signal });
    return parseMobileSalesResponse(payload);
  } catch (error) {
    if (error instanceof MobileSalesError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new MobileSalesError('network_error', 'Network error');
  }
}

export function mobileSaleKey(sale: MobileSale): string {
  return String(sale.sale_id);
}

/** Route for the official invoice screen - carries only the sale id, never a token or html. */
export function saleReceiptRoute(saleId: string | number): `/sales/${string}` {
  return `/sales/${encodeURIComponent(String(saleId))}`;
}

export function mergeMobileSalesPages(current: MobileSale[], incoming: MobileSale[]): MobileSale[] {
  const seen = new Set(current.map(mobileSaleKey));
  const merged = [...current];
  incoming.forEach((sale) => {
    const key = mobileSaleKey(sale);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(sale);
    }
  });
  return merged;
}
