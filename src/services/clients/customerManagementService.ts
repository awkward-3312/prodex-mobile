import { apiClient } from '../api/apiClient';
import { ApiError } from '../api/apiError';

export const customerFields = ['name', 'firstname', 'lastname', 'phone', 'email', 'tax_number', 'country', 'state', 'city', 'zip', 'adresse'] as const;
export type CustomerField = typeof customerFields[number];
export type CustomerDraft = Record<CustomerField, string>;
export type ManagedCustomer = CustomerDraft & { id: string | number; code: string };
export type CustomerCreateRequest = { operation_uuid: string; customer: CustomerDraft };
export const emptyCustomer = (): CustomerDraft => Object.fromEntries(customerFields.map(field => [field, ''])) as CustomerDraft;
export function canonicalCustomer(draft: CustomerDraft): CustomerDraft { return Object.fromEntries(customerFields.map(field => [field, draft[field].trim()])) as CustomerDraft; }
export function validCustomer(value: unknown): value is CustomerDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return Object.keys(data).length === customerFields.length && customerFields.every(field => typeof data[field] === 'string' && data[field].length <= 255)
    && !!(data.name as string).trim() && (!(data.email as string) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email as string));
}
export function validCustomerCreate(value: unknown): value is CustomerCreateRequest {
  const data = value as CustomerCreateRequest | null;
  return !!data && typeof data.operation_uuid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.operation_uuid) && validCustomer(data.customer);
}
export class CustomerWriteError extends Error {
  constructor(public kind: 'definitive' | 'uncertain' | 'session_expired', public code: string, public fields: Partial<Record<CustomerField, string>> = {}) { super(customerWriteMessage(code)); }
}
export function customerWriteMessage(code: string): string {
  if (code === 'validation_error') return 'Revisa los datos del cliente.';
  if (code === 'forbidden') return 'No tienes permiso para guardar clientes.';
  if (code === 'customer_not_found') return 'No tienes acceso a este cliente.';
  if (code === 'idempotency_conflict') return 'La operación guardada no coincide. Conservamos el intento; no crees otro cliente.';
  if (code === 'storage_error') return 'No pudimos guardar o recuperar el intento. No se enviará un nuevo cliente.';
  if (code === 'session_expired') return 'Inicia sesión y vuelve para reintentar la misma operación.';
  return 'No pudimos confirmar el resultado. Reintenta con los mismos datos guardados.';
}
function parseCustomer(payload: unknown): ManagedCustomer {
  const data = (payload as { data?: Record<string, unknown> })?.data;
  if (!data || !/^[1-9]\d*$/.test(String(data.id)) || typeof data.name !== 'string' || typeof data.code !== 'string') throw new CustomerWriteError('uncertain', 'invalid_response');
  const draft = Object.fromEntries(customerFields.map(field => [field, data[field] == null ? '' : data[field]])) as CustomerDraft;
  if (!validCustomer(draft)) throw new CustomerWriteError('uncertain', 'invalid_response');
  return { ...draft, id: data.id as string | number, code: data.code };
}
export function validManagedCustomer(value: unknown): value is ManagedCustomer {
  const data = value as ManagedCustomer | null;
  return !!data && /^[1-9]\d*$/.test(String(data.id)) && typeof data.code === 'string' && validCustomer(Object.fromEntries(customerFields.map(field => [field, data[field]])));
}
async function mapped<T>(action: () => Promise<T>): Promise<T> {
  try { return await action(); } catch (error) {
    if (error instanceof CustomerWriteError) throw error;
    if (error instanceof ApiError) {
      if (error.status === 401) throw new CustomerWriteError('session_expired', 'session_expired');
      const code = error.status === 403 ? 'forbidden' : error.status === 404 ? 'customer_not_found' : error.code ?? 'network_error';
      const fields: Partial<Record<CustomerField, string>> = {};
      if (code === 'validation_error' && error.details && typeof error.details === 'object') {
        for (const field of customerFields) if (field in error.details) fields[field] = 'Revisa este campo.';
      }
      // Conflict is locked: this UUID may identify an already-created customer.
      throw new CustomerWriteError([403, 404, 422].includes(error.status) ? 'definitive' : 'uncertain', code, fields);
    }
    throw new CustomerWriteError('uncertain', 'network_error');
  }
}
const endpoint = (base: string) => `${base.replace(/\/$/, '')}/api/mobile/clients`;
export const createCustomer = (base: string, token: string, request: CustomerCreateRequest) => mapped(async () => parseCustomer(await apiClient.post(endpoint(base), { ...request.customer, operation_uuid: request.operation_uuid }, { token, authenticated: true })));
export const updateCustomer = (base: string, token: string, id: string | number, draft: CustomerDraft) => mapped(async () => parseCustomer(await apiClient.put(`${endpoint(base)}/${encodeURIComponent(id)}`, draft, { token, authenticated: true })));
export const loadEditableCustomer = (base: string, token: string, id: string) => mapped(async () => parseCustomer(await apiClient.get(`${endpoint(base)}/${encodeURIComponent(id)}/edit`, { token, authenticated: true })));
export const loadCustomerConfiguration = (base: string, token: string) => mapped(async () => {
  const result = await apiClient.get<{ data?: { tax_number_label?: string } }>(`${endpoint(base)}/form`, { token, authenticated: true });
  return typeof result.data?.tax_number_label === 'string' ? result.data.tax_number_label : 'Identificación fiscal';
});
