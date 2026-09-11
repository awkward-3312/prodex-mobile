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

export function isAuthInvalidError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.code === 'token_idle_timeout');
}