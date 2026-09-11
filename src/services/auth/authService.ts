import { apiClient } from '../api/apiClient';
import { ApiError } from '../api/apiError';
import type { AuthTokenResponse, MobileBootstrap } from '../../types/auth';

type ApiEnvelope<T> = T | { data: T };

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}/api/mobile${path}`;
}

function unwrapData<T>(payload: ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function devLog(message: string, value?: unknown) {
  if (__DEV__) console.log(`[PRODEX AUTH] ${message}`, value ?? '');
}

export function login(baseUrl: string, email: string, password: string) {
  const url = endpoint(baseUrl, '/auth/login');
  devLog('login:start', url);
  return apiClient.post<ApiEnvelope<AuthTokenResponse>>(url, { email: email.trim(), password }).then((payload) => {
    const data = unwrapData(payload);
    devLog('login:status', 200);
    if (!data || typeof data.access_token !== 'string' || data.access_token.trim().length === 0) {
      throw new ApiError({ status: 200, code: 'invalid_auth_response', message: 'La respuesta de autenticación no es válida.' });
    }
    devLog('login:success');
    return data;
  }).catch((error) => {
    if (error instanceof ApiError) {
      devLog('login:status', error.status);
      devLog('login:error', error.code ?? 'unknown');
    }
    throw error;
  });
}

export function bootstrap(baseUrl: string, token: string) {
  const url = endpoint(baseUrl, '/auth/bootstrap');
  devLog('bootstrap:start', url);
  return apiClient.get<ApiEnvelope<MobileBootstrap>>(url, { token, authenticated: true }).then((payload) => {
    devLog('bootstrap:status', 200);
    return unwrapData(payload);
  }).catch((error) => {
    if (error instanceof ApiError) {
      devLog('bootstrap:status', error.status);
      devLog('bootstrap:error', error.code ?? 'unknown');
    }
    throw error;
  });
}

export function logout(baseUrl: string, token: string) {
  return apiClient.post<unknown>(endpoint(baseUrl, '/auth/logout'), undefined, { token, authenticated: true });
}
