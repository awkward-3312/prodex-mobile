import { getAuthRedirect } from '../src/context/authRouting';

describe('getAuthRedirect', () => {
  it('redirects unauthenticated users to login once', () => {
    expect(getAuthRedirect('unauthenticated', '/(tabs)')).toBe('/login');
    expect(getAuthRedirect('unauthenticated', '/login')).toBeNull();
  });

  it('redirects authenticated users from login once', () => {
    expect(getAuthRedirect('authenticated', '/login')).toBe('/(tabs)');
    expect(getAuthRedirect('authenticated', '/(tabs)')).toBeNull();
  });

  it.each(['initializing', 'resolving_tenant', 'authenticating', 'bootstrapping', 'bootstrap_error'] as const)('does not redirect during %s', (status) => {
    expect(getAuthRedirect(status, '/login')).toBeNull();
    expect(getAuthRedirect(status, '/(tabs)')).toBeNull();
  });
});