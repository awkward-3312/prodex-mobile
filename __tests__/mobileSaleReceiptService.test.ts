import { getMobileSaleReceipt, MobileSaleReceiptError, parseMobileSaleReceipt } from '../src/services/sales/mobileSaleReceiptService';

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
}

const auth = { baseUrl: 'https://tenant.example', accessToken: 'token-value' };

describe('mobile sale receipt service', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('parses a valid receipt payload', () => {
    const receipt = parseMobileSaleReceipt({ data: { sale_id: 5, reference: 'SL_005', html: '<html>factura</html>' } });
    expect(receipt).toEqual({ saleId: '5', reference: 'SL_005', html: '<html>factura</html>' });
  });

  it.each([
    [{ data: { sale_id: 5, reference: 'SL_005', html: '' } }],
    [{ data: { sale_id: 5, html: '<html/>' } }],
    [{ data: { reference: 'SL_005', html: '<html/>' } }],
    [{ data: {} }],
  ])('rejects malformed receipt payload %#', (payload) => {
    expect(() => parseMobileSaleReceipt(payload)).toThrow(MobileSaleReceiptError);
  });

  it('fetches the receipt using the bearer token, never a query-string token', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { sale_id: 9, reference: 'SL_009', html: '<html>ok</html>' } }));
    const receipt = await getMobileSaleReceipt({ ...auth, saleId: 9 });

    expect(receipt.html).toBe('<html>ok</html>');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://tenant.example/api/mobile/sales/9/receipt');
    expect(String(url)).not.toContain('access_token');
    expect(String(url)).not.toContain('token-value');
    expect((init as RequestInit)?.headers).toMatchObject({ Authorization: 'Bearer token-value' });
  });

  it.each([
    [401, 'unauthenticated', 'session_expired'],
    [403, 'forbidden', 'forbidden'],
    [404, 'not_found', 'not_found'],
    [500, 'server_error', 'server_error'],
  ])('maps HTTP %i to %s', async (status, code, expected) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: { code } }, status));
    await expect(getMobileSaleReceipt({ ...auth, saleId: 1 })).rejects.toMatchObject({ status: expected });
  });

  it('maps network failure to network_error', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new TypeError('Network request failed')));
    await expect(getMobileSaleReceipt({ ...auth, saleId: 1 })).rejects.toMatchObject({ status: 'network_error' });
  });
});
