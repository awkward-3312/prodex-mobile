import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';
import type { CartItem } from '../../types/pos';
import type { CheckoutAccount, CheckoutCapabilities, CheckoutContext, CheckoutCurrency, CheckoutCustomer, CheckoutOperationalContext, CheckoutPaymentMethod, ClientSearchResponse, ClientSearchResult } from '../../types/mobilePosCheckout';
import type { FiscalSummary, PreflightError, PreflightLine, PreflightLineResult, PreflightPaymentIntentLine, PreflightPayments, PreflightTotals, SalePreflightRequest, SalePreflightResponse } from '../../types/mobilePosSalePreflight';
import { parseMinorUnits } from '../../utils/formatCurrency';

export type MobilePosCheckoutErrorStatus =
  | 'session_expired'
  | 'forbidden'
  | 'invalid_request'
  | 'rate_limited'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export class MobilePosCheckoutError extends Error {
  status: MobilePosCheckoutErrorStatus;
  httpStatus?: number;
  code?: string;

  constructor(status: MobilePosCheckoutErrorStatus, message: string, options: { httpStatus?: number; code?: string } = {}) {
    super(message);
    this.name = 'MobilePosCheckoutError';
    this.status = status;
    this.httpStatus = options.httpStatus;
    this.code = options.code;
  }
}

type AuthInput = {
  baseUrl: string;
  accessToken: string;
  signal?: AbortSignal;
};

type ClientSearchInput = AuthInput & {
  search?: string;
  page?: number;
  perPage?: number;
};

type PreflightInput = AuthInput & {
  request: SalePreflightRequest;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function unwrapData(payload: unknown) {
  if (isRecord(payload) && isRecord(payload.data)) return payload.data;
  return payload;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asRequiredString(value: unknown, fallback = '') {
  return asString(value) ?? fallback;
}

function asId(value: unknown): string | number | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function decimalText(value: unknown) {
  return asString(value) ?? '0.00';
}

function parseNamedEntity(value: unknown): { id: string | number; name: string } | null {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const name = asString(value.name);
  return id !== null && name ? { id, name } : null;
}

function parseCustomer(value: unknown): CheckoutCustomer | null {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const name = asString(value.name) ?? asString(value.display_name);
  if (id === null || !name) return null;
  return { id, name, phone: asString(value.phone), rtn: asString(value.rtn) ?? asString(value.tax_number), email: asString(value.email) };
}

function parsePaymentMethod(value: unknown): CheckoutPaymentMethod | null {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const name = asString(value.name);
  if (id === null || !name) return null;
  return {
    id,
    name,
    type: asRequiredString(value.type, 'other'),
    is_cash: asBoolean(value.is_cash),
    is_card: asBoolean(value.is_card),
    requires_account: asBoolean(value.requires_account),
    is_supported: asBoolean(value.is_supported),
    is_available: asBoolean(value.is_available),
    supports_change: asBoolean(value.supports_change),
    stripe_supported: asBoolean(value.stripe_supported),
  };
}

function parseAccount(value: unknown): CheckoutAccount | null {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const name = asString(value.name);
  if (id === null || !name) return null;
  return { id, name, payment_method_id: asId(value.payment_method_id) };
}

function parseCurrency(value: unknown): CheckoutCurrency {
  if (!isRecord(value)) return { code: 'HNL', symbol: 'L', price_decimals: 2 };
  return {
    code: asRequiredString(value.code, 'HNL'),
    symbol: asRequiredString(value.symbol, 'L'),
    price_decimals: asNumber(value.price_decimals) ?? 2,
    locale: asString(value.locale),
  };
}

function parseCapabilities(value: unknown): CheckoutCapabilities {
  if (!isRecord(value)) return { can_create_sale: false, reason: 'No se pudo validar la capacidad de venta.', mixed_payments: false };
  return {
    can_create_sale: asBoolean(value.can_create_sale),
    reason: asString(value.reason),
    mixed_payments: asBoolean(value.mixed_payments),
  };
}

export function parseCheckoutContext(payload: unknown): CheckoutContext {
  const data = unwrapData(payload);
  if (!isRecord(data)) throw new MobilePosCheckoutError('invalid_response', 'Malformed checkout context');
  const operational = isRecord(data.operational_context) ? data.operational_context : {};
  const customer = isRecord(data.customer) ? data.customer : {};
  const paymentMethods = Array.isArray(data.payment_methods) ? data.payment_methods.map(parsePaymentMethod) : [];
  const accounts = Array.isArray(data.accounts) ? data.accounts.map(parseAccount) : [];
  if (paymentMethods.some((item) => item === null) || accounts.some((item) => item === null)) throw new MobilePosCheckoutError('invalid_response', 'Malformed checkout context');

  return {
    operational_context: {
      branch: parseNamedEntity(operational.branch),
      inventory_location: parseNamedEntity(operational.inventory_location),
      cash_drawer: parseNamedEntity(operational.cash_drawer),
    },
    customer: { default: parseCustomer(customer.default) },
    payment_methods: paymentMethods as CheckoutPaymentMethod[],
    accounts: accounts as CheckoutAccount[],
    tax_config: isRecord(data.tax_config) ? { prices_include_tax: typeof data.tax_config.prices_include_tax === 'boolean' ? data.tax_config.prices_include_tax : null, default_tax_rate: asString(data.tax_config.default_tax_rate) } : {},
    currency: parseCurrency(data.currency),
    pricing: isRecord(data.pricing) ? { price_list_id: asId(data.pricing.price_list_id), price_list_name: asString(data.pricing.price_list_name) } : {},
    capabilities: parseCapabilities(data.capabilities),
  };
}

function parsePagination(value: unknown): ClientSearchResponse['pagination'] | null {
  if (!isRecord(value)) return null;
  const page = asNumber(value.page);
  const perPage = asNumber(value.per_page);
  const total = asNumber(value.total);
  const lastPage = asNumber(value.last_page);
  if (page === null || perPage === null || total === null || lastPage === null) return null;
  return { page, per_page: perPage, total, last_page: lastPage, has_more: asBoolean(value.has_more) };
}

export function parseClientSearchResponse(payload: unknown): ClientSearchResponse {
  const data = unwrapData(payload);
  if (!isRecord(data) || !Array.isArray(data.items)) throw new MobilePosCheckoutError('invalid_response', 'Malformed client search');
  const pagination = parsePagination(data.pagination);
  const items = data.items.map(parseCustomer);
  if (!pagination || items.some((item) => item === null)) throw new MobilePosCheckoutError('invalid_response', 'Malformed client search');
  return { items: items as ClientSearchResult[], pagination };
}

function parsePreflightLine(value: unknown): PreflightLineResult | null {
  if (!isRecord(value)) return null;
  const productId = asId(value.product_id);
  if (productId === null) return null;
  return {
    product_id: productId,
    product_variant_id: asId(value.product_variant_id),
    quantity: decimalText(value.quantity),
    unit_price: decimalText(value.unit_price),
    net_unit_price: decimalText(value.net_unit_price),
    net_subtotal: decimalText(value.net_subtotal),
    subtotal: decimalText(value.subtotal),
    total: decimalText(value.total),
    tax: isRecord(value.tax) ? { amount: decimalText(value.tax.amount) } : null,
  };
}

function parsePreflightError(value: unknown): PreflightError | null {
  if (!isRecord(value)) return null;
  const code = asString(value.code);
  if (!code) return null;
  return {
    code,
    message: asRequiredString(value.message, code),
    line_index: asNumber(value.line_index),
    product_id: asId(value.product_id),
    product_variant_id: asId(value.product_variant_id),
    available_quantity: asString(value.available_quantity),
    requested_quantity: asString(value.requested_quantity),
  };
}

function parseTotals(value: unknown): PreflightTotals | null {
  if (!isRecord(value)) return null;
  return {
    merchandise_total: decimalText(value.merchandise_total),
    net_total: decimalText(value.net_total),
    subtotal: decimalText(value.subtotal),
    subtotal_excluding_tax: decimalText(value.subtotal_excluding_tax),
    subtotal_including_tax: decimalText(value.subtotal_including_tax),
    tax: decimalText(value.tax),
    discount: decimalText(value.discount),
    shipping: decimalText(value.shipping),
    grand_total: decimalText(value.grand_total),
  };
}

function parsePayments(value: unknown): PreflightPayments {
  if (!isRecord(value)) return { total_paid: '0.00', change: '0.00', balance_due: '0.00' };
  return {
    requested: Array.isArray(value.requested) ? value.requested : undefined,
    total_paid: decimalText(value.total_paid ?? value.applied_total),
    change: decimalText(value.change),
    balance_due: decimalText(value.balance_due ?? value.remaining_due),
  };
}

export function parseSalePreflightResponse(payload: unknown): SalePreflightResponse {
  const data = unwrapData(payload);
  if (!isRecord(data)) throw new MobilePosCheckoutError('invalid_response', 'Malformed sale preflight');
  const totals = parseTotals(data.totals);
  const lines = Array.isArray(data.lines) ? data.lines.map(parsePreflightLine) : [];
  const errors = Array.isArray(data.errors) ? data.errors.map(parsePreflightError) : [];
  if (!totals || lines.some((line) => line === null) || errors.some((error) => error === null)) throw new MobilePosCheckoutError('invalid_response', 'Malformed sale preflight');
  return { can_submit: asBoolean(data.can_submit), totals, lines: lines as PreflightLineResult[], payments: parsePayments(data.payments), errors: errors as PreflightError[] };
}

function mapApiError(error: ApiError): MobilePosCheckoutError {
  if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') return new MobilePosCheckoutError('session_expired', 'Session expired', { httpStatus: error.status, code: error.code });
  if (error.status === 403) return new MobilePosCheckoutError('forbidden', 'Forbidden', { httpStatus: error.status, code: error.code });
  if (error.status === 422) return new MobilePosCheckoutError('invalid_request', 'Invalid request', { httpStatus: error.status, code: error.code });
  if (error.status === 429) return new MobilePosCheckoutError('rate_limited', 'Rate limited', { httpStatus: error.status, code: error.code });
  if (error.status >= 500) return new MobilePosCheckoutError('server_error', 'Server error', { httpStatus: error.status, code: error.code });
  if (error.code === 'timeout') return new MobilePosCheckoutError('timeout', 'Timeout', { httpStatus: error.status, code: error.code });
  if (error.code === 'network_error') return new MobilePosCheckoutError('network_error', 'Network error', { httpStatus: error.status, code: error.code });
  return new MobilePosCheckoutError('invalid_response', 'Unexpected checkout error', { httpStatus: error.status, code: error.code });
}

async function callCheckout<T>(request: () => Promise<unknown>, parser: (payload: unknown) => T) {
  try {
    const payload = await request();
    return parser(payload);
  } catch (error) {
    if (error instanceof MobilePosCheckoutError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new MobilePosCheckoutError('network_error', 'Network error');
  }
}

export function getCheckoutContext({ baseUrl, accessToken, signal }: AuthInput) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/mobile/pos/checkout-context`;
  return callCheckout(() => apiClient.get<unknown>(url, { token: accessToken, authenticated: true, signal }), parseCheckoutContext);
}

export function searchClients({ baseUrl, accessToken, search = '', page = 1, perPage = 20, signal }: ClientSearchInput) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/mobile/pos/clients`);
  url.search = new URLSearchParams({ search: search.trim(), page: String(page), per_page: String(perPage) }).toString();
  return callCheckout(() => apiClient.get<unknown>(url.toString(), { token: accessToken, authenticated: true, signal }), parseClientSearchResponse);
}

export function preflightSale({ baseUrl, accessToken, request, signal }: PreflightInput) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/mobile/pos/sale-preflight`;
  return callCheckout(() => apiClient.post<unknown>(url, request, { token: accessToken, authenticated: true, signal }), parseSalePreflightResponse);
}

export function quantityToPreflightString(quantity: number) {
  const normalized = Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity * 1000) / 1000 : 0;
  return normalized.toFixed(3);
}

export function cartItemsToPreflightLines(items: CartItem[]): PreflightLine[] {
  return items.map((item) => {
    if (item.product.productId === undefined || item.product.productId === null || item.product.productId === '') {
      throw new MobilePosCheckoutError('invalid_request', 'Cart item is missing API product id');
    }
    return {
      product_id: item.product.productId,
      product_variant_id: item.product.productVariantId ?? null,
      quantity: quantityToPreflightString(item.quantity),
    };
  });
}

export function fiscalSummaryFromPreflight(response: SalePreflightResponse): FiscalSummary {
  const subtotal = response.totals.subtotal_excluding_tax !== '0.00' ? response.totals.subtotal_excluding_tax : response.totals.net_total;
  return {
    subtotalCents: parseMinorUnits(subtotal),
    taxCents: parseMinorUnits(response.totals.tax),
    totalCents: parseMinorUnits(response.totals.grand_total),
    discountCents: parseMinorUnits(response.totals.discount),
    shippingCents: parseMinorUnits(response.totals.shipping),
  };
}

export function paymentIntentLine(paymentMethodId: string | number, amountCents: number, accountId?: string | number | null): PreflightPaymentIntentLine {
  return {
    payment_method_id: paymentMethodId,
    amount: (Math.max(0, Math.round(amountCents)) / 100).toFixed(2),
    ...(accountId !== undefined ? { account_id: accountId } : {}),
  };
}

/**
 * A single-method cash amount left to auto-fill uses the provisional (pre-tax) subtotal
 * for the very first preflight, since the authoritative total is not known yet. If PRODEX
 * rejects that estimate as a mismatch, this says whether to silently resend once with the
 * authoritative grand_total instead of surfacing a bogus "amount doesn't match" error -
 * never when the user typed their own amount, and never more than once per attempt.
 */
export function needsAuthoritativeAmountRetry(response: SalePreflightResponse, options: { usingAutoAmount: boolean; alreadyRetried: boolean }): boolean {
  return !response.can_submit && !options.alreadyRetried && options.usingAutoAmount && response.errors.some((error) => error.code === 'payment_total_invalid');
}

export function checkoutContextLocationLabel(context: CheckoutContext | null) {
  if (!context) return 'Cargando contexto...';
  return [context.operational_context.branch?.name, context.operational_context.inventory_location?.name, context.operational_context.cash_drawer?.name].filter(Boolean).join(' · ') || 'Contexto operativo no disponible';
}
