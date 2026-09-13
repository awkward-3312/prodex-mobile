import { CustomerCreateController } from '../src/services/clients/customerCreateController';
import { emptyCustomer, CustomerWriteError, type CustomerCreateRequest } from '../src/services/clients/customerManagementService';
const request: CustomerCreateRequest = { operation_uuid: '123e4567-e89b-42d3-a456-426614174000', customer: { ...emptyCustomer(), name: 'Ana', email: 'ana@example.com' } };
const result = { ...request.customer, id: 5, code: '5' };
function fixture(raw: string | null = null) {
  let saved = raw;
  const storage = { read: jest.fn(async () => saved), write: jest.fn(async (value: string) => { saved = value; }), remove: jest.fn(async () => { saved = null; }) };
  const send = jest.fn().mockResolvedValue(result);
  const controller = new CustomerCreateController('tenant|1', storage, send);
  return { storage, send, controller };
}
it('persists before sending, blocks double taps and cleans confirmed success', async () => {
  const f = fixture(); await f.controller.restore();
  f.send.mockImplementation(async () => { expect(f.storage.write).toHaveBeenCalled(); return result; });
  await Promise.all([f.controller.start(request, 'secret'), f.controller.start(request, 'secret')]);
  expect(f.send).toHaveBeenCalledTimes(1);
  expect(f.storage.write.mock.calls[0][0]).not.toContain('secret');
  expect(f.controller.getSnapshot().status).toBe('success');
  expect(await f.controller.finish()).toBe(true);
  expect(await f.controller.finish()).toBe(false);
  expect(f.storage.remove).toHaveBeenCalledTimes(1);
});
it('persistence failure blocks POST and retries the frozen payload', async () => {
  const f = fixture(); await f.controller.restore();
  f.storage.write.mockRejectedValueOnce(new Error());
  await f.controller.start(request, 'token');
  expect(f.send).not.toHaveBeenCalled();
  await f.controller.retry('token');
  expect(f.send).toHaveBeenCalledWith(request, 'token');
});
it.each(['uncertain', 'session_expired'] as const)('%s preserves exact UUID/payload and restore never auto-sends', async kind => {
  const f = fixture(); await f.controller.restore();
  f.send.mockRejectedValueOnce(new CustomerWriteError(kind, kind));
  await f.controller.start(request, 'old-token');
  const restored = fixture(f.storage.write.mock.calls[0][0]); await restored.controller.restore();
  expect(restored.send).not.toHaveBeenCalled();
  await restored.controller.start({ ...request, operation_uuid: '123e4567-e89b-42d3-a456-426614174001' }, 'new-token');
  expect(restored.send).not.toHaveBeenCalled();
  await restored.controller.retry('new-token');
  expect(restored.send).toHaveBeenCalledWith(request, 'new-token');
});
it('definitive validation permits correction with a new UUID', async () => {
  const f = fixture(); await f.controller.restore();
  f.send.mockRejectedValueOnce(new CustomerWriteError('definitive', 'validation_error'));
  await f.controller.start(request, 'token');
  expect(f.controller.getSnapshot().status).toBe('error');
  const corrected = { ...request, operation_uuid: '123e4567-e89b-42d3-a456-426614174001', customer: { ...request.customer, name: 'Otra' } };
  await f.controller.start(corrected, 'token');
  expect(f.send).toHaveBeenLastCalledWith(corrected, 'token');
});
it.each(['not json', '{}', JSON.stringify({ version: 1, owner: 'foreign', request })])('locks malformed/foreign durable attempt %s', async raw => {
  const f = fixture(raw); await f.controller.restore(); await f.controller.start(request, 'token');
  expect(f.send).not.toHaveBeenCalled(); expect(f.storage.remove).not.toHaveBeenCalled();
  expect(f.controller.getSnapshot().status).toBe('uncertain');
});
it('keeps conflict locked and preserves pending UUID when confirmed persistence fails', async () => {
  const f = fixture(); await f.controller.restore();
  f.send.mockRejectedValueOnce(new CustomerWriteError('uncertain', 'idempotency_conflict'));
  await f.controller.start(request, 'token'); expect(f.storage.remove).not.toHaveBeenCalled();
  f.storage.write.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error());
  await f.controller.retry('token'); expect(f.controller.getSnapshot().status).toBe('success');
});
