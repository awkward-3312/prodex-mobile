import {
  buildMobileSalesQueryParams,
  getMobileSales,
  mergeMobileSalesPages,
  mobileSaleKey,
  MobileSalesError,
} from '../src/services/sales/mobileSalesService';
import type { MobileSale } from '../src/types/mobileSales';

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
}

const sale = (overrides: Partial<MobileSale> = {}): MobileSale => ({
  sale_id: 42,
  sale_uuid: '11111111-1111-1111-1111-111111111111',
  reference: 'INV-001',
  date: '2026-05-15 14:32:00',
  customer: { id: 1, name: 'Cliente Final' },
  branch: { id: 3, name: 'Sucursal 1' },
  items_count: 2,
  grand_total: '517.50',
  paid_amount: '517.50',
  due_amount: '0.00',
  payment_status: 'paid',
  fiscal: { number: 'SAR-0001', status: 'issued' },
  ...overrides,
});

const salesResponse = (items: MobileSale[] = [sale()]) => ({
  data: {
    items,
    pagination: { page: 1, per_page: 30, total: items.length, last_page: 1, has_more: false },
  },
});

const request = (overrides = {}) => getMobileSales({
  baseUrl: 'https://tenant.example',
  accessToken: 'token-value',
  ...overrides,
});

describe('getMobileSales', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the sales URL with encoded search, payment_status, dates and pagination', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(salesResponse()));
    await request({ search: 'inv 001', paymentStatus: 'partial', dateFrom: '2026-05-01', dateTo: '2026-05-31', page: 2, perPage: 50 });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/api/mobile/sales?');
    expect(calledUrl).toContain('search=inv+001');
    expect(calledUrl).toContain('payment_status=partial');
    expect(calledUrl).toContain('date_from=2026-05-01');
    expect(calledUrl).toContain('date_to=2026-05-31');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('per_page=50');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-value' }) }));
  });

  it('omits search, payment_status and dates when not provided', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(salesResponse()));
    await request();

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).not.toContain('search=');
    expect(calledUrl).not.toContain('payment_status=');
    expect(calledUrl).not.toContain('date_from=');
    expect(calledUrl).not.toContain('date_to=');
  });

  it('unwraps the data envelope and preserves decimal money strings', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(salesResponse([sale({ grand_total: '150.50', paid_amount: '75.00', due_amount: '75.50' })])));
    const response = await request();

    expect(response.items).toHaveLength(1);
    expect(response.items[0].grand_total).toBe('150.50');
    expect(response.items[0].paid_amount).toBe('75.00');
    expect(response.items[0].due_amount).toBe('75.50');
    expect(typeof response.items[0].grand_total).toBe('string');
  });

  it('parses nullable customer, branch and fiscal fields', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(salesResponse([sale({ customer: null, branch: null, fiscal: null })])));
    const response = await request();

    expect(response.items[0].customer).toBeNull();
    expect(response.items[0].branch).toBeNull();
    expect(response.items[0].fiscal).toBeNull();
  });

  it('parses pagination', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(salesResponse()));
    const response = await request();

    expect(response.pagination).toEqual({ page: 1, per_page: 30, total: 1, last_page: 1, has_more: false });
  });

  it.each([
    [401, 'unauthenticated', 'session_expired'],
    [401, 'token_idle_timeout', 'session_expired'],
    [403, 'forbidden', 'forbidden'],
    [422, 'validation_error', 'validation_error'],
    [429, 'too_many_requests', 'rate_limited'],
    [500, 'server_failed', 'server_error'],
  ])('maps HTTP %i %s to %s', async (status, code, expected) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: { code } }, status));
    await expect(request()).rejects.toMatchObject({ status: expected });
    await expect(request()).rejects.toBeInstanceOf(MobileSalesError);
  });

  it.each([
    [Promise.reject(new TypeError('Network request failed')), 'network_error'],
    [Promise.reject(new DOMException('Aborted', 'AbortError')), 'timeout'],
  ])('maps request failure to %s', async (rejection, expected) => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => rejection as Promise<Response>);
    await expect(request()).rejects.toMatchObject({ status: expected });
  });

  it('rejects malformed responses without items', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { items: [{ sale_id: 1 }] } }));
    await expect(request()).rejects.toBeInstanceOf(MobileSalesError);
    await expect(request()).rejects.toMatchObject({ status: 'invalid_response' });
  });

  it('rejects a response missing pagination', async () => {
    const payload = salesResponse();
    delete (payload.data as { pagination?: unknown }).pagination;
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(payload));
    await expect(request()).rejects.toMatchObject({ status: 'invalid_response' });
  });
});

describe('buildMobileSalesQueryParams', () => {
  it('maps payment status filter selection', () => {
    expect(buildMobileSalesQueryParams({ paymentStatus: 'paid' }).get('payment_status')).toBe('paid');
    expect(buildMobileSalesQueryParams({ paymentStatus: null }).has('payment_status')).toBe(false);
  });

  it('defaults page and per_page', () => {
    const params = buildMobileSalesQueryParams({});
    expect(params.get('page')).toBe('1');
    expect(params.get('per_page')).toBe('30');
  });
});

describe('mobile sales pagination helpers', () => {
  it('appends page 2 and dedupes repeated sales by sale_id', () => {
    const page1 = [sale({ sale_id: 1 }), sale({ sale_id: 2 })];
    const page2 = [sale({ sale_id: 2 }), sale({ sale_id: 3 })];
    expect(mergeMobileSalesPages(page1, page2).map((item) => item.sale_id)).toEqual([1, 2, 3]);
  });

  it('keys sales by sale_id', () => {
    expect(mobileSaleKey(sale({ sale_id: 7 }))).toBe('7');
  });
});
