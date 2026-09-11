import { authConfig } from '../../config/auth';
import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';
import type { TenantResolution } from '../../types/auth';

type ApiEnvelope<T> = T | { data: T };

export function normalizeWorkspace(workspace: string) {
  return workspace.trim().toLowerCase();
}

function unwrapData<T>(payload: ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function devLog(message: string, value?: unknown) {
  if (__DEV__) console.log(`[PRODEX AUTH] ${message}`, value ?? '');
}

export function resolveWorkspace(workspace: string) {
  const url = `${authConfig.centralApiOrigin}/api/mobile/tenants/resolve`;
  devLog('resolve:start', url);
  return apiClient.post<ApiEnvelope<TenantResolution>>(url, { workspace: normalizeWorkspace(workspace) }).then((payload) => {
    const data = unwrapData(payload);
    devLog('resolve:status', 200);
    devLog('resolve:baseUrl', data.base_url);
    return data;
  }).catch((error) => {
    if (error instanceof ApiError) {
      devLog('resolve:status', error.status);
      devLog('resolve:error', error.code ?? 'unknown');
    }
    throw error;
  });
}
