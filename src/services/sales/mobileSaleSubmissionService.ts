import { apiClient } from '../api/apiClient';
import { ApiError, isAuthInvalidError } from '../api/apiError';
import type { SalePreflightRequest } from '../../types/mobilePosSalePreflight';
import type { SaleSubmissionRequest, SaleSubmissionResponse } from '../../types/mobileSaleSubmission';

export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
const id = (value: unknown): value is string | number => typeof value === 'number' ? Number.isSafeInteger(value) && value > 0 : typeof value === 'string' && /^[1-9]\d*$/.test(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export type SubmissionFailureKind = 'uncertain' | 'business_error' | 'session_expired';
export class SaleSubmissionError extends Error {
  constructor(public kind: SubmissionFailureKind, public code: string, public diagnostic?: { httpStatus: number; serverCode?: string }) {
    super(saleSubmissionMessage(code, kind));
    this.name = 'SaleSubmissionError';
  }
}

export function saleSubmissionMessage(code: string, kind: SubmissionFailureKind = 'uncertain'): string {
  const messages: Record<string, string> = {
    cash_register_not_open: 'Necesitas abrir caja antes de registrar una venta.',
    register_already_closed: 'Esta caja ya está cerrada.',
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
    sale_failed: 'PRODEX rechazó la solicitud sin indicar un motivo reconocido. Solicita a tu administrador revisar el intento de venta.',
    fiscal_disabled: 'La facturación SAR no está habilitada para este negocio. Contacta a tu administrador.',
    fiscal_authorization_missing: 'La serie fiscal no tiene una autorización SAR activa. Solicita a tu administrador registrar y activar un CAI.',
    fiscal_authorization_expired: 'El CAI venció y no hay una autorización siguiente preparada. Contacta a tu administrador.',
    fiscal_range_exhausted: 'El rango del CAI está agotado y no hay una autorización siguiente preparada. Contacta a tu administrador.',
    fiscal_product_unclassified: 'Un producto del carrito no tiene clasificación fiscal SAR. Solicita a tu administrador configurarlo antes de facturar.',
    fiscal_customer_identification_required: 'Para una venta de L 10,000 o más, registra el RTN o documento de identificación del cliente.',
    validation_error: 'Revisa los datos de la venta y vuelve a validarla.',
    unsupported_product_type: 'Un producto no está disponible para venta móvil.',
    serial_selection_required: 'Un producto requiere seleccionar su serie desde el POS web.',
    batch_selection_required: 'Un producto requiere seleccionar su lote desde el POS web.',
    combo_not_supported: 'Los combos no están disponibles para venta móvil.',
    idempotency_conflict: 'Esta confirmación está asociada a otra solicitud. Revisa el historial antes de continuar.',
    session_expired: 'Tu sesión expiró. Inicia sesión con la misma cuenta para revisar esta confirmación.',
    storage_error: 'No pudimos guardar la confirmación en este dispositivo. Reintenta antes de continuar.',
    stale_preflight: 'Los datos cambiaron. Revisa la venta nuevamente antes de confirmarla.',
    offline: 'Sin conexión a internet. Conéctate y vuelve a intentarlo.',
  };
  return messages[code] ?? (kind === 'business_error' ? messages.sale_failed : 'No pudimos confirmar la respuesta. Puedes reintentar de forma segura.');
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

/** The legacy POS adapter wraps fiscal failures as sale_failed. Recognize only
 * known business messages; never display arbitrary exception/SQL text. Prefer
 * stable codes when the backend supplies one inside pos_response. */
function businessFailureCode(error: ApiError): string {
  const details = record(error.details) ? error.details : null;
  const posResponse = details && record(details.pos_response) ? details.pos_response : null;
  const nestedCode = posResponse && typeof posResponse.code === 'string' ? posResponse.code : null;
  const knownCodes = ['fiscal_error', 'sar_error', 'invalid_account', 'invalid_payment_method', 'inactive_payment_method', 'payment_total_invalid', 'insufficient_stock', 'invalid_client', 'invalid_operational_context', 'cash_register_not_open'];
  if (nestedCode && knownCodes.includes(nestedCode)) return nestedCode;
  if (error.code !== 'sale_failed') return error.code ?? 'validation_error';
  const message = error.message.trim();
  if (message === 'La facturación SAR no está habilitada para este negocio.') return 'fiscal_disabled';
  if (message === 'Para una venta de L 10,000 o más debes registrar el RTN o documento de identificación del cliente.') return 'fiscal_customer_identification_required';
  if (/^(?:No existe|No hay) una autorización SAR activa para la serie \d{3}-\d{3}-\d{2}\. Registra y activa un CAI\.$/.test(message)) return 'fiscal_authorization_missing';
  if (/^El CAI de la serie \d{3}-\d{3}-\d{2} venció y no hay una autorización siguiente preparada\. Registra la próxima autorización SAR de esta serie\.$/.test(message)) return 'fiscal_authorization_expired';
  if (/^El rango del CAI de la serie \d{3}-\d{3}-\d{2} está agotado y no hay una autorización siguiente preparada\. Registra la próxima autorización SAR de esta serie\.$/.test(message)) return 'fiscal_range_exhausted';
  if (/^El producto "[^"\r\n]{1,200}" no tiene clasificación fiscal SAR\. Configúralo como gravado, exento, exonerado o tasa cero antes de facturar\.$/.test(message)) return 'fiscal_product_unclassified';
  return 'sale_failed';
}

export async function submitMobileSale({ baseUrl, accessToken, request }: { baseUrl: string; accessToken: string; request: SaleSubmissionRequest }): Promise<SaleSubmissionResponse> {
  try {
    // Deliberately no automatic retry and no unmount signal: a POST may already have committed.
    const response = await apiClient.post<unknown>(`${baseUrl.replace(/\/$/, '')}/api/mobile/sales`, request, { token: accessToken, authenticated: true });
    return parseSaleSubmissionResponse(response, request.sale_uuid);
  } catch (error) {
    if (error instanceof SaleSubmissionError) throw error;
    if (error instanceof ApiError) {
      if (isAuthInvalidError(error)) throw new SaleSubmissionError('session_expired', 'session_expired');
      if (error.status === 403) throw new SaleSubmissionError('business_error', 'forbidden');
      if (error.status === 422) throw new SaleSubmissionError('business_error', businessFailureCode(error), { httpStatus: error.status, serverCode: error.code });
      if (error.status === 409 && error.code === 'cash_register_not_open') throw new SaleSubmissionError('business_error', 'cash_register_not_open');
      if (error.status === 409) throw new SaleSubmissionError('uncertain', 'idempotency_conflict');
      throw new SaleSubmissionError('uncertain', error.code ?? 'server_error');
    }
    throw new SaleSubmissionError('uncertain', 'network_error');
  }
}
