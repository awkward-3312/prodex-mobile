import { apiClient } from '../api/apiClient';
import { ApiError } from '../api/apiError';
import type { SalePreflightRequest } from '../../types/mobilePosSalePreflight';
import type { SaleSubmissionRequest, SaleSubmissionResponse } from '../../types/mobileSaleSubmission';

export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
const id = (value: unknown): value is string | number => typeof value === 'number' ? Number.isSafeInteger(value) && value > 0 : typeof value === 'string' && /^[1-9]\d*$/.test(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export type SubmissionFailureKind = 'uncertain' | 'business_error' | 'session_expired';
export class SaleSubmissionError extends Error {
  constructor(public kind: SubmissionFailureKind, public code: string) {
    super(saleSubmissionMessage(code));
    this.name = 'SaleSubmissionError';
  }
}

export function saleSubmissionMessage(code: string): string {
  const messages: Record<string, string> = {
    insufficient_stock: 'El stock cambió antes de confirmar la venta. Revisa el carrito e inténtalo nuevamente.',
    invalid_client: 'Selecciona un cliente válido antes de confirmar.',
    invalid_quantity: 'Revisa las cantidades del carrito.',
    invalid_payment_method: 'Selecciona un método de pago válido.',
    inactive_payment_method: 'El método de pago ya no está disponible. Selecciona otro.',
    unsupported_payment_method: 'Este método de pago no está disponible en móvil.',
    invalid_account: 'Selecciona una cuenta válida para el pago.',
    payment_total_invalid: 'Revisa los montos de pago y vuelve a validar la venta.',
    invalid_operational_context: 'La sucursal, ubicación o caja no está lista para vender.',
    operational_context_incomplete: 'La sucursal, ubicación o caja no está lista para vender.',
    inventory_not_ready: 'El inventario no está listo para registrar esta venta.',
    forbidden: 'No tienes permiso para registrar esta venta.',
    fiscal_error: 'No se pudo emitir el documento fiscal. Revisa la configuración fiscal con tu administrador.',
    sar_error: 'No se pudo emitir el documento fiscal. Revisa la configuración fiscal con tu administrador.',
    sale_failed: 'No se pudo registrar la venta. Revisa el carrito, los pagos y la configuración fiscal.',
    validation_error: 'Revisa los datos de la venta y vuelve a validarla.',
    unsupported_product_type: 'Un producto no está disponible para venta móvil.',
    serial_selection_required: 'Un producto requiere seleccionar su serie desde el POS web.',
    batch_selection_required: 'Un producto requiere seleccionar su lote desde el POS web.',
    combo_not_supported: 'Los combos no están disponibles para venta móvil.',
    idempotency_conflict: 'Esta confirmación está asociada a otra solicitud. Revisa el historial antes de continuar.',
    session_expired: 'Tu sesión expiró. Inicia sesión con la misma cuenta para revisar esta confirmación.',
    storage_error: 'No pudimos guardar la confirmación en este dispositivo. Reintenta antes de continuar.',
    stale_preflight: 'Los datos cambiaron. Revisa la venta nuevamente antes de confirmarla.',
  };
  return messages[code] ?? 'No pudimos confirmar la respuesta. Puedes reintentar de forma segura.';
}

/** Whitelist intent fields; never forward client prices, tax, stock or fiscal fields. */
export function buildSaleSubmissionRequest(uuid: string, intent: SalePreflightRequest): SaleSubmissionRequest {
  if (!UUID_V4.test(uuid) || !id(intent.client_id) || !intent.lines.length || intent.lines.length > 100 || !intent.payment_intent.length || intent.payment_intent.length > 20) {
    throw new SaleSubmissionError('business_error', 'validation_error');
  }
  const lines = intent.lines.map(line => {
    if (!id(line.product_id) || (line.product_variant_id != null && !id(line.product_variant_id)) || (typeof line.quantity !== 'string' || !/^\d+(\.\d{1,3})?$/.test(line.quantity)) || !/[1-9]/.test(line.quantity)) throw new SaleSubmissionError('business_error', 'invalid_quantity');
    return { product_id: line.product_id, product_variant_id: line.product_variant_id ?? null, quantity: line.quantity };
  });
  const payments = intent.payment_intent.map(payment => {
    if (!id(payment.payment_method_id) || (typeof payment.amount !== 'string' || !/^\d+(\.\d{1,2})?$/.test(payment.amount)) || (payment.account_id != null && !id(payment.account_id))) throw new SaleSubmissionError('business_error', 'payment_total_invalid');
    return { payment_method_id: payment.payment_method_id, amount: payment.amount, ...(payment.account_id !== undefined ? { account_id: payment.account_id } : {}) };
  });
  return { sale_uuid: uuid, client_id: intent.client_id, lines, payments };
}

export function parseSaleSubmissionResponse(payload: unknown, expectedUuid: string): SaleSubmissionResponse {
  const data = record(payload) && record(payload.data) ? payload.data : payload;
  const sale = record(data) && record(data.sale) ? data.sale : null;
  if (!record(data) || data.success !== true || typeof data.idempotent !== 'boolean' || !sale || !id(sale.id) || !text(sale.ref) || sale.sale_uuid !== expectedUuid || !text(sale.grand_total) || !/^\d+\.\d{2}$/.test(sale.grand_total) || !['paid', 'partial', 'unpaid'].includes(String(sale.payment_status)) || (sale.fiscal_number != null && !text(sale.fiscal_number)) || (sale.fiscal_status != null && !text(sale.fiscal_status))) {
    throw new SaleSubmissionError('uncertain', 'invalid_response');
  }
  return { success: true, idempotent: data.idempotent, sale: { id: sale.id, ref: sale.ref, sale_uuid: expectedUuid, grand_total: sale.grand_total, payment_status: sale.payment_status as 'paid' | 'partial' | 'unpaid', fiscal_number: sale.fiscal_number as string | null ?? null, fiscal_status: sale.fiscal_status as string | null ?? null } };
}

export async function submitMobileSale({ baseUrl, accessToken, request }: { baseUrl: string; accessToken: string; request: SaleSubmissionRequest }): Promise<SaleSubmissionResponse> {
  try {
    // Deliberately no automatic retry and no unmount signal: a POST may already have committed.
    const response = await apiClient.post<unknown>(`${baseUrl.replace(/\/$/, '')}/api/mobile/sales`, request, { token: accessToken, authenticated: true });
    return parseSaleSubmissionResponse(response, request.sale_uuid);
  } catch (error) {
    if (error instanceof SaleSubmissionError) throw error;
    if (error instanceof ApiError) {
      if (error.status === 401 || error.code === 'token_idle_timeout') throw new SaleSubmissionError('session_expired', 'session_expired');
      if (error.status === 403) throw new SaleSubmissionError('business_error', 'forbidden');
      if (error.status === 422) throw new SaleSubmissionError('business_error', error.code ?? 'validation_error');
      if (error.status === 409) throw new SaleSubmissionError('uncertain', 'idempotency_conflict');
      throw new SaleSubmissionError('uncertain', error.code ?? 'server_error');
    }
    throw new SaleSubmissionError('uncertain', 'network_error');
  }
}
