import { ApiError } from '../services/api/apiError';

export function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No pudimos conectarnos con PRODEX. Revisa tu conexión e inténtalo nuevamente.';
  if (error.code === 'invalid_credentials' || error.code === 'invalid_auth_response' || error.status === 401) return 'Correo o contraseña incorrectos.';
  if (error.code === 'workspace_not_found') return 'No encontramos ese espacio de trabajo.';
  if (error.code === 'network_error' || error.code === 'timeout' || error.status === 0) return 'No pudimos conectarnos con PRODEX. Revisa tu conexión e inténtalo nuevamente.';
  if (error.status >= 500) return 'PRODEX no está disponible en este momento. Inténtalo nuevamente.';
  return error.message;
}