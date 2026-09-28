import { buildSaleSubmissionRequest, parseSaleSubmissionResponse, SaleSubmissionError, saleSubmissionMessage, submitMobileSale, UUID_V4 } from '../src/services/sales/mobileSaleSubmissionService';
import type { SalePreflightRequest } from '../src/types/mobilePosSalePreflight';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const intent: SalePreflightRequest = { client_id: 3, lines: [{ product_id: 4, product_variant_id: null, quantity: '0.500' }], payment_intent: [{ payment_method_id: 7, amount: '115.00', account_id: 2 }] };
const sale = { id: 12, ref: 'SL_0012', sale_uuid: uuid, grand_total: '115.00', payment_status: 'paid', fiscal_number: null, fiscal_status: null };
const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as Response;
const request = buildSaleSubmissionRequest(uuid, intent);
const submit = () => submitMobileSale({ baseUrl: 'https://tenant.example/', accessToken: 'test-token', request });
afterEach(() => jest.restoreAllMocks());

it('whitelists only intention and preserves exact money and weighted quantity strings', () => {
  const contaminated = { ...intent, total: '0.01', branch_id: 9, lines: [{ ...intent.lines[0], price: '0.01', stock: 300 }], payment_intent: [{ ...intent.payment_intent[0], card_token: 'forbidden' }] };
  expect(buildSaleSubmissionRequest(uuid, contaminated)).toEqual({ sale_uuid: uuid, client_id: 3, lines: [{ product_id: 4, product_variant_id: null, quantity: '0.500' }], payments: [{ payment_method_id: 7, amount: '115.00', account_id: 2 }] });
});
it('sends the real POST contract once, preserving mixed payment intent', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ data: { success: true, idempotent: false, sale } }));
  expect((await submit()).sale.grand_total).toBe('115.00');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith('https://tenant.example/api/mobile/sales', expect.objectContaining({ method: 'POST', body: JSON.stringify(request), headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }));
  const mixed = buildSaleSubmissionRequest(uuid, { ...intent, payment_intent: [intent.payment_intent[0], { payment_method_id: 9, amount: '35.25' }] });
  expect(mixed.payments[1]).toEqual({ payment_method_id: 9, amount: '35.25' });
});
it.each([false, true])('accepts confirmed success with idempotent=%s', idempotent => {
  expect(parseSaleSubmissionResponse({ data: { success: true, idempotent, sale } }, uuid)).toEqual({ success: true, idempotent, sale });
});
it('keeps authoritative money beyond JS safe integer precision as a string', () => {
  expect(parseSaleSubmissionResponse({ success: true, idempotent: false, sale: { ...sale, grand_total: '9007199254740993.01' } }, uuid).sale.grand_total).toBe('9007199254740993.01');
});
it.each([
  null, { success: false }, { success: true, idempotent: true },
  { success: true, idempotent: false, sale: { ...sale, sale_uuid: '223e4567-e89b-42d3-a456-426614174000' } },
  { success: true, idempotent: false, sale: { ...sale, grand_total: 115 } },
  { success: true, idempotent: false, sale: { ...sale, ref: '' } },
  { success: true, idempotent: false, sale: { ...sale, payment_status: 'unknown' } },
])('rejects malformed/unrelated confirmation as uncertain: %j', payload => {
  expect(() => parseSaleSubmissionResponse(payload, uuid)).toThrow(expect.objectContaining({ kind: 'uncertain', code: 'invalid_response' }));
});
it.each([
  [422, 'insufficient_stock', 'business_error'], [422, 'validation_error', 'business_error'],
  [422, 'fiscal_error', 'business_error'], [422, 'invalid_account', 'business_error'],
  [403, 'forbidden', 'business_error'], [401, 'unauthenticated', 'session_expired'],
  [409, 'cash_register_not_open', 'business_error'], [409, 'conflict', 'uncertain'], [500, 'server_error', 'uncertain'], [429, 'rate_limited', 'uncertain'],
])('maps HTTP %s %s without exposing raw Laravel messages', async (status, code, kind) => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ error: { code, message: 'SQLSTATE secret raw exception' } }, Number(status)));
  await expect(submit()).rejects.toMatchObject({ kind });
  try { await submit(); } catch (error) { expect((error as Error).message).not.toContain('SQLSTATE'); }
});
it('preserves fiscal references supplied by the server', () => {
  expect(parseSaleSubmissionResponse({ success: true, idempotent: false, sale: { ...sale, fiscal_number: '000-001-01-00000001', fiscal_status: 'issued' } }, uuid).sale.fiscal_number).toBe('000-001-01-00000001');
});
it.each(['invalid_payment_method', 'inactive_payment_method', 'invalid_client', 'invalid_operational_context', 'inventory_not_ready', 'sale_failed', 'fiscal_error'])('provides a clear business error for %s', code => {
  expect(saleSubmissionMessage(code)).not.toContain(code);
  expect(saleSubmissionMessage(code)).not.toContain('reintentar de forma segura');
});
it('network failure is uncertain, without automatic retries', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
  await expect(submit()).rejects.toMatchObject({ kind: 'uncertain', code: 'network_error' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('an aborted POST is uncertain', async () => {
  jest.spyOn(globalThis, 'fetch').mockRejectedValue({ name: 'AbortError' });
  await expect(submit()).rejects.toMatchObject({ kind: 'uncertain', code: 'timeout' });
});
it.each(['0', '0.000', '-1', '0.0001', 'NaN'])('blocks invalid quantity %s', quantity => {
  expect(() => buildSaleSubmissionRequest(uuid, { ...intent, lines: [{ ...intent.lines[0], quantity }] })).toThrow(SaleSubmissionError);
});
it('requires UUID v4 and valid exact-decimal amounts', () => {
  expect(UUID_V4.test('223e4567-e89b-42d3-a456-426614174000')).toBe(true);
  expect(() => buildSaleSubmissionRequest('invalid', intent)).toThrow(SaleSubmissionError);
  expect(() => buildSaleSubmissionRequest(uuid, { ...intent, payment_intent: [{ payment_method_id: 1, amount: '10.999' }] })).toThrow(SaleSubmissionError);
});

it('register guard rejection keeps its specific opening instruction', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ error: { code: 'cash_register_not_open' } }, 409));
  await expect(submit()).rejects.toMatchObject({ kind: 'business_error', code: 'cash_register_not_open', message: 'Necesitas abrir caja antes de registrar una venta.' });
});

it.each([
  ['La facturación SAR no está habilitada para este negocio.', 'fiscal_disabled'],
  ['No existe una autorización SAR activa para la serie 000-001-01. Registra y activa un CAI.', 'fiscal_authorization_missing'],
  ['El CAI de la serie 000-001-01 venció y no hay una autorización siguiente preparada. Registra la próxima autorización SAR de esta serie.', 'fiscal_authorization_expired'],
  ['El rango del CAI de la serie 000-001-01 está agotado y no hay una autorización siguiente preparada. Registra la próxima autorización SAR de esta serie.', 'fiscal_range_exhausted'],
  ['El producto "Café" no tiene clasificación fiscal SAR. Configúralo como gravado, exento, exonerado o tasa cero antes de facturar.', 'fiscal_product_unclassified'],
  ['Para una venta de L 10,000 o más debes registrar el RTN o documento de identificación del cliente.', 'fiscal_customer_identification_required'],
])('preserves the known legacy business reason without exposing the raw response: %s', async (message, code) => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ error: { code: 'sale_failed', message } }, 422));
  await expect(submit()).rejects.toMatchObject({ kind: 'business_error', code, diagnostic: { httpStatus: 422, serverCode: 'sale_failed' } });
});

it('prefers a recognized POS error code nested inside the legacy adapter', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ error: { code: 'sale_failed', message: 'private', details: { pos_response: { code: 'invalid_account' } } } }, 422));
  await expect(submit()).rejects.toMatchObject({ kind: 'business_error', code: 'invalid_account', message: saleSubmissionMessage('invalid_account') });
});

it('keeps an unknown exception private and does not misdiagnose it as a fiscal failure', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ error: { code: 'sale_failed', message: 'SQLSTATE fiscal CAI secret /server/path' } }, 422));
  await expect(submit()).rejects.toMatchObject({ kind: 'business_error', code: 'sale_failed', message: saleSubmissionMessage('sale_failed') });
});

it('does not describe an unknown definitive 422 rejection as an uncertain confirmation', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ error: { code: 'new_business_rule', message: 'Private exception details' } }, 422));
  await expect(submit()).rejects.toMatchObject({ kind: 'business_error', code: 'new_business_rule', message: saleSubmissionMessage('sale_failed') });
});
