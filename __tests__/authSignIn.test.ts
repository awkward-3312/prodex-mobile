import { ApiError } from '../src/services/api/apiError';
import { getSignInFailure } from '../src/context/authSignIn';

describe('signIn result mapping', () => {
  it('maps invalid credentials to a local form result', () => {
    expect(getSignInFailure(new ApiError({ status: 401, code: 'invalid_credentials', message: 'Unauthorized' }))).toEqual({ ok: false, code: 'invalid_credentials', message: 'Correo o contraseña incorrectos.' });
  });

  it('maps workspace, network and server failures', () => {
    expect(getSignInFailure(new ApiError({ status: 404, code: 'workspace_not_found', message: 'Not found' })).code).toBe('workspace_not_found');
    expect(getSignInFailure(new ApiError({ status: 0, code: 'network_error', message: 'Offline' })).code).toBe('network_error');
    expect(getSignInFailure(new ApiError({ status: 0, code: 'timeout', message: 'Timeout' })).code).toBe('timeout');
    expect(getSignInFailure(new ApiError({ status: 500, message: 'Error' })).code).toBe('server_error');
  });
});
