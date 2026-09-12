import { apiClient } from '../api/apiClient';
import { ApiError } from '../api/apiError';
import { isRecord, parseCashRegisterEntity, parseSummary } from './mobileCashRegisterService';
import type { CashRegisterCurrent, CashRegisterSummary } from './mobileCashRegisterService';

export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY = /^\d+(\.\d{1,2})?$/;

export type CashRegisterOpenRequest = { operation_uuid: string; opening_balance: string; notes: string | null };
export type CashRegisterMovementRequest = { operation_uuid: string; register_id: string | number; type: 'in' | 'out'; amount: string; notes: string };

export type CashRegisterOperationResponse = {
  success: true;
  idempotent: boolean;
  operationUuid: string;
  operationType: string;
  register: CashRegisterCurrent;
  summary: CashRegisterSummary;
};

export type CashRegisterOperationFailureKind = 'uncertain' | 'business_error' | 'session_expired';

export class CashRegisterOperationError extends Error {
  constructor(public kind: CashRegisterOperationFailureKind, public code: string) {
    super(cashRegisterOperationMessage(code));
    this.name = 'CashRegisterOperationError';
  }
}

export function cashRegisterOperationMessage(code: string): string {
  const messages: Record<string, string> = {
    register_already_open: 'Ya tienes una caja abierta.',
    register_closed: 'Esta caja ya está cerrada.',
    register_not_found: 'No encontramos esa caja.',
    forbidden: 'No puedes operar esta caja.',
    idempotency_conflict: 'Esta operación ya fue enviada con datos diferentes. Revisa antes de continuar.',
    validation_error: 'Revisa los datos ingresados.',
    session_expired: 'Tu sesión expiró. Inicia sesión nuevamente.',
    storage_error: 'No pudimos guardar la operación en este dispositivo. Reintenta antes de continuar.',
    server_error: 'PRODEX no está disponible en este momento.',
    network_error: 'No pudimos conectar con PRODEX.',
    timeout: 'La solicitud tardó demasiado. Puedes reintentar de forma segura.',
    invalid_response: 'No pudimos confirmar la respuesta. Puedes reintentar de forma segura.',
  };
  return messages[code] ?? 'No pudimos confirmar la respuesta. Puedes reintentar de forma segura.';
}

export function buildCashRegisterOpenRequest(uuid: string, openingBalance: string, notes: string): CashRegisterOpenRequest {
  if (!UUID_V4.test(uuid) || !MONEY.test(openingBalance)) throw new CashRegisterOperationError('business_error', 'validation_error');
  const trimmedNotes = notes.trim();
  return { operation_uuid: uuid, opening_balance: openingBalance, notes: trimmedNotes.length > 0 ? trimmedNotes : null };
}

export function buildCashRegisterMovementRequest(uuid: string, registerId: string | number, type: 'in' | 'out', amount: string, notes: string): CashRegisterMovementRequest {
  const trimmedNotes = notes.trim();
  if (!UUID_V4.test(uuid) || !MONEY.test(amount) || Number(amount) <= 0 || trimmedNotes.length < 3) {
    throw new CashRegisterOperationError('business_error', 'validation_error');
  }
  return { operation_uuid: uuid, register_id: registerId, type, amount, notes: trimmedNotes };
}

export function parseCashRegisterOperationResponse(payload: unknown, expectedUuid: string): CashRegisterOperationResponse {
  if (
    !isRecord(payload) || payload.success !== true || typeof payload.idempotent !== 'boolean'
    || !isRecord(payload.operation) || payload.operation.operation_uuid !== expectedUuid || typeof payload.operation.operation_type !== 'string'
  ) {
    throw new CashRegisterOperationError('uncertain', 'invalid_response');
  }
  const register = parseCashRegisterEntity(payload.register);
  const summary = parseSummary(payload.summary);
  if (!register || !summary) throw new CashRegisterOperationError('uncertain', 'invalid_response');

  return {
    success: true,
    idempotent: payload.idempotent,
    operationUuid: expectedUuid,
    operationType: payload.operation.operation_type,
    register,
    summary,
  };
}

function mapApiError(error: ApiError): CashRegisterOperationError {
  if (error.status === 401 || error.code === 'token_idle_timeout') return new CashRegisterOperationError('session_expired', 'session_expired');
  if (error.status === 403) return new CashRegisterOperationError('business_error', error.code ?? 'forbidden');
  if (error.status === 422) return new CashRegisterOperationError('business_error', error.code ?? 'validation_error');
  if (error.status === 409) {
    // register_already_open / register_closed are definitive business states, not
    // uncertain outcomes: the caller must refresh, never blindly retry the same POST.
    if (error.code === 'idempotency_conflict') return new CashRegisterOperationError('business_error', 'idempotency_conflict');
    return new CashRegisterOperationError('business_error', error.code ?? 'register_already_open');
  }
  if (error.code === 'timeout') return new CashRegisterOperationError('uncertain', 'timeout');
  if (error.code === 'network_error') return new CashRegisterOperationError('uncertain', 'network_error');
  return new CashRegisterOperationError('uncertain', error.code ?? 'server_error');
}

export async function openCashRegister({ baseUrl, accessToken, request }: { baseUrl: string; accessToken: string; request: CashRegisterOpenRequest }): Promise<CashRegisterOperationResponse> {
  try {
    // Deliberately no automatic retry and no unmount signal: a POST may already have committed.
    const response = await apiClient.post<unknown>(`${baseUrl.replace(/\/$/, '')}/api/mobile/cash-register/open`, request, { token: accessToken, authenticated: true });
    return parseCashRegisterOperationResponse(response, request.operation_uuid);
  } catch (error) {
    if (error instanceof CashRegisterOperationError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new CashRegisterOperationError('uncertain', 'network_error');
  }
}

export async function submitCashRegisterMovement({ baseUrl, accessToken, request }: { baseUrl: string; accessToken: string; request: CashRegisterMovementRequest }): Promise<CashRegisterOperationResponse> {
  try {
    const response = await apiClient.post<unknown>(`${baseUrl.replace(/\/$/, '')}/api/mobile/cash-register/movements`, request, { token: accessToken, authenticated: true });
    return parseCashRegisterOperationResponse(response, request.operation_uuid);
  } catch (error) {
    if (error instanceof CashRegisterOperationError) throw error;
    if (error instanceof ApiError) throw mapApiError(error);
    throw new CashRegisterOperationError('uncertain', 'network_error');
  }
}
