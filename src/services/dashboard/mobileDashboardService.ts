import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';

export type MobileDashboardErrorStatus =
  | 'session_expired'
  | 'forbidden'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export class MobileDashboardError extends Error {
  status: MobileDashboardErrorStatus;

  constructor(status: MobileDashboardErrorStatus, message: string) {
    super(message);
    this.name = 'MobileDashboardError';
    this.status = status;
  }
}

export function mobileDashboardMessage(status: MobileDashboardErrorStatus): string {
  if (status === 'forbidden') return 'No tienes acceso al resumen de hoy.';
  return 'No pudimos cargar el resumen.';
}

export type DashboardTopProduct = { id: number; name: string; quantity: string };
export type DashboardDay = { date: string; total: string };

export type MobileDashboardSummary = {
  today: {
    salesTotal: string;
    salesCount: number;
    averageSale: string;
    salesTotalDeltaPct: number | null;
    averageSaleDeltaPct: number | null;
    topProducts: DashboardTopProduct[] | null;
  };
  week: { from: string; to: string; days: DashboardDay[]; total: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function parseTopProducts(value: unknown): DashboardTopProduct[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter(isRecord)
    .filter((row): row is Record<string, unknown> => typeof row.id === 'number' && typeof row.name === 'string' && typeof row.quantity === 'string')
    .map((row) => ({ id: row.id as number, name: row.name as string, quantity: row.quantity as string }));
}

function parseDays(value: unknown): DashboardDay[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .filter((row): row is Record<string, unknown> => typeof row.date === 'string' && typeof row.total === 'string')
    .map((row) => ({ date: row.date as string, total: row.total as string }));
}

export function parseMobileDashboardSummary(payload: unknown): MobileDashboardSummary {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const today = isRecord(data) ? data.today : null;
  const week = isRecord(data) ? data.week : null;

  if (
    !isRecord(today) || typeof today.sales_total !== 'string' || typeof today.sales_count !== 'number' || typeof today.average_sale !== 'string'
    || !isRecord(week) || typeof week.from !== 'string' || typeof week.to !== 'string' || typeof week.total !== 'string'
  ) {
    throw new MobileDashboardError('invalid_response', 'Malformed dashboard response');
  }

  return {
    today: {
      salesTotal: today.sales_total,
      salesCount: today.sales_count,
      averageSale: today.average_sale,
      salesTotalDeltaPct: asNumberOrNull(today.sales_total_delta_pct),
      averageSaleDeltaPct: asNumberOrNull(today.average_sale_delta_pct),
      topProducts: parseTopProducts(today.top_products),
    },
    week: { from: week.from, to: week.to, total: week.total, days: parseDays(week.days) },
  };
}

function mapApiError(error: ApiError): MobileDashboardError {
  if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') {
    return new MobileDashboardError('session_expired', 'Session expired');
  }
  if (error.status === 403) return new MobileDashboardError('forbidden', 'Forbidden');
  if (error.status >= 500) return new MobileDashboardError('server_error', 'Server error');
  if (error.code === 'timeout') return new MobileDashboardError('timeout', 'Timeout');
  if (error.code === 'network_error') return new MobileDashboardError('network_error', 'Network error');
  return new MobileDashboardError('invalid_response', 'Unexpected dashboard error');
}

export async function getMobileDashboardSummary({ baseUrl, accessToken, signal }: { baseUrl: string; accessToken: string; signal?: AbortSignal }): Promise<MobileDashboardSummary> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/mobile/dashboard/summary`;
  try {
    const payload = await apiClient.get<unknown>(url, { token: accessToken, authenticated: true, signal });
    return parseMobileDashboardSummary(payload);
  } catch (error) {
    if (error instanceof MobileDashboardError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new MobileDashboardError('network_error', 'Network error');
  }
}
