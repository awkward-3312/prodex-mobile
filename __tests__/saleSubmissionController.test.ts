import { SaleSubmissionController } from '../src/services/sales/saleSubmissionController';
import { SaleSubmissionError, UUID_V4 } from '../src/services/sales/mobileSaleSubmissionService';
import type { SaleSubmissionRequest } from '../src/types/mobileSaleSubmission';

const intent = { client_id: 3, lines: [{ product_id: 5, product_variant_id: null, quantity: '0.500' }], payment_intent: [{ payment_method_id: 7, amount: '30.00', account_id: 2 }] };
const options = { intent, currentKey: 'current', validatedKey: 'current', canSubmit: true, currency: { code: 'HNL', symbol: 'L.', price_decimals: 2 }, token: 'test-token' };
function success(request: SaleSubmissionRequest, idempotent = false) {
  return { success: true as const, idempotent, sale: { id: 5, ref: 'SL_005', sale_uuid: request.sale_uuid, grand_total: '30.00', payment_status: 'paid' as const, fiscal_number: null, fiscal_status: null } };
}
function fixture(raw: string | null = null) {
  let stored = raw;
  let cart = ['weighted product'];
  let sequence = 0;
  const uuid = jest.fn(() => `123e4567-e89b-42d3-a456-${String(++sequence).padStart(12, '0')}`);
  const storage = { read: jest.fn(async () => stored), write: jest.fn(async (value: string) => { stored = value; }), remove: jest.fn(async () => { stored = null; }) };
  const confirmed = jest.fn(() => { cart = []; });
  const send = jest.fn(async (request: SaleSubmissionRequest, _token: string) => success(request));
  const deps = { owner: 'tenant|user', uuid, storage, confirmed, send };
  return { controller: new SaleSubmissionController(deps), deps, cart: () => cart, stored: () => stored };
}
it('persists a UUID v4 once before POST and clears only after confirmation', async () => {
  const f = fixture(); await f.controller.restore();
  let resolve!: (value: ReturnType<typeof success>) => void;
  f.deps.send.mockImplementation(request => new Promise(r => { resolve = r; expect(JSON.parse(f.stored()!).request).toEqual(request); }));
  const task = f.controller.start(options); await Promise.resolve(); await Promise.resolve();
  expect(f.cart()).toHaveLength(1); expect(f.controller.getSnapshot().status).toBe('submitting');
  const request = f.deps.send.mock.calls[0][0]; expect(UUID_V4.test(request.sale_uuid)).toBe(true);
  resolve(success(request)); await task;
  expect(f.cart()).toEqual([]); expect(f.deps.confirmed).toHaveBeenCalledTimes(1); expect(f.deps.uuid).toHaveBeenCalledTimes(1);
});
it('blocks two taps even while the first storage write is pending', async () => {
  const f = fixture(); await f.controller.restore();
  await Promise.all([f.controller.start(options), f.controller.start(options)]);
  expect(f.deps.send).toHaveBeenCalledTimes(1); expect(f.deps.uuid).toHaveBeenCalledTimes(1);
});
it.each(['network_error', 'timeout', 'invalid_response', 'server_error'])('keeps cart, UUID and frozen payload on %s and retries idempotently', async code => {
  const f = fixture(); await f.controller.restore();
  f.deps.send.mockRejectedValueOnce(new SaleSubmissionError('uncertain', code)).mockImplementationOnce(async request => success(request, true));
  await f.controller.start(options);
  expect(f.cart()).toHaveLength(1); expect(f.controller.isLocked()).toBe(true);
  const original = JSON.stringify(f.deps.send.mock.calls[0][0]);
  await f.controller.start({ ...options, intent: { ...intent, client_id: 999 } });
  expect(f.deps.send).toHaveBeenCalledTimes(1);
  await f.controller.retry('renewed-token');
  expect(JSON.stringify(f.deps.send.mock.calls[1][0])).toBe(original);
  expect(f.deps.send.mock.calls[1][1]).toBe('renewed-token');
  expect(f.controller.getSnapshot().attempt?.response?.idempotent).toBe(true);
  expect(f.cart()).toEqual([]);
});
it('generates a new UUID only after successful sale is finished and a new checkout starts', async () => {
  const f = fixture(); await f.controller.restore(); await f.controller.start(options);
  await f.controller.start(options); expect(f.deps.send).toHaveBeenCalledTimes(1);
  expect(await f.controller.finish()).toBe(true); await f.controller.start(options);
  expect(f.deps.uuid).toHaveBeenCalledTimes(2);
  expect(f.deps.send.mock.calls[0][0].sale_uuid).not.toBe(f.deps.send.mock.calls[1][0].sale_uuid);
});
it.each(['insufficient_stock', 'validation_error', 'fiscal_error'])('definitive %s keeps cart and requires another preflight', async code => {
  const f = fixture(); await f.controller.restore(); f.deps.send.mockRejectedValueOnce(new SaleSubmissionError('business_error', code));
  await f.controller.start(options); expect(f.cart()).toHaveLength(1); expect(f.deps.confirmed).not.toHaveBeenCalled();
  expect(f.controller.getSnapshot().status).toBe('business_error');
  expect(f.controller.isLocked()).toBe(false);
  await f.controller.start({ ...options, canSubmit: false }); expect(f.deps.send).toHaveBeenCalledTimes(1);
});
it('does not unlock an uncertain sale when a later retry returns a business rejection', async () => {
  const f = fixture(); await f.controller.restore();
  f.deps.send.mockRejectedValueOnce(new SaleSubmissionError('uncertain', 'timeout')).mockRejectedValueOnce(new SaleSubmissionError('business_error', 'insufficient_stock'));
  await f.controller.start(options); await f.controller.retry('token');
  expect(f.controller.isLocked()).toBe(true); expect(f.cart()).toHaveLength(1); expect(f.stored()).not.toBeNull();
});
it('401 keeps the pending attempt; login never sends automatically', async () => {
  const f = fixture(); await f.controller.restore(); f.deps.send.mockRejectedValueOnce(new SaleSubmissionError('session_expired', 'session_expired'));
  await f.controller.start(options); expect(f.controller.getSnapshot().status).toBe('session_expired'); expect(f.cart()).toHaveLength(1);
  const restored = new SaleSubmissionController(f.deps); await restored.restore();
  expect(f.deps.send).toHaveBeenCalledTimes(1); expect(restored.getSnapshot().attempt?.request).toEqual(f.controller.getSnapshot().attempt?.request);
  await restored.retry('new-token'); expect(f.deps.send).toHaveBeenCalledTimes(2); expect(f.cart()).toEqual([]);
});
it('rejects stale preflight when any signature field changed', async () => {
  const f = fixture(); await f.controller.restore();
  for (const currentKey of ['customer', 'cart', 'quantity', 'method', 'account', 'amount']) await f.controller.start({ ...options, currentKey });
  expect(f.deps.send).not.toHaveBeenCalled(); expect(f.deps.uuid).not.toHaveBeenCalled(); expect(f.cart()).toHaveLength(1);
});
it('cannot submit if durable storage fails', async () => {
  const f = fixture(); await f.controller.restore(); f.deps.storage.write.mockRejectedValueOnce(Error('Disk full'));
  await f.controller.start(options); expect(f.deps.send).not.toHaveBeenCalled(); expect(f.cart()).toHaveLength(1);
  await f.controller.retry('token'); expect(f.deps.uuid).toHaveBeenCalledTimes(1); expect(f.deps.send).toHaveBeenCalledTimes(1);
});
it('does not lose a confirmed sale when storing the success receipt fails', async () => {
  const f = fixture(); await f.controller.restore();
  f.deps.send.mockImplementation(async request => { f.deps.storage.write.mockRejectedValueOnce(Error('storage')); return success(request); });
  await f.controller.start(options); expect(f.controller.getSnapshot().status).toBe('success'); expect(f.cart()).toEqual([]);
  const retry = new SaleSubmissionController(f.deps); await retry.restore(); expect(retry.getSnapshot().status).toBe('uncertain');
});
it('restores a confirmed receipt without a POST', async () => {
  const f = fixture(); await f.controller.restore(); await f.controller.start(options);
  const restored = new SaleSubmissionController(f.deps); await restored.restore(); expect(restored.getSnapshot().status).toBe('success'); expect(f.deps.send).toHaveBeenCalledTimes(1);
});
it('blocks new sales if a saved record is malformed or belongs to a different operator', async () => {
  for (const raw of ['invalid JSON', JSON.stringify({ version: 1, owner: 'someone else' })]) {
    const f = fixture(raw); await f.controller.restore(); await f.controller.start(options);
    expect(f.controller.isLocked()).toBe(true); expect(f.deps.send).not.toHaveBeenCalled(); expect(f.stored()).toBe(raw);
  }
});
it('a failed storage cleanup cannot start a second logical sale', async () => {
  const f = fixture(); await f.controller.restore(); await f.controller.start(options); f.deps.storage.remove.mockRejectedValueOnce(Error('storage'));
  expect(await f.controller.finish()).toBe(false); await f.controller.start(options); expect(f.deps.send).toHaveBeenCalledTimes(1);
});
it('freezes a copy so edits to the original intent cannot alter a retry', async () => {
  const f = fixture(); await f.controller.restore();
  const edited = JSON.parse(JSON.stringify(intent));
  f.deps.send.mockRejectedValueOnce(new SaleSubmissionError('uncertain', 'timeout'));
  await f.controller.start({ ...options, intent: edited });
  edited.lines[0].quantity = '99.000'; edited.payment_intent[0].amount = '0.01';
  await f.controller.retry('token');
  expect(f.deps.send.mock.calls[1][0].lines[0].quantity).toBe('0.500');
  expect(f.deps.send.mock.calls[1][0].payments[0].amount).toBe('30.00');
});
it('cannot clear a cart with a malformed or different-sale success', async () => {
  const f = fixture(); await f.controller.restore();
  f.deps.send.mockImplementation(async request => ({ ...success(request), sale: { ...success(request).sale, sale_uuid: 'another-sale' } }));
  await f.controller.start(options);
  expect(f.controller.getSnapshot().status).toBe('uncertain'); expect(f.cart()).toHaveLength(1); expect(f.deps.confirmed).not.toHaveBeenCalled();
});
it('keeps the UUID after a definitive rejection until the user clears the logical sale', async () => {
  const f = fixture(); await f.controller.restore();
  f.deps.send.mockRejectedValue(new SaleSubmissionError('business_error', 'insufficient_stock'));
  await f.controller.start(options); await f.controller.start(options);
  expect(f.deps.uuid).toHaveBeenCalledTimes(1);
  f.controller.resetDraft(); await f.controller.start(options);
  expect(f.deps.uuid).toHaveBeenCalledTimes(2);
});
it('double retry and reset cannot duplicate or abandon a pending sale', async () => {
  const f = fixture(); await f.controller.restore();
  f.deps.send.mockRejectedValueOnce(new SaleSubmissionError('uncertain', 'timeout'));
  await f.controller.start(options); f.controller.resetDraft();
  await Promise.all([f.controller.retry('token'), f.controller.retry('token')]);
  expect(f.deps.send).toHaveBeenCalledTimes(2); expect(f.deps.uuid).toHaveBeenCalledTimes(1);
});
