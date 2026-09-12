import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';

export type MobileCashRegisterErrorStatus =
  | 'session_expired'
  | 'forbidden'
  | 'validation_error'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export class MobileCashRegisterError extends Error {
  status: MobileCashRegisterErrorStatus;

  constructor(status: MobileCashRegisterErrorStatus, message: string) {
    super(message);
    this.name = 'MobileCashRegisterError';
    this.status = status;
  }
}

export function mobileCashRegisterMessage(status: MobileCashRegisterErrorStatus): string {
  if (status === 'forbidden') return 'No tienes acceso a la caja.';
  return 'No pudimos cargar la caja.';
}

export type CashRegisterEntity = { id: string | number; name: string | null } | null;

export type CashRegisterPaymentMethodTotal = { id: string | number | null; name: string; category: string; total: string };

export type CashRegisterSummary = {
  transactionCount: number;
  totalSales: string;
  cashSales: string;
  cashIn: string;
  cashOut: string;
  cashRefunds: string;
  expectedCash: string;
  cardSystemTotal: string;
  transferTotal: string;
  storeCreditApplied: string;
  salesByPaymentMethod: CashRegisterPaymentMethodTotal[];
};

export type CashRegisterCurrent = {
  id: string | number;
  openedAt: string;
  openingBalance: string;
  branch: CashRegisterEntity;
  inventoryLocation: CashRegisterEntity;
  warehouse: CashRegisterEntity;
  cashDrawer: CashRegisterEntity;
};

export type CashRegisterCurrentResponse =
  | { status: 'open'; register: CashRegisterCurrent; summary: CashRegisterSummary }
  | { status: 'closed'; register: null; summary: null };

export type CashRegisterHistoryItem = {
  id: string | number;
  status: string;
  closingStatus: string | null;
  closingStatusLabel: string | null;
  user: { id: string | number | null; name: string | null };
  branch: string | null;
  inventoryLocation: string | null;
  warehouse: string | null;
  cashDrawer: string | null;
  openedAt: string | null;
  closedAt: string | null;
  openingBalance: string | null;
  totalSales: string | null;
  expectedCash: string | null;
  countedCash: string | null;
  difference: string | null;
};

export type CashRegisterHistoryPagination = { page: number; per_page: number; total: number; last_page: number; has_more: boolean };
export type CashRegisterHistoryResponse = { items: CashRegisterHistoryItem[]; pagination: CashRegisterHistoryPagination };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function parseEntity(value: unknown): CashRegisterEntity {
  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' || typeof value.id === 'number' ? value.id : null;
  if (id === null) return null;
  return { id, name: asString(value.name) };
}

function parsePaymentMethodTotal(value: unknown): CashRegisterPaymentMethodTotal | null {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.category !== 'string' || typeof value.total !== 'string') return null;
  const id = typeof value.id === 'string' || typeof value.id === 'number' ? value.id : null;
  return { id, name: value.name, category: value.category, total: value.total };
}

export function parseCashRegisterEntity(value: unknown): CashRegisterCurrent | null {
  if (!isRecord(value) || (typeof value.id !== 'string' && typeof value.id !== 'number') || typeof value.opened_at !== 'string' || typeof value.opening_balance !== 'string') return null;
  return {
    id: value.id,
    openedAt: value.opened_at,
    openingBalance: value.opening_balance,
    branch: parseEntity(value.branch),
    inventoryLocation: parseEntity(value.inventory_location),
    warehouse: parseEntity(value.warehouse),
    cashDrawer: parseEntity(value.cash_drawer),
  };
}

export function parseSummary(value: unknown): CashRegisterSummary | null {
  if (
    !isRecord(value)
    || typeof value.transaction_count !== 'number'
    || typeof value.total_sales !== 'string' || typeof value.cash_sales !== 'string'
    || typeof value.cash_in !== 'string' || typeof value.cash_out !== 'string'
    || typeof value.cash_refunds !== 'string' || typeof value.expected_cash !== 'string'
    || typeof value.card_system_total !== 'string' || typeof value.transfer_total !== 'string'
  ) {
    return null;
  }
  const methods = Array.isArray(value.sales_by_payment_method) ? value.sales_by_payment_method.map(parsePaymentMethodTotal).filter((row): row is CashRegisterPaymentMethodTotal => row !== null) : [];

  return {
    transactionCount: value.transaction_count,
    totalSales: value.total_sales,
    cashSales: value.cash_sales,
    cashIn: value.cash_in,
    cashOut: value.cash_out,
    cashRefunds: value.cash_refunds,
    expectedCash: value.expected_cash,
    cardSystemTotal: value.card_system_total,
    transferTotal: value.transfer_total,
    storeCreditApplied: typeof value.store_credit_applied === 'string' ? value.store_credit_applied : '0.00',
    salesByPaymentMethod: methods,
  };
}

export function parseCashRegisterCurrent(payload: unknown): CashRegisterCurrentResponse {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(data) || (data.status !== 'open' && data.status !== 'closed')) {
    throw new MobileCashRegisterError('invalid_response', 'Malformed cash register response');
  }
  if (data.status === 'closed') return { status: 'closed', register: null, summary: null };

  const registerData = data.register;
  const summary = parseSummary(data.summary);
  if (!isRecord(registerData) || (typeof registerData.id !== 'string' && typeof registerData.id !== 'number') || typeof registerData.opened_at !== 'string' || typeof registerData.opening_balance !== 'string' || !summary) {
    throw new MobileCashRegisterError('invalid_response', 'Malformed cash register response');
  }

  return {
    status: 'open',
    register: {
      id: registerData.id,
      openedAt: registerData.opened_at,
      openingBalance: registerData.opening_balance,
      branch: parseEntity(registerData.branch),
      inventoryLocation: parseEntity(registerData.inventory_location),
      warehouse: parseEntity(registerData.warehouse),
      cashDrawer: parseEntity(registerData.cash_drawer),
    },
    summary,
  };
}

function parseHistoryItem(value: unknown): CashRegisterHistoryItem | null {
  if (!isRecord(value) || (typeof value.id !== 'string' && typeof value.id !== 'number') || typeof value.status !== 'string') return null;
  const user = isRecord(value.user) ? value.user : {};

  return {
    id: value.id,
    status: value.status,
    closingStatus: asString(value.closing_status),
    closingStatusLabel: asString(value.closing_status_label),
    user: { id: typeof user.id === 'string' || typeof user.id === 'number' ? user.id : null, name: asString(user.name) },
    branch: asString(value.branch),
    inventoryLocation: asString(value.inventory_location),
    warehouse: asString(value.warehouse),
    cashDrawer: asString(value.cash_drawer),
    openedAt: asString(value.opened_at),
    closedAt: asString(value.closed_at),
    openingBalance: asString(value.opening_balance),
    totalSales: asString(value.total_sales),
    expectedCash: asString(value.expected_cash),
    countedCash: asString(value.counted_cash),
    difference: asString(value.difference),
  };
}

export function parseCashRegisterHistory(payload: unknown): CashRegisterHistoryResponse {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(data) || !Array.isArray(data.items) || !isRecord(data.pagination)) {
    throw new MobileCashRegisterError('invalid_response', 'Malformed cash register history response');
  }
  const pagination = data.pagination;
  if (typeof pagination.page !== 'number' || typeof pagination.per_page !== 'number' || typeof pagination.total !== 'number' || typeof pagination.last_page !== 'number' || typeof pagination.has_more !== 'boolean') {
    throw new MobileCashRegisterError('invalid_response', 'Malformed cash register history response');
  }
  const items = data.items.map(parseHistoryItem).filter((item): item is CashRegisterHistoryItem => item !== null);

  return { items, pagination: { page: pagination.page, per_page: pagination.per_page, total: pagination.total, last_page: pagination.last_page, has_more: pagination.has_more } };
}

function mapApiError(error: ApiError): MobileCashRegisterError {
  if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') {
    return new MobileCashRegisterError('session_expired', 'Session expired');
  }
  if (error.status === 403) return new MobileCashRegisterError('forbidden', 'Forbidden');
  if (error.status === 422) return new MobileCashRegisterError('validation_error', 'Validation error');
  if (error.status >= 500) return new MobileCashRegisterError('server_error', 'Server error');
  if (error.code === 'timeout') return new MobileCashRegisterError('timeout', 'Timeout');
  if (error.code === 'network_error') return new MobileCashRegisterError('network_error', 'Network error');
  return new MobileCashRegisterError('invalid_response', 'Unexpected cash register error');
}

async function callCashRegister<T>(request: () => Promise<unknown>, parser: (payload: unknown) => T): Promise<T> {
  try {
    return parser(await request());
  } catch (error) {
    if (error instanceof MobileCashRegisterError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new MobileCashRegisterError('network_error', 'Network error');
  }
}

export function getCurrentCashRegister({ baseUrl, accessToken, signal }: { baseUrl: string; accessToken: string; signal?: AbortSignal }): Promise<CashRegisterCurrentResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/mobile/cash-register/current`;
  return callCashRegister(() => apiClient.get<unknown>(url, { token: accessToken, authenticated: true, signal }), parseCashRegisterCurrent);
}

export function getCashRegisterHistory({ baseUrl, accessToken, page = 1, perPage = 20, from, to, signal }: { baseUrl: string; accessToken: string; page?: number; perPage?: number; from?: string; to?: string; signal?: AbortSignal }): Promise<CashRegisterHistoryResponse> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/mobile/cash-register/history`);
  const params: Record<string, string> = { page: String(page), per_page: String(perPage) };
  if (from) params.from = from;
  if (to) params.to = to;
  url.search = new URLSearchParams(params).toString();
  return callCashRegister(() => apiClient.get<unknown>(url.toString(), { token: accessToken, authenticated: true, signal }), parseCashRegisterHistory);
}
