import { getMobileDashboardSummary, MobileDashboardError, parseMobileDashboardSummary } from '../src/services/dashboard/mobileDashboardService';

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
}

const auth = { baseUrl: 'https://tenant.example', accessToken: 'token-value' };

beforeEach(() => jest.restoreAllMocks());

it('parses a full summary with deltas and top products', () => {
  const result = parseMobileDashboardSummary({
    data: {
      today: { sales_total: '300.00', sales_count: 2, average_sale: '150.00', sales_total_delta_pct: 50, average_sale_delta_pct: 50, top_products: [{ id: 1, name: 'Café', quantity: '10.000' }] },
      week: { from: '2026-05-11', to: '2026-05-15', total: '400.00', days: [{ date: '2026-05-11', total: '0.00' }, { date: '2026-05-15', total: '400.00' }] },
    },
  });
  expect(result.today.salesTotal).toBe('300.00');
  expect(result.today.salesTotalDeltaPct).toBe(50);
  expect(result.today.topProducts).toEqual([{ id: 1, name: 'Café', quantity: '10.000' }]);
  expect(result.week.days).toHaveLength(2);
});

it('keeps deltas and top_products as null when the backend omits them (no fabricated numbers)', () => {
  const result = parseMobileDashboardSummary({
    data: {
      today: { sales_total: '0.00', sales_count: 0, average_sale: '0.00', sales_total_delta_pct: null, average_sale_delta_pct: null, top_products: null },
      week: { from: '2026-05-11', to: '2026-05-15', total: '0.00', days: [] },
    },
  });
  expect(result.today.salesTotalDeltaPct).toBeNull();
  expect(result.today.topProducts).toBeNull();
});

it('rejects a malformed payload', () => {
  expect(() => parseMobileDashboardSummary({ data: {} })).toThrow(MobileDashboardError);
});

it('fetches via the bearer session', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({
    data: { today: { sales_total: '0.00', sales_count: 0, average_sale: '0.00' }, week: { from: '2026-05-11', to: '2026-05-15', total: '0.00', days: [] } },
  }));
  await getMobileDashboardSummary(auth);
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toBe('https://tenant.example/api/mobile/dashboard/summary');
  expect((init as RequestInit)?.headers).toMatchObject({ Authorization: 'Bearer token-value' });
});

it.each([
  [401, 'session_expired'],
  [403, 'forbidden'],
  [500, 'server_error'],
])('maps HTTP %i correctly', async (status, expected) => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({}, status));
  await expect(getMobileDashboardSummary(auth)).rejects.toMatchObject({ status: expected });
});
