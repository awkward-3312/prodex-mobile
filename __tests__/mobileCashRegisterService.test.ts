import {
  getCashRegisterHistory,
  getCurrentCashRegister,
  MobileCashRegisterError,
  parseCashRegisterCurrent,
  parseCashRegisterHistory,
} from '../src/services/cashRegister/mobileCashRegisterService';

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
}

const auth = { baseUrl: 'https://tenant.example', accessToken: 'token-value' };

beforeEach(() => jest.restoreAllMocks());

describe('parseCashRegisterCurrent', () => {
  it('parses a closed (no register) response', () => {
    expect(parseCashRegisterCurrent({ data: { status: 'closed', register: null, summary: null } })).toEqual({ status: 'closed', register: null, summary: null });
  });

  it('parses an open register with summary and payment methods', () => {
    const result = parseCashRegisterCurrent({
      data: {
        status: 'open',
        register: { id: 5, opened_at: '2026-05-10 08:00:00', opening_balance: '500.00', branch: { id: 1, name: 'Sucursal 1' }, inventory_location: { id: 2, name: 'Piso de venta' }, warehouse: null, cash_drawer: { id: 3, name: 'Caja1' } },
        summary: {
          transaction_count: 4, total_sales: '400.00', cash_sales: '250.00', cash_in: '0.00', cash_out: '0.00', cash_refunds: '0.00', expected_cash: '750.00', card_system_total: '150.00', transfer_total: '0.00', store_credit_applied: '0.00',
          sales_by_payment_method: [{ id: 1, name: 'Efectivo', category: 'cash', total: '250.00' }],
        },
      },
    });
    expect(result.status).toBe('open');
    if (result.status === 'open') {
      expect(result.register.branch).toEqual({ id: 1, name: 'Sucursal 1' });
      expect(result.summary.salesByPaymentMethod).toEqual([{ id: 1, name: 'Efectivo', category: 'cash', total: '250.00' }]);
    }
  });

  it.each([
    [{ data: { status: 'bogus' } }],
    [{ data: { status: 'open', register: {}, summary: {} } }],
  ])('rejects malformed payload %#', (payload) => {
    expect(() => parseCashRegisterCurrent(payload)).toThrow(MobileCashRegisterError);
  });

  it('fetches via the bearer session, never a query-string token', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { status: 'closed', register: null, summary: null } }));
    await getCurrentCashRegister(auth);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://tenant.example/api/mobile/cash-register/current');
    expect(String(url)).not.toContain('access_token');
    expect((init as RequestInit)?.headers).toMatchObject({ Authorization: 'Bearer token-value' });
  });

  it.each([
    [401, 'session_expired'],
    [403, 'forbidden'],
    [500, 'server_error'],
  ])('maps HTTP %i correctly', async (status, expected) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({}, status));
    await expect(getCurrentCashRegister(auth)).rejects.toMatchObject({ status: expected });
  });
});

describe('parseCashRegisterHistory', () => {
  it('parses items and pagination', () => {
    const result = parseCashRegisterHistory({
      data: {
        items: [{ id: 9, status: 'closed', closing_status: 'balanced', closing_status_label: 'Balanceada', user: { id: 2, name: 'Ana' }, branch: 'Sucursal 1', inventory_location: null, warehouse: null, cash_drawer: null, opened_at: '2026-05-10 08:00:00', closed_at: '2026-05-10 18:00:00', opening_balance: '500.00', total_sales: '1200.00', expected_cash: '700.00', counted_cash: '700.00', difference: '0.00' }],
        pagination: { page: 1, per_page: 20, total: 1, last_page: 1, has_more: false },
      },
    });
    expect(result.items[0].user).toEqual({ id: 2, name: 'Ana' });
    expect(result.pagination.total).toBe(1);
  });

  it('rejects malformed payload', () => {
    expect(() => parseCashRegisterHistory({ data: {} })).toThrow(MobileCashRegisterError);
  });

  it('fetches with page/per_page and optional date range', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { items: [], pagination: { page: 2, per_page: 10, total: 0, last_page: 1, has_more: false } } }));
    await getCashRegisterHistory({ ...auth, page: 2, perPage: 10, from: '2026-05-01', to: '2026-05-31' });
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/api/mobile/cash-register/history?');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('per_page=10');
    expect(calledUrl).toContain('from=2026-05-01');
    expect(calledUrl).toContain('to=2026-05-31');
  });

  it('maps a 403 to forbidden', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({}, 403));
    await expect(getCashRegisterHistory(auth)).rejects.toMatchObject({ status: 'forbidden' });
  });
});
