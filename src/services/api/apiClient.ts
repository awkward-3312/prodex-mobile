import { authConfig } from '../../config/auth';
import { ApiError } from './apiError';

type RequestOptions = { body?: unknown; token?: string; authenticated?: boolean; signal?: AbortSignal };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function errorPayload(payload: unknown) {
  if (!isRecord(payload)) return {};
  if (isRecord(payload.error)) return payload.error;
  return payload;
}

function isAbortError(error: unknown) {
  return (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError')
    || (isRecord(error) && error.name === 'AbortError');
}

async function request<T>(method: 'GET' | 'POST' | 'PUT', url: string, options: RequestOptions = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), authConfig.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? controller.signal,
    });
    const text = await response.text();
    let payload: unknown = null;
    if (text.length > 0) {
      try { payload = JSON.parse(text); } catch { payload = { message: text }; }
    }

    if (!response.ok) {
      const data = errorPayload(payload);
      throw new ApiError({ status: response.status, code: typeof data.code === 'string' ? data.code : undefined, message: typeof data.message === 'string' ? data.message : `Request failed with status ${response.status}`, details: data.details });
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isAbortError(error)) throw new ApiError({ status: 0, code: 'timeout', message: 'La solicitud tardó demasiado.' });
    throw new ApiError({ status: 0, code: 'network_error', message: 'No se pudo conectar con PRODEX.', details: error });
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  put: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>('PUT', url, { ...options, body }),
  get: <T>(url: string, options?: RequestOptions) => request<T>('GET', url, options),
  post: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>('POST', url, { ...options, body }),
};
