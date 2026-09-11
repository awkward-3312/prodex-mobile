import { ApiError } from '../src/services/api/apiError';
import { getAuthErrorMessage } from '../src/context/authErrorMessage';

describe('getAuthErrorMessage', () => {
  it('maps invalid credentials', () => {
    expect(getAuthErrorMessage(new ApiError({ status: 401, code: 'invalid_credentials', message: 'Invalid credentials' }))).toBe('Correo o contraseña incorrectos.');
  });

  it('maps an unknown workspace', () => {
    expect(getAuthErrorMessage(new ApiError({ status: 404, code: 'workspace_not_found', message: 'Not found' }))).toBe('No encontramos ese workspace.');
  });

  it('maps network and timeout errors', () => {
    expect(getAuthErrorMessage(new ApiError({ status: 0, code: 'network_error', message: 'Offline' }))).toBe('No pudimos conectarnos con PRODEX. Revisa tu conexión e inténtalo nuevamente.');
    expect(getAuthErrorMessage(new ApiError({ status: 0, code: 'timeout', message: 'Timeout' }))).toBe('No pudimos conectarnos con PRODEX. Revisa tu conexión e inténtalo nuevamente.');
  });

  it('maps server errors', () => {
    expect(getAuthErrorMessage(new ApiError({ status: 500, message: 'Internal error' }))).toBe('PRODEX no está disponible en este momento. Inténtalo nuevamente.');
  });
});