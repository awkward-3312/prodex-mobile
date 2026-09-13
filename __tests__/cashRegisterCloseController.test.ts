import { CashRegisterOperationController } from '../src/services/cashRegister/cashRegisterOperationController';
import { CashRegisterOperationError } from '../src/services/cashRegister/mobileCashRegisterOperationService';
import { centsMoney, denominationTotal, moneyCents, reconcileDenominations, validCloseRequest, validCloseResponse, parseCloseResponse, type CashRegisterCloseRequest, type CashRegisterCloseResponse } from '../src/services/cashRegister/mobileCashRegisterCloseService';

const request: CashRegisterCloseRequest = { operation_uuid: '123e4567-e89b-42d3-a456-426614174000', register_id: 6, counted_cash: '1020.00', counted_denominations: { '500': 2, '200': 0, '100': 0, '50': 0, '20': 1, '10': 0, '5': 0, '2': 0, '1': 0, '0.50': 0, '0.20': 0, '0.10': 0, '0.05': 0 }, notes: 'Revisado' };
const response: CashRegisterCloseResponse = { success: true, idempotent: false, operationUuid: request.operation_uuid, operationType: 'close', registerId: 6, closedAt: '2026-09-13T12:00:00Z', expectedCash: '1020.00', countedCash: '1020.00', difference: '0.00' };
function fixture(raw: string | null = null) {
  let saved = raw;
  const storage = { read: jest.fn(async () => saved), write: jest.fn(async (value: string) => { saved = value; }), remove: jest.fn(async () => { saved = null; }) };
  const send = jest.fn(async (_request: CashRegisterCloseRequest, _token: string) => response);
  const onSuccess = jest.fn();
  const deps = { owner: 'tenant|user', kind: 'close', storage, send, onSuccess, validateRequest: validCloseRequest, validateResponse: validCloseResponse };
  return { controller: new CashRegisterOperationController<CashRegisterCloseRequest, CashRegisterCloseResponse>(deps), storage, send, onSuccess, saved: () => saved };
}
it('uses integer cents for denomination totals and signed differences', () => {
  expect(denominationTotal({ '500': 2, '0.20': 3, '0.05': 1 })).toBe('1000.65');
  expect(centsMoney(moneyCents('1000.65') - moneyCents('1020.00'))).toBe('-19.35');
  expect(centsMoney(moneyCents('1025') - moneyCents('1020.00'))).toBe('5.00');
});
it.each(['1e3', '1.234', '-1', '10000000000', 'NaN'])('rejects unsafe money %s', amount => expect(validCloseRequest({ ...request, counted_cash: amount })).toBe(false));
it('rejects foreign identity, malformed denomination quantity and invalid UUID', () => {
  expect(validCloseRequest({ ...request, tenant_id: 'x' })).toBe(false);
  expect(validCloseRequest({ ...request, counted_denominations: { '5': 1.5 } })).toBe(false);
  expect(validCloseRequest({ ...request, operation_uuid: 'bad' })).toBe(false);
});
it('parses only a matching confirmed closed session', () => {
  const payload = { success: true, idempotent: true, operation: { operation_uuid: request.operation_uuid, operation_type: 'close' }, register: { id: 6, status: 'closed', closed_at: response.closedAt }, summary: { expected_cash: 1020, counted_cash: 1020, cash_difference: 0 } };
  expect(parseCloseResponse(payload, request)).toEqual({ ...response, idempotent: true });
  expect(() => parseCloseResponse({ ...payload, register: { ...payload.register, id: 7 } }, request)).toThrow();
  expect(() => parseCloseResponse({ ...payload, register: { ...payload.register, status: 'open' } }, request)).toThrow();
});
it('persists before POST, freezes input and blocks double submit', async () => {
  const f = fixture(); await f.controller.restore();
  f.send.mockImplementation(async sent => { expect(JSON.parse(f.saved()!).request).toEqual(sent); return response; });
  const mutable = { ...request };
  const pending = f.controller.start(() => mutable, 'token');
  mutable.counted_cash = '0.00';
  await f.controller.start(() => request, 'token'); await pending;
  expect(f.send).toHaveBeenCalledTimes(1);
  expect(f.send.mock.calls[0][0].counted_cash).toBe('1020.00');
});
it('does not POST when storage fails', async () => {
  const f = fixture(); await f.controller.restore();
  f.storage.write.mockRejectedValueOnce(new Error('disk'));
  await f.controller.start(() => request, 'token');
  expect(f.send).not.toHaveBeenCalled();
  await f.controller.retry('token');
  expect(f.send.mock.calls[0][0]).toEqual(request);
});
it.each(['network_error', 'timeout', 'invalid_response'])('preserves exact payload after %s and retries explicitly', async code => {
  const f = fixture(); await f.controller.restore();
  f.send.mockRejectedValueOnce(new CashRegisterOperationError('uncertain', code));
  await f.controller.start(() => request, 'token');
  const restored = fixture(f.saved()); await restored.controller.restore();
  expect(restored.send).not.toHaveBeenCalled();
  await restored.controller.retry('new-token');
  expect(restored.send).toHaveBeenCalledWith(request, 'new-token');
});
it('preserves 401 and never auto-submits after relogin', async () => {
  const f = fixture(); await f.controller.restore();
  f.send.mockRejectedValueOnce(new CashRegisterOperationError('session_expired', 'session_expired'));
  await f.controller.start(() => request, 'old-token');
  expect(f.controller.getSnapshot().status).toBe('session_expired');
  const restored = fixture(f.saved()); await restored.controller.restore();
  expect(restored.controller.getSnapshot().status).toBe('uncertain');
  expect(restored.send).not.toHaveBeenCalled();
});
it('cleans up idempotent success exactly once', async () => {
  const f = fixture(); await f.controller.restore();
  f.send.mockResolvedValue({ ...response, idempotent: true });
  await f.controller.start(() => request, 'token');
  expect(await f.controller.finish()).toBe(true);
  expect(await f.controller.finish()).toBe(false);
  expect(f.storage.remove).toHaveBeenCalledTimes(1);
  expect(f.onSuccess).toHaveBeenCalledTimes(1);
});
it('cleanup failure remains successful and cannot create another logical close', async () => {
  const f = fixture(); await f.controller.restore();
  await f.controller.start(() => request, 'token');
  f.storage.remove.mockRejectedValueOnce(new Error('disk'));
  expect(await f.controller.finish()).toBe(false);
  await f.controller.start(() => ({ ...request, operation_uuid: '123e4567-e89b-42d3-a456-426614174001' }), 'token');
  expect(f.send).toHaveBeenCalledTimes(1);
  const restored = fixture(f.saved()); await restored.controller.restore();
  expect(restored.controller.getSnapshot().status).toBe('success');
  expect(restored.send).not.toHaveBeenCalled();
});
it('failed confirmed-response storage recovers same UUID from pending attempt', async () => {
  const f = fixture(); await f.controller.restore();
  f.storage.write.mockImplementationOnce(async () => {}).mockRejectedValueOnce(new Error('disk'));
  await f.controller.start(() => request, 'token');
  expect(f.controller.getSnapshot().status).toBe('success');
  await f.controller.start(() => request, 'token');
  expect(f.send).toHaveBeenCalledTimes(1);
});
it('definitive validation error permits correction with a new UUID', async () => {
  const f = fixture(); await f.controller.restore();
  f.send.mockRejectedValueOnce(new CashRegisterOperationError('business_error', 'validation_error'));
  await f.controller.start(() => request, 'token');
  expect(f.saved()).toBeNull();
  f.controller.reset();
  await f.controller.start(() => ({ ...request, operation_uuid: '123e4567-e89b-42d3-a456-426614174001' }), 'token');
  expect(f.send).toHaveBeenCalledTimes(2);
});
it.each(['broken', JSON.stringify({ version: 1, owner: 'other', kind: 'close', request }), JSON.stringify({ version: 1, owner: 'tenant|user', kind: 'close', request: {} }), JSON.stringify({ version: 1, owner: 'tenant|user', kind: 'close', request, response: {} })])('fails closed for corrupt/mismatched storage', async raw => {
  const f = fixture(raw); await f.controller.restore();
  await f.controller.retry('token');
  expect(f.controller.isLocked()).toBe(true);
  expect(f.send).not.toHaveBeenCalled();
});

it('requires declared amount and matching breakdown while checking all configured keys for review', () => {
  const config = { currencyCode: 'HNL', bills: ['500', '20'], coins: ['0.20', '0.05'] };
  expect(validCloseRequest({ ...request, counted_denominations: undefined })).toBe(false);
  expect(validCloseRequest({ ...request, counted_denominations: { '500': 2 } })).toBe(false);
  expect(reconcileDenominations('1020', { '500': 2, '20': 1 }, config).matches).toBe(false);
  expect(reconcileDenominations('1020', { '500': 2, '20': 1, '0.20': 0, '0.05': 0 }, config).matches).toBe(true);
  expect(reconcileDenominations('0', { '500': 0, '20': 0, '0.20': 0, '0.05': 0, '3': 0 }, config).matches).toBe(false);
  expect(reconcileDenominations('0.65', { '500': 0, '20': 0, '0.20': 3, '0.05': 1 }, config)).toMatchObject({ matches: true, total: '0.65', delta: 0 });
  expect(reconcileDenominations('0', {}, undefined).matches).toBe(false);
});
it('denomination mismatch is a correctable business error with a clear message', () => {
  const error = new CashRegisterOperationError('business_error', 'denomination_total_mismatch');
  expect(error.message).toBe('El desglose por denominaciones debe coincidir con el efectivo contado.');
});
