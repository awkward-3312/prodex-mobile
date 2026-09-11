import * as SecureStore from 'expo-secure-store';

import { authConfig } from '../src/config/auth';
import { apiClient } from '../src/services/api/apiClient';
import { ApiError, isAuthInvalidError } from '../src/services/api/apiError';
import { bootstrap, login, logout } from '../src/services/auth/authService';
import { clearSession, getSession, saveSession } from '../src/services/auth/sessionStorage';
import { normalizeWorkspace, resolveWorkspace } from '../src/services/auth/tenantService';
import type { AuthSession } from '../src/types/auth';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const session: AuthSession = { version: 1, workspace: 'prueba02', baseUrl: 'https://tenant.example', accessToken: 'token-value', tokenType: 'Bearer', expiresAt: null };

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
}

describe('tenant and auth services', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    secureStore.setItemAsync.mockReset();
    secureStore.getItemAsync.mockReset();
    secureStore.deleteItemAsync.mockReset();
  });

  it('normalizes workspace and resolves against the central origin', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { base_url: 'https://tenant.example' } }));
    expect(normalizeWorkspace('  Prueba02 ')).toBe('prueba02');
    await expect(resolveWorkspace('  Prueba02 ')).resolves.toMatchObject({ base_url: 'https://tenant.example' });
    expect(fetchMock).toHaveBeenCalledWith(`${authConfig.centralApiOrigin}/api/mobile/tenants/resolve`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ workspace: 'prueba02' }) }));
  });

  it('logs in against the resolved tenant base URL and sends password only in request memory', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { access_token: 'secret-token', token_type: 'Bearer' } }));
    await login('https://tenant.example', ' user@example.com ', 'password-value');
    expect(fetchMock).toHaveBeenCalledWith('https://tenant.example/api/mobile/auth/login', expect.objectContaining({ body: JSON.stringify({ email: 'user@example.com', password: 'password-value' }) }));
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('rejects a malformed 200 login response without a token', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ message: 'invalid credentials' }));
    await expect(login('https://tenant.example', 'user@example.com', 'wrong')).rejects.toMatchObject({ code: 'invalid_auth_response', status: 200 });
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('rejects invalid credentials from HTTP 401 before storage or bootstrap', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: { code: 'invalid_credentials' } }, 401));
    await expect(login('https://tenant.example', 'user@example.com', 'wrong')).rejects.toMatchObject({ status: 401, code: 'invalid_credentials' });
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('bootstraps and logs out with bearer authorization', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ user: { email: 'user@example.com' } }));
    await bootstrap(session.baseUrl, session.accessToken);
    await logout(session.baseUrl, session.accessToken);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://tenant.example/api/mobile/auth/bootstrap', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-value' }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://tenant.example/api/mobile/auth/logout', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-value' }) }));
  });
});

describe('session storage', () => {
  beforeEach(() => {
    secureStore.setItemAsync.mockReset();
    secureStore.getItemAsync.mockReset();
    secureStore.deleteItemAsync.mockReset();
  });

  it('stores and restores only the versioned session structure', async () => {
    await saveSession(session);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('prodex.auth.session.v1', JSON.stringify(session));
    secureStore.getItemAsync.mockResolvedValue(JSON.stringify(session));
    expect(await getSession()).toEqual(session);
    expect(JSON.stringify(session)).not.toContain('password');
  });

  it('clears the local session independently of remote logout result', async () => {
    await clearSession();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('prodex.auth.session.v1');
  });

  it('rejects malformed stored sessions', async () => {
    secureStore.getItemAsync.mockResolvedValue(JSON.stringify({ version: 1, accessToken: '' }));
    expect(await getSession()).toBeNull();
  });
});

describe('auth error classification', () => {
  it('recognizes 401 and token idle timeout as invalid sessions', () => {
    expect(isAuthInvalidError(new ApiError({ status: 401, message: 'Unauthorized' }))).toBe(true);
    expect(isAuthInvalidError(new ApiError({ status: 401, code: 'token_idle_timeout', message: 'Expired' }))).toBe(true);
  });

  it('does not classify network errors as invalid sessions', () => {
    expect(isAuthInvalidError(new ApiError({ status: 0, code: 'network_error', message: 'Offline' }))).toBe(false);
  });
});

describe('api client error classification', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves HTTP 401 invalid_credentials as an ApiError, not network_error', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: { code: 'invalid_credentials' } }, 401));

    await expect(apiClient.post('https://tenant.example/api/mobile/auth/login', {})).rejects.toMatchObject({
      status: 401,
      code: 'invalid_credentials',
    });

    try {
      await apiClient.post('https://tenant.example/api/mobile/auth/login', {});
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).not.toBe('network_error');
    }
  });

  it('preserves HTTP 500 as a server response, not network_error', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: { code: 'server_failed' } }, 500));

    await expect(apiClient.get('https://tenant.example/api/mobile/auth/bootstrap')).rejects.toMatchObject({
      status: 500,
      code: 'server_failed',
    });
  });

  it('maps a real fetch rejection to network_error', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiClient.get('https://tenant.example/api/mobile/auth/bootstrap')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
    });
  });

  it('maps AbortError to timeout', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    await expect(apiClient.get('https://tenant.example/api/mobile/auth/bootstrap')).rejects.toMatchObject({
      status: 0,
      code: 'timeout',
    });
  });
});
