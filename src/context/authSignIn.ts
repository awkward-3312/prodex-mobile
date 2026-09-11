import { ApiError } from '../services/api/apiError';
import { getAuthErrorMessage } from './authErrorMessage';

export type SignInErrorCode = 'invalid_credentials' | 'workspace_not_found' | 'network_error' | 'timeout' | 'server_error' | 'unknown';
export type SignInResult = { ok: true } | { ok: false; code: SignInErrorCode; message: string };

export function getSignInFailure(error: unknown): Extract<SignInResult, { ok: false }> {
  if (error instanceof ApiError) {
    if (error.code === 'workspace_not_found') return { ok: false, code: 'workspace_not_found', message: 'No encontramos ese workspace.' };
    if (error.code === 'timeout') return { ok: false, code: 'timeout', message: 'No pudimos conectarnos con PRODEX. Revisa tu conexión e inténtalo nuevamente.' };
    if (error.code === 'network_error' || error.status === 0) return { ok: false, code: 'network_error', message: 'No pudimos conectarnos con PRODEX. Revisa tu conexión e inténtalo nuevamente.' };
    if (error.code === 'invalid_credentials' || error.code === 'invalid_auth_response' || error.status === 401) return { ok: false, code: 'invalid_credentials', message: 'Correo o contraseña incorrectos.' };
    if (error.status >= 500) return { ok: false, code: 'server_error', message: 'PRODEX no está disponible en este momento. Inténtalo nuevamente.' };
  }
  return { ok: false, code: 'unknown', message: getAuthErrorMessage(error) };
}
