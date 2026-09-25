export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor({ status, code, message, details }: { status: number; code?: string; message: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Single source of truth for "this response means the current session is no
 * longer valid and the user must sign in again" — used by AuthContext
 * (bootstrap/restore) and by every mobile service's error mapping. A 401 is
 * the primary signal; the error codes cover the mobile-specific idle
 * timeout and endpoints that report an unauthenticated request without a
 * bare 401 status.
 *
 * Endpoint-specific 401s that mean something else (e.g. login rejecting bad
 * credentials) must NOT call this — they check `error.status === 401`
 * directly, on purpose, before a session even exists.
 */
export function isAuthInvalidError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout');
}