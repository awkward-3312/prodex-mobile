import type { AuthenticatedUser } from '../types/auth';

function httpUrl(value: unknown, baseUrl?: string): string | undefined {
  if (typeof value !== 'string' || !value.trim() || /[\\\u0000-\u001f]/.test(value)) return;
  try {
    const url = new URL(value.trim(), baseUrl);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return;
    return url.href;
  } catch { return; }
}

/** Uses backend avatar fields only; no session credentials are accepted or appended. */
export function resolveUserAvatar(user: AuthenticatedUser | null | undefined, baseUrl?: string): string | undefined {
  const base = httpUrl(baseUrl);
  for (const value of [user?.profile_photo_url, user?.avatar_url, user?.photo_url]) {
    const resolved = httpUrl(value, base);
    if (resolved) return resolved;
  }
  const avatar = user?.avatar;
  if (typeof avatar === 'string' && avatar.trim()) {
    const value = avatar.trim();
    const filename = !/[\/\\:?#%\u0000-\u001f]/.test(value) && value !== '.' && value !== '..';
    const resolved = httpUrl(filename ? `/images/avatar/${encodeURIComponent(value)}` : value, base);
    if (resolved) return resolved;
  }
  return httpUrl(user?.photo, base);
}
