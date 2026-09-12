import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';
import { parseMobileSale } from '../sales/mobileSalesService';
import type { MobileSale } from '../../types/mobileSales';

export type MobileClientDetailErrorStatus =
  | 'session_expired'
  | 'forbidden'
  | 'not_found'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export class MobileClientDetailError extends Error {
  status: MobileClientDetailErrorStatus;

  constructor(status: MobileClientDetailErrorStatus, message: string) {
    super(message);
    this.name = 'MobileClientDetailError';
    this.status = status;
  }
}

export type MobileClientDetail = {
  id: string | number;
  name: string;
  rtn: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: string;
  recentSales: MobileSale[];
};

export function mobileClientDetailMessage(status: MobileClientDetailErrorStatus): string {
  if (status === 'forbidden' || status === 'not_found') return 'No tienes acceso a este cliente.';
  return 'No pudimos cargar el cliente.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function parseMobileClientDetail(payload: unknown): MobileClientDetail {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(data) || (typeof data.id !== 'string' && typeof data.id !== 'number') || typeof data.name !== 'string' || typeof data.balance !== 'string') {
    throw new MobileClientDetailError('invalid_response', 'Malformed client response');
  }
  const recentSales = Array.isArray(data.recent_sales) ? data.recent_sales.map(parseMobileSale).filter((sale): sale is MobileSale => sale !== null) : [];

  return {
    id: data.id,
    name: data.name,
    rtn: asNullableString(data.rtn),
    phone: asNullableString(data.phone),
    email: asNullableString(data.email),
    address: asNullableString(data.address),
    balance: data.balance,
    recentSales,
  };
}

function mapApiError(error: ApiError): MobileClientDetailError {
  if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') {
    return new MobileClientDetailError('session_expired', 'Session expired');
  }
  if (error.status === 403) return new MobileClientDetailError('forbidden', 'Forbidden');
  if (error.status === 404) return new MobileClientDetailError('not_found', 'Not found');
  if (error.status >= 500) return new MobileClientDetailError('server_error', 'Server error');
  if (error.code === 'timeout') return new MobileClientDetailError('timeout', 'Timeout');
  if (error.code === 'network_error') return new MobileClientDetailError('network_error', 'Network error');
  return new MobileClientDetailError('invalid_response', 'Unexpected client error');
}

export async function getMobileClientDetail({ baseUrl, accessToken, clientId, signal }: { baseUrl: string; accessToken: string; clientId: string | number; signal?: AbortSignal }): Promise<MobileClientDetail> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/mobile/clients/${encodeURIComponent(String(clientId))}`;
  try {
    const payload = await apiClient.get<unknown>(url, { token: accessToken, authenticated: true, signal });
    return parseMobileClientDetail(payload);
  } catch (error) {
    if (error instanceof MobileClientDetailError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new MobileClientDetailError('network_error', 'Network error');
  }
}
