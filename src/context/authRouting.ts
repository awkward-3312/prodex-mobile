import type { AuthStatus } from '../types/auth';

export function getAuthRedirect(status: AuthStatus, route: string) {
  const inLogin = route === '/login';

  if (status === 'unauthenticated' && !inLogin) return '/login' as const;
  if (status === 'authenticated' && inLogin) return '/(tabs)' as const;
  return null;
}