import { apiClient } from '../api/apiClient';
import { ApiError } from '../api/apiError';
import { isRecord } from './mobileCashRegisterService';
import { CashRegisterOperationError, mapApiError, UUID_V4 } from './mobileCashRegisterOperationService';

export const CLOSE_MONEY = /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/;
export const closeMoneyFields = ['counted_cash', 'closing_balance', 'cash_withdrawn_at_close', 'next_opening_float', 'card_terminal_total'] as const;
export type CloseMoneyField = typeof closeMoneyFields[number];
export type CashRegisterCloseRequest = {
  operation_uuid: string; register_id: string | number; counted_cash: string;
  closing_balance?: string; cash_withdrawn_at_close?: string; next_opening_float?: string;
  counted_denominations?: Record<string, number>; card_terminal_total?: string;
  card_batch_number?: string; card_reference?: string; card_notes?: string;
  transfers_verified?: boolean; transfer_notes?: string; notes?: string;
};
export type CashRegisterCloseResponse = {
  success: true; idempotent: boolean; operationUuid: string; operationType: 'close';
  registerId: string | number; closedAt: string;
  expectedCash: string; countedCash: string; difference: string;
};

export function moneyCents(value: string): number {
  if (!CLOSE_MONEY.test(value)) throw new Error('Importe inválido');
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function centsMoney(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new Error('Importe inválido');
  const absolute = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}
export function denominationTotal(quantities: Record<string, number>): string {
  return centsMoney(Object.entries(quantities).reduce((sum, [denomination, quantity]) => {
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) throw new Error('Cantidad inválida');
    return sum + moneyCents(denomination) * quantity;
  }, 0));
}
export function validCloseRequest(value: unknown): value is CashRegisterCloseRequest {
  if (!isRecord(value) || typeof value.operation_uuid !== 'string' || !UUID_V4.test(value.operation_uuid)
    || !/^[1-9]\d*$/.test(String(value.register_id)) || typeof value.counted_cash !== 'string') return false;
  const allowed = ['operation_uuid', 'register_id', ...closeMoneyFields, 'counted_denominations', 'card_batch_number', 'card_reference', 'card_notes', 'transfers_verified', 'transfer_notes', 'notes'];
  if (Object.keys(value).some(key => !allowed.includes(key))) return false;
  for (const field of closeMoneyFields) if (value[field] !== undefined && (typeof value[field] !== 'string' || !CLOSE_MONEY.test(value[field]))) return false;
  for (const field of ['card_batch_number', 'card_reference', 'card_notes', 'transfer_notes', 'notes']) {
    if (value[field] !== undefined && (typeof value[field] !== 'string' || value[field].length > (['card_batch_number', 'card_reference'].includes(field) ? 191 : 4000))) return false;
  }
  if (value.transfers_verified !== undefined && typeof value.transfers_verified !== 'boolean') return false;
  if (value.counted_denominations !== undefined) {
    if (!isRecord(value.counted_denominations) || Array.isArray(value.counted_denominations) || Object.keys(value.counted_denominations).length > 30) return false;
    try { denominationTotal(value.counted_denominations as Record<string, number>); } catch { return false; }
  }
  return true;
}
export function validCloseResponse(value: unknown, request: CashRegisterCloseRequest): value is CashRegisterCloseResponse {
  return isRecord(value) && value.success === true && typeof value.idempotent === 'boolean'
    && value.operationUuid === request.operation_uuid && value.operationType === 'close'
    && String(value.registerId) === String(request.register_id) && typeof value.closedAt === 'string' && Number.isFinite(Date.parse(value.closedAt))
    && ['expectedCash', 'countedCash', 'difference'].every(key => typeof value[key] === 'string' && /^-?\d+\.\d{2}$/.test(value[key] as string));
}
export function parseCloseResponse(value: unknown, request: CashRegisterCloseRequest): CashRegisterCloseResponse {
  if (!isRecord(value) || !isRecord(value.operation) || !isRecord(value.register) || !isRecord(value.summary) || value.register.status !== 'closed') throw new CashRegisterOperationError('uncertain', 'invalid_response');
  const decimal = (input: unknown) => typeof input === 'number' && Number.isFinite(input) ? input.toFixed(2) : input;
  const result = {
    success: value.success, idempotent: value.idempotent, operationUuid: value.operation.operation_uuid, operationType: value.operation.operation_type,
    registerId: value.register.id, closedAt: value.register.closed_at,
    expectedCash: decimal(value.summary.expected_cash), countedCash: decimal(value.summary.counted_cash), difference: decimal(value.summary.cash_difference),
  };
  if (!validCloseResponse(result, request)) throw new CashRegisterOperationError('uncertain', 'invalid_response');
  return result;
}
export async function closeCashRegister({ baseUrl, accessToken, request }: { baseUrl: string; accessToken: string; request: CashRegisterCloseRequest }): Promise<CashRegisterCloseResponse> {
  if (!validCloseRequest(request)) throw new CashRegisterOperationError('business_error', 'validation_error');
  try {
    const response = await apiClient.post<unknown>(`${baseUrl.replace(/\/$/, '')}/api/mobile/cash-register/close`, request, { token: accessToken, authenticated: true });
    return parseCloseResponse(response, request);
  } catch (error) {
    if (error instanceof CashRegisterOperationError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new CashRegisterOperationError('uncertain', 'network_error');
  }
}
