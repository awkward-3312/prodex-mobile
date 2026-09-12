import { CashRegisterOperationController } from '../src/services/cashRegister/cashRegisterOperationController';
import { CashRegisterOperationError, buildCashRegisterMovementRequest, UUID_V4 } from '../src/services/cashRegister/mobileCashRegisterOperationService';
import type { CashRegisterMovementRequest, CashRegisterOperationResponse } from '../src/services/cashRegister/mobileCashRegisterOperationService';

function success(request: CashRegisterMovementRequest, idempotent = false): CashRegisterOperationResponse {
  return {
    success: true,
    idempotent,
    operationUuid: request.operation_uuid,
    operationType: 'cash_in',
    register: { id: 5, openedAt: '2026-09-12 08:00:00', openingBalance: '500.00', branch: null, inventoryLocation: null, warehouse: null, cashDrawer: null },
    summary: {
      transactionCount: 0, totalSales: '0.00', cashSales: '0.00', cashIn: request.amount, cashOut: '0.00', cashRefunds: '0.00',
      expectedCash: '0.00', cardSystemTotal: '0.00', transferTotal: '0.00', storeCreditApplied: '0.00', salesByPaymentMethod: [],
    },
  };
}

function fixture(raw: string | null = null) {
  let stored = raw;
  let successCount = 0;
  const storage = { read: jest.fn(async () => stored), write: jest.fn(async (value: string) => { stored = value; }), remove: jest.fn(async () => { stored = null; }) };
  const onSuccess = jest.fn(() => { successCount += 1; });
  const send = jest.fn(async (request: CashRegisterMovementRequest, _token: string) => success(request));
  const deps = { owner: 'tenant|user', kind: 'movement-in', storage, send, onSuccess };
  return { controller: new CashRegisterOperationController<CashRegisterMovementRequest>(deps), deps, stored: () => stored, successCount: () => successCount };
}

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const buildRequest = () => buildCashRegisterMovementRequest(uuid, 5, 'in', '50.00', 'Cambio inicial');

it('persists the frozen request (with its operation_uuid) before the first POST', async () => {
  const f = fixture(); await f.controller.restore();
  let resolve!: (value: CashRegisterOperationResponse) => void;
  f.deps.send.mockImplementation(request => new Promise(r => { resolve = r; expect(JSON.parse(f.stored()!).request).toEqual(request); }));
  const task = f.controller.start(buildRequest, 'token'); await Promise.resolve(); await Promise.resolve();
  expect(f.controller.getSnapshot().status).toBe('submitting');
  const request = f.deps.send.mock.calls[0][0];
  expect(UUID_V4.test(request.operation_uuid)).toBe(true);
  resolve(success(request)); await task;
  expect(f.controller.getSnapshot().status).toBe('success');
  expect(f.deps.onSuccess).toHaveBeenCalledTimes(1);
});

it('blocks a double tap even while the first storage write is pending', async () => {
  const f = fixture(); await f.controller.restore();
  await Promise.all([f.controller.start(buildRequest, 'token'), f.controller.start(buildRequest, 'token')]);
  expect(f.deps.send).toHaveBeenCalledTimes(1);
});

it.each(['network_error', 'timeout', 'invalid_response', 'server_error'])('keeps the frozen UUID/payload on %s and retries idempotently with the same UUID', async code => {
  const f = fixture(); await f.controller.restore();
  f.deps.send.mockRejectedValueOnce(new CashRegisterOperationError('uncertain', code)).mockImplementationOnce(async request => success(request, true));
  await f.controller.start(buildRequest, 'token');
  expect(f.controller.isLocked()).toBe(true);
  const original = JSON.stringify(f.deps.send.mock.calls[0][0]);
  await f.controller.retry('renewed-token');
  expect(JSON.stringify(f.deps.send.mock.calls[1][0])).toBe(original);
  expect(f.deps.send.mock.calls[1][1]).toBe('renewed-token');
  expect(f.controller.getSnapshot().attempt?.response?.idempotent).toBe(true);
  expect(f.controller.getSnapshot().status).toBe('success');
});

it('a 401 preserves the pending attempt and never auto-resubmits', async () => {
  const f = fixture(); await f.controller.restore();
  f.deps.send.mockRejectedValueOnce(new CashRegisterOperationError('session_expired', 'session_expired'));
  await f.controller.start(buildRequest, 'token');
  expect(f.controller.getSnapshot().status).toBe('session_expired');
  expect(f.controller.getSnapshot().attempt).not.toBeNull();
  // No automatic retry happens; only an explicit retry() call resends.
  expect(f.deps.send).toHaveBeenCalledTimes(1);
});

it.each(['register_already_open', 'register_closed', 'idempotency_conflict', 'validation_error', 'forbidden'])('a definitive %s clears the attempt and requires a corrected new attempt', async code => {
  const f = fixture(); await f.controller.restore();
  f.deps.send.mockRejectedValueOnce(new CashRegisterOperationError('business_error', code));
  await f.controller.start(buildRequest, 'token');
  expect(f.controller.getSnapshot().status).toBe('business_error');
  expect(f.deps.storage.remove).toHaveBeenCalled();
  expect(f.deps.onSuccess).not.toHaveBeenCalled();
});

it('app restore never auto-sends: a saved uncertain attempt stays uncertain until explicit retry', async () => {
  const savedRequest = buildRequest();
  const saved = JSON.stringify({ version: 1, owner: 'tenant|user', kind: 'movement-in', request: savedRequest });
  const f = fixture(saved);
  await f.controller.restore();
  expect(f.controller.getSnapshot().status).toBe('uncertain');
  expect(f.deps.send).not.toHaveBeenCalled();
});

it('restoring an already-confirmed attempt reports success without resending', async () => {
  const savedRequest = buildRequest();
  const saved = JSON.stringify({ version: 1, owner: 'tenant|user', kind: 'movement-in', request: savedRequest, response: success(savedRequest, true) });
  const f = fixture(saved);
  await f.controller.restore();
  expect(f.controller.getSnapshot().status).toBe('success');
  expect(f.deps.send).not.toHaveBeenCalled();
  expect(f.deps.onSuccess).toHaveBeenCalledTimes(1);
});

it('if the durable write fails, no POST is sent (attempt stays recoverable for retry)', async () => {
  const f = fixture(); await f.controller.restore();
  f.deps.storage.write.mockRejectedValueOnce(new Error('disk full'));
  await f.controller.start(buildRequest, 'token');
  expect(f.deps.send).not.toHaveBeenCalled();
  expect(f.controller.getSnapshot().status).toBe('uncertain');
});

it('finish() clears the attempt exactly once after success', async () => {
  const f = fixture(); await f.controller.restore();
  await f.controller.start(buildRequest, 'token');
  expect(await f.controller.finish()).toBe(true);
  expect(f.controller.getSnapshot().status).toBe('idle');
  expect(f.stored()).toBeNull();
  expect(await f.controller.finish()).toBe(false);
});
