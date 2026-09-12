import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';

export type MobileReportsErrorStatus =
  | 'session_expired'
  | 'forbidden'
  | 'validation_error'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export class MobileReportsError extends Error {
  status: MobileReportsErrorStatus;

  constructor(status: MobileReportsErrorStatus, message: string) {
    super(message);
    this.name = 'MobileReportsError';
    this.status = status;
  }
}

export function mobileReportsMessage(status: MobileReportsErrorStatus): string {
  if (status === 'forbidden') return 'No tienes acceso a los reportes.';
  return 'No pudimos cargar el reporte.';
}

export type MobileReportRow = { name: string; quantity?: string; total?: string };
export type MobileReportsSummary = {
  from: string;
  to: string;
  salesTotal: string;
  salesCount: number;
  averageSale: string;
  taxTotal: string;
  paidTotal: string;
  pendingTotal: string;
  topProducts: MobileReportRow[];
  topCustomers: MobileReportRow[];
  paymentMethods: MobileReportRow[];
};

export type ReportRangePreset = 'today' | '7d' | '30d';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Pure, so the "Hoy/7 días/30 días" selector is testable without mocking the clock inside a component. */
export function computeReportRange(preset: ReportRangePreset, now: Date = new Date()): { from: string; to: string } {
  const to = toIsoDate(now);
  const daysBack = preset === 'today' ? 0 : preset === '7d' ? 6 : 29;
  const from = new Date(now);
  from.setDate(from.getDate() - daysBack);
  return { from: toIsoDate(from), to };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function parseRows(value: unknown, moneyField: 'quantity' | 'total'): MobileReportRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .filter((row): row is Record<string, unknown> => typeof row.name === 'string' && typeof row[moneyField] === 'string')
    .map((row) => ({ name: row.name as string, [moneyField]: row[moneyField] as string }));
}

export function parseMobileReportsSummary(payload: unknown): MobileReportsSummary {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (
    !isRecord(data)
    || typeof data.from !== 'string' || typeof data.to !== 'string'
    || typeof data.sales_total !== 'string' || typeof data.sales_count !== 'number'
    || typeof data.average_sale !== 'string' || typeof data.tax_total !== 'string'
    || typeof data.paid_total !== 'string' || typeof data.pending_total !== 'string'
  ) {
    throw new MobileReportsError('invalid_response', 'Malformed reports response');
  }

  return {
    from: data.from,
    to: data.to,
    salesTotal: data.sales_total,
    salesCount: data.sales_count,
    averageSale: data.average_sale,
    taxTotal: data.tax_total,
    paidTotal: data.paid_total,
    pendingTotal: data.pending_total,
    topProducts: parseRows(data.top_products, 'quantity'),
    topCustomers: parseRows(data.top_customers, 'total'),
    paymentMethods: parseRows(data.payment_methods, 'total'),
  };
}

function mapApiError(error: ApiError): MobileReportsError {
  if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') {
    return new MobileReportsError('session_expired', 'Session expired');
  }
  if (error.status === 403) return new MobileReportsError('forbidden', 'Forbidden');
  if (error.status === 422) return new MobileReportsError('validation_error', 'Validation error');
  if (error.status >= 500) return new MobileReportsError('server_error', 'Server error');
  if (error.code === 'timeout') return new MobileReportsError('timeout', 'Timeout');
  if (error.code === 'network_error') return new MobileReportsError('network_error', 'Network error');
  return new MobileReportsError('invalid_response', 'Unexpected reports error');
}

export async function getMobileReportsSummary({ baseUrl, accessToken, from, to, signal }: { baseUrl: string; accessToken: string; from: string; to: string; signal?: AbortSignal }): Promise<MobileReportsSummary> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/mobile/reports/summary`);
  url.search = new URLSearchParams({ from, to }).toString();
  try {
    const payload = await apiClient.get<unknown>(url.toString(), { token: accessToken, authenticated: true, signal });
    return parseMobileReportsSummary(payload);
  } catch (error) {
    if (error instanceof MobileReportsError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new MobileReportsError('network_error', 'Network error');
  }
}
