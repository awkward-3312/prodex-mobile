import { cartItemsToPreflightLines, fiscalSummaryFromPreflight, getCheckoutContext, MobilePosCheckoutError, needsAuthoritativeAmountRetry, parseSalePreflightResponse, paymentIntentLine, preflightSale, quantityToPreflightString, searchClients } from '../src/services/pos/mobilePosCheckoutService';
import type { CartItem, PosProduct } from '../src/types/pos';

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
}

const auth = { baseUrl: 'https://tenant.example', accessToken: 'token-value' };

const checkoutContext = () => ({
  data: {
    operational_context: {
      branch: { id: 1, name: 'Sucursal 1' },
      inventory_location: { id: 3, name: 'Piso de venta' },
      cash_drawer: { id: 8, name: 'Caja1' },
    },
    customer: { default: { id: 5, name: 'Cliente Default', tax_number: '08011999123456' } },
    payment_methods: [
      { id: 10, name: 'Efectivo', type: 'cash', is_cash: true, is_card: false, requires_account: false, is_supported: true, is_available: true, supports_change: true, stripe_supported: false },
      { id: 11, name: 'Tarjeta externa', type: 'card', is_cash: false, is_card: true, requires_account: true, is_supported: true, is_available: true, supports_change: false, stripe_supported: false },
      { id: 12, name: 'No móvil', type: 'other', is_cash: false, is_card: false, requires_account: false, is_supported: false, is_available: true, supports_change: false, stripe_supported: false },
    ],
    accounts: [{ id: 99, name: 'Banco principal', payment_method_id: 11 }],
    tax_config: { prices_include_tax: false, default_tax_rate: '0.15' },
    currency: { code: 'HNL', symbol: 'L', price_decimals: 2 },
    pricing: { price_list_id: 1, price_list_name: 'General' },
    capabilities: { can_create_sale: true, reason: null, mixed_payments: true },
  },
});

const clients = () => ({
  data: {
    items: [{ id: 7, name: 'Cliente Uno', phone: '9999-9999', tax_number: '0801' }],
    pagination: { page: 1, per_page: 20, total: 1, last_page: 1, has_more: false },
  },
});

const preflight = (overrides: Record<string, unknown> = {}): { data: Record<string, unknown> } => ({
  data: {
    can_submit: true,
    totals: {
      merchandise_total: '450.00',
      net_total: '450.00',
      subtotal: '450.00',
      subtotal_excluding_tax: '450.00',
      subtotal_including_tax: '517.50',
      tax: '67.50',
      discount: '0.00',
      shipping: '0.00',
      grand_total: '517.50',
    },
    lines: [{ product_id: 15, product_variant_id: null, quantity: '1.000', unit_price: '450.00', net_unit_price: '450.00', net_subtotal: '450.00', subtotal: '450.00', total: '517.50', tax: { amount: '67.50' } }],
    payments: { requested: [{ payment_method_id: 10, amount_applied: '517.50' }], applied_total: '517.50', change: '0.00', remaining_due: '0.00' },
    errors: [],
    ...overrides,
  },
});

const product = (overrides: Partial<PosProduct> = {}): PosProduct => ({
  id: 'api:product:15',
  source: 'api',
  productId: 15,
  productVariantId: null,
  name: 'Café',
  sku: 'ABC',
  barcode: 'ABC',
  barcodeSymbology: 'CODE128',
  category: 'Abarrotes',
  price: 450,
  priceMinorUnits: 45000,
  stock: 10,
  stockStatus: 'Disponible',
  favorite: false,
  icon: 'cube-outline',
  tone: 'blue',
  ...overrides,
});

describe('mobile POS checkout service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('parses checkout context and keeps payment methods dynamic', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(checkoutContext()));
    const response = await getCheckoutContext(auth);

    expect(response.operational_context.branch?.name).toBe('Sucursal 1');
    expect(response.customer.default?.id).toBe(5);
    expect(response.customer.default?.rtn).toBe('08011999123456');
    expect(response.payment_methods.map((method) => method.id)).toEqual([10, 11, 12]);
    expect(response.payment_methods.filter((method) => method.is_supported && method.is_available).map((method) => method.name)).toEqual(['Efectivo', 'Tarjeta externa']);
    expect(response.capabilities.mixed_payments).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://tenant.example/api/mobile/pos/checkout-context');
  });

  it('searches clients with encoded search and pagination', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(clients()));
    const response = await searchClients({ ...auth, search: 'Juan RTN', page: 2, perPage: 10 });

    expect(response.items[0].name).toBe('Cliente Uno');
    expect(response.items[0].rtn).toBe('0801');
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/api/mobile/pos/clients?');
    expect(calledUrl).toContain('search=Juan+RTN');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('per_page=10');
  });

  it('posts simple preflight requests without calling real sales', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(preflight()));
    const request = { client_id: 5, lines: [{ product_id: 15, product_variant_id: null, quantity: '1.000' }], payment_intent: [paymentIntentLine(10, 51750)] };
    const response = await preflightSale({ ...auth, request });

    expect(response.can_submit).toBe(true);
    expect(response.payments.total_paid).toBe('517.50');
    expect(response.payments.balance_due).toBe('0.00');
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://tenant.example/api/mobile/pos/sale-preflight');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('/api/mobile/sales');
  });

  it('maps cart simple and variant lines with decimal quantities', () => {
    const items: CartItem[] = [
      { product: product(), quantity: 1, unitPriceCents: 45000 },
      { product: product({ id: 'api:product:15:variant:38', productVariantId: 38, variantName: 'M' }), quantity: 0.735, unitPriceCents: 45000 },
    ];

    expect(cartItemsToPreflightLines(items)).toEqual([
      { product_id: 15, product_variant_id: null, quantity: '1.000' },
      { product_id: 15, product_variant_id: 38, quantity: '0.735' },
    ]);
    expect(quantityToPreflightString(1.2345)).toBe('1.235');
  });

  it('uses fiscal totals without double-counting tax', () => {
    const summary = fiscalSummaryFromPreflight(parseSalePreflightResponse(preflight()));
    expect(summary.subtotalCents).toBe(45000);
    expect(summary.taxCents).toBe(6750);
    expect(summary.totalCents).toBe(51750);
    expect(summary.totalCents).not.toBe(58500);
  });

  it.each([
    ['insufficient_stock', { available_quantity: '2.000', requested_quantity: '3.000' }],
    ['invalid_client', {}],
  ])('parses preflight business error %s', async (code, extra) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(preflight({
      can_submit: false,
      errors: [{ code, message: code, ...extra }],
    })));

    const response = await preflightSale({ ...auth, request: { client_id: 5, lines: [{ product_id: 15, product_variant_id: null, quantity: '1.000' }], payment_intent: [paymentIntentLine(10, 51750)] } });
    expect(response.can_submit).toBe(false);
    expect(response.errors[0].code).toBe(code);
  });

  it.each([
    [401, 'unauthenticated', 'session_expired'],
    [401, 'token_idle_timeout', 'session_expired'],
  ])('maps auth error %i %s', async (status, code, expected) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: { code } }, status));
    await expect(getCheckoutContext(auth)).rejects.toMatchObject({ status: expected });
  });

  it.each([
    [Promise.reject(new TypeError('Network request failed')), 'network_error'],
    [Promise.reject(new DOMException('Aborted', 'AbortError')), 'timeout'],
  ])('maps request failure to %s', async (rejection, expected) => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => rejection as Promise<Response>);
    await expect(getCheckoutContext(auth)).rejects.toMatchObject({ status: expected });
  });

  it('rejects malformed checkout context', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { payment_methods: [{}] } }));
    await expect(getCheckoutContext(auth)).rejects.toBeInstanceOf(MobilePosCheckoutError);
    await expect(getCheckoutContext(auth)).rejects.toMatchObject({ status: 'invalid_response' });
  });

  describe('needsAuthoritativeAmountRetry (auto tax preflight self-correction)', () => {
    const mismatch = parseSalePreflightResponse(preflight({ can_submit: false, errors: [{ code: 'payment_total_invalid', message: 'mismatch' }] }));
    const insufficientStock = parseSalePreflightResponse(preflight({ can_submit: false, errors: [{ code: 'insufficient_stock', message: 'no stock' }] }));
    const validated = parseSalePreflightResponse(preflight());

    it('retries once when the estimated (pre-tax) amount the user never typed does not match the authoritative total', () => {
      expect(needsAuthoritativeAmountRetry(mismatch, { usingAutoAmount: true, alreadyRetried: false })).toBe(true);
    });

    it('never retries a second time for the same attempt (would loop)', () => {
      expect(needsAuthoritativeAmountRetry(mismatch, { usingAutoAmount: true, alreadyRetried: true })).toBe(false);
    });

    it('never silently overwrites an amount the user explicitly typed', () => {
      expect(needsAuthoritativeAmountRetry(mismatch, { usingAutoAmount: false, alreadyRetried: false })).toBe(false);
    });

    it('does not mask a real business rejection as an amount mismatch', () => {
      expect(needsAuthoritativeAmountRetry(insufficientStock, { usingAutoAmount: true, alreadyRetried: false })).toBe(false);
    });

    it('does not retry once the sale already validates', () => {
      expect(needsAuthoritativeAmountRetry(validated, { usingAutoAmount: true, alreadyRetried: false })).toBe(false);
    });
  });
});
