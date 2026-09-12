import { ApiError } from '../api/apiError';
import { apiClient } from '../api/apiClient';
import { MobilePosCheckoutError, parseClientSearchResponse } from '../pos/mobilePosCheckoutService';
import type { ClientSearchResponse } from '../../types/mobilePosCheckout';

/**
 * General client directory (Más > Clientes), gated by Customers_view - distinct from
 * mobile/pos/clients (Sales_pos, the checkout picker). Same response shape, so the
 * existing parser/types are reused rather than duplicated.
 */
export function searchDirectoryClients({ baseUrl, accessToken, search = '', page = 1, perPage = 20, signal }: { baseUrl: string; accessToken: string; search?: string; page?: number; perPage?: number; signal?: AbortSignal }): Promise<ClientSearchResponse> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/mobile/clients`);
  url.search = new URLSearchParams({ search: search.trim(), page: String(page), per_page: String(perPage) }).toString();

  return (async () => {
    try {
      const payload = await apiClient.get<unknown>(url.toString(), { token: accessToken, authenticated: true, signal });
      return parseClientSearchResponse(payload);
    } catch (error) {
      if (error instanceof MobilePosCheckoutError) throw error;
      if (error instanceof ApiError) {
        if (error.status === 401 || error.code === 'unauthenticated' || error.code === 'token_idle_timeout') throw new MobilePosCheckoutError('session_expired', 'Session expired');
        if (error.status === 403) throw new MobilePosCheckoutError('forbidden', 'Forbidden');
        if (error.status === 429) throw new MobilePosCheckoutError('rate_limited', 'Rate limited');
        if (error.status >= 500) throw new MobilePosCheckoutError('server_error', 'Server error');
        if (error.code === 'timeout') throw new MobilePosCheckoutError('timeout', 'Timeout');
        throw new MobilePosCheckoutError('network_error', 'Network error');
      }
      throw new MobilePosCheckoutError('network_error', 'Network error');
    }
  })();
}
