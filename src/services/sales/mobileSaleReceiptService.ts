import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';

export type MobileSaleReceiptErrorStatus =
  | 'session_expired'
  | 'forbidden'
  | 'not_found'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export class MobileSaleReceiptError extends Error {
  status: MobileSaleReceiptErrorStatus;

  constructor(status: MobileSaleReceiptErrorStatus, message: string) {
    super(message);
    this.name = 'MobileSaleReceiptError';
    this.status = status;
  }
}

export type MobileSaleReceipt = { saleId: string; reference: string; html: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function parseMobileSaleReceipt(payload: unknown): MobileSaleReceipt {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(data) || typeof data.html !== 'string' || data.html.trim().length === 0) {
    throw new MobileSaleReceiptError('invalid_response', 'Malformed receipt response');
  }
  const saleId = typeof data.sale_id === 'string' || typeof data.sale_id === 'number' ? String(data.sale_id) : null;
  const reference = typeof data.reference === 'string' ? data.reference : null;
  if (saleId === null || reference === null) {
    throw new MobileSaleReceiptError('invalid_response', 'Malformed receipt response');
  }
  return { saleId, reference, html: data.html };
}

function mapApiError(error: ApiError): MobileSaleReceiptError {
  if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') {
    return new MobileSaleReceiptError('session_expired', 'Session expired');
  }
  if (error.status === 403) return new MobileSaleReceiptError('forbidden', 'Forbidden');
  if (error.status === 404) return new MobileSaleReceiptError('not_found', 'Not found');
  if (error.status >= 500) return new MobileSaleReceiptError('server_error', 'Server error');
  if (error.code === 'timeout') return new MobileSaleReceiptError('timeout', 'Timeout');
  if (error.code === 'network_error') return new MobileSaleReceiptError('network_error', 'Network error');
  return new MobileSaleReceiptError('invalid_response', 'Unexpected receipt error');
}

export async function getMobileSaleReceipt({ baseUrl, accessToken, saleId, signal }: { baseUrl: string; accessToken: string; saleId: string | number; signal?: AbortSignal }): Promise<MobileSaleReceipt> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/mobile/sales/${encodeURIComponent(String(saleId))}/receipt`;
  try {
    const payload = await apiClient.get<unknown>(url, { token: accessToken, authenticated: true, signal });
    return parseMobileSaleReceipt(payload);
  } catch (error) {
    if (error instanceof MobileSaleReceiptError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new MobileSaleReceiptError('network_error', 'Network error');
  }
}
