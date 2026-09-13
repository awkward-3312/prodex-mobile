import { apiClient } from '../src/services/api/apiClient';
import { ApiError } from '../src/services/api/apiError';
import { createCustomer, updateCustomer, emptyCustomer, CustomerWriteError, validCustomer } from '../src/services/clients/customerManagementService';
jest.mock('../src/services/api/apiClient', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
const draft = { ...emptyCustomer(), name: 'Ana' };
const request = { operation_uuid: '123e4567-e89b-42d3-a456-426614174000', customer: draft };
beforeEach(() => jest.resetAllMocks());
it('sends canonical fields with create UUID and safe update PUT without UUID or balances', async () => {
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { ...draft, id: 1, code: '12' } });
  (apiClient.put as jest.Mock).mockResolvedValue({ data: { ...draft, id: 1, code: '12' } });
  expect(await createCustomer('https://tenant.example', 'token', request)).toMatchObject({ id: 1, code: '12' });
  expect(apiClient.post).toHaveBeenCalledWith('https://tenant.example/api/mobile/clients', { ...draft, operation_uuid: request.operation_uuid }, { token: 'token', authenticated: true });
  await updateCustomer('https://tenant.example', 'token', 1, draft);
  expect(apiClient.put).toHaveBeenCalledWith('https://tenant.example/api/mobile/clients/1', draft, { token: 'token', authenticated: true });
});
it.each([[422, 'validation_error', 'definitive'], [409, 'idempotency_conflict', 'uncertain'], [500, 'server_error', 'uncertain'], [401, 'unauthenticated', 'session_expired']])('maps %s without exposing server internals', async (status, code, kind) => {
  (apiClient.post as jest.Mock).mockRejectedValue(new ApiError({ status: status as number, code: code as string, message: 'SQL secret-token internal table', details: { email: ['SQL private data'] } }));
  try { await createCustomer('https://tenant.example', 'token', request); throw new Error('Expected failure'); }
  catch (error) { expect(error).toBeInstanceOf(CustomerWriteError); expect((error as CustomerWriteError).kind).toBe(kind); expect(JSON.stringify(error)).not.toContain('SQL'); expect((error as Error).message).not.toContain('secret'); }
});
it('malformed success remains uncertain and invalid customer fields are rejected locally', async () => {
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { name: 'Incomplete' } });
  await expect(createCustomer('https://tenant.example', 'token', request)).rejects.toMatchObject({ kind: 'uncertain', code: 'invalid_response' });
  expect(validCustomer({ ...draft, opening_balance: 100 })).toBe(false);
});
