import {
  buildMobileInventoryQueryParams,
  getMobileInventory,
  mergeMobileInventoryPages,
  mobileInventoryItemKey,
  MobileInventoryError,
} from '../src/services/inventory/mobileInventoryService';
import type { MobileInventoryItem } from '../src/types/mobileInventory';

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
}

const inventoryItem = (overrides: Partial<MobileInventoryItem> = {}): MobileInventoryItem => ({
  product_id: 15,
  product_variant_id: null,
  name: 'iPhone X',
  variant_name: null,
  display_name: 'iPhone X',
  code: 'IPX-001',
  gtin: '07501000000123',
  category: { id: 7, name: 'Celulares' },
  image_url: null,
  inventory: {
    inventory_location_id: 3,
    quantity: '9.000',
    reserved_quantity: '0.000',
    available_quantity: '9.000',
    manage_stock: true,
    out_of_stock: false,
    low_stock: true,
  },
  ...overrides,
});

const inventoryResponse = (items: MobileInventoryItem[] = [inventoryItem()]) => ({
  data: {
    items,
    categories: [{ id: 7, name: 'Celulares' }],
    summary: { total_items: items.length, low_stock_count: 1, out_of_stock_count: 0 },
    pagination: { page: 1, per_page: 30, total: items.length, last_page: 1, has_more: false },
  },
});

const request = (overrides = {}) => getMobileInventory({
  baseUrl: 'https://tenant.example',
  accessToken: 'token-value',
  inventoryLocationId: 3,
  ...overrides,
});

describe('getMobileInventory', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the inventory URL with location, encoded search, category, stock_status and pagination', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(inventoryResponse()));
    await request({ search: 'iphone x', categoryId: 7, stockStatus: 'low_stock', page: 2, perPage: 50 });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/api/mobile/inventory?');
    expect(calledUrl).toContain('inventory_location_id=3');
    expect(calledUrl).toContain('search=iphone+x');
    expect(calledUrl).toContain('category_id=7');
    expect(calledUrl).toContain('stock_status=low_stock');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('per_page=50');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-value' }) }));
  });

  it('omits stock_status and category_id when not provided', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(inventoryResponse()));
    await request();

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).not.toContain('stock_status=');
    expect(calledUrl).not.toContain('category_id=');
  });

  it('unwraps the data envelope and preserves decimal quantity strings', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(inventoryResponse([inventoryItem({ inventory: { ...inventoryItem().inventory, quantity: '0.500', reserved_quantity: '0.000', available_quantity: '0.500' } })])));
    const response = await request();

    expect(response.items).toHaveLength(1);
    expect(response.items[0].inventory.available_quantity).toBe('0.500');
    expect(typeof response.items[0].inventory.available_quantity).toBe('string');
  });

  it('parses nullable variant, category and image fields', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(inventoryResponse([inventoryItem({ product_variant_id: null, variant_name: null, category: null, image_url: null })])));
    const response = await request();

    expect(response.items[0].product_variant_id).toBeNull();
    expect(response.items[0].variant_name).toBeNull();
    expect(response.items[0].category).toBeNull();
    expect(response.items[0].image_url).toBeNull();
  });

  it('parses variant rows keeping their own identity', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(inventoryResponse([inventoryItem({ product_variant_id: 38, variant_name: 'M', display_name: 'Camiseta · M' })])));
    const response = await request();

    expect(response.items[0].product_variant_id).toBe('38');
    expect(response.items[0].variant_name).toBe('M');
    expect(response.items[0].display_name).toBe('Camiseta · M');
  });

  it('parses summary and pagination', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(inventoryResponse()));
    const response = await request();

    expect(response.summary).toEqual({ total_items: 1, low_stock_count: 1, out_of_stock_count: 0 });
    expect(response.pagination).toEqual({ page: 1, per_page: 30, total: 1, last_page: 1, has_more: false });
  });

  it.each([
    [401, 'unauthenticated', 'session_expired'],
    [401, 'token_idle_timeout', 'session_expired'],
    [403, 'forbidden_location', 'forbidden_location'],
    [409, 'inventory_not_ready', 'inventory_not_ready'],
    [422, 'invalid_location', 'invalid_location'],
    [422, 'validation_error', 'validation_error'],
    [429, 'too_many_requests', 'rate_limited'],
    [500, 'server_failed', 'server_error'],
  ])('maps HTTP %i %s to %s', async (status, code, expected) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: { code } }, status));
    await expect(request()).rejects.toMatchObject({ status: expected });
    await expect(request()).rejects.toBeInstanceOf(MobileInventoryError);
  });

  it.each([
    [Promise.reject(new TypeError('Network request failed')), 'network_error'],
    [Promise.reject(new DOMException('Aborted', 'AbortError')), 'timeout'],
  ])('maps request failure to %s', async (rejection, expected) => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => rejection as Promise<Response>);
    await expect(request()).rejects.toMatchObject({ status: expected });
  });

  it('rejects malformed responses without items/categories', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { items: [{ product_id: 1 }] } }));
    await expect(request()).rejects.toBeInstanceOf(MobileInventoryError);
    await expect(request()).rejects.toMatchObject({ status: 'invalid_response' });
  });

  it('rejects a response missing summary', async () => {
    const payload = inventoryResponse();
    delete (payload.data as { summary?: unknown }).summary;
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(payload));
    await expect(request()).rejects.toMatchObject({ status: 'invalid_response' });
  });
});

describe('buildMobileInventoryQueryParams', () => {
  it('maps stock filter selection to the stock_status param', () => {
    expect(buildMobileInventoryQueryParams({ inventoryLocationId: 3, stockStatus: 'low_stock' }).get('stock_status')).toBe('low_stock');
    expect(buildMobileInventoryQueryParams({ inventoryLocationId: 3, stockStatus: 'out_of_stock' }).get('stock_status')).toBe('out_of_stock');
    expect(buildMobileInventoryQueryParams({ inventoryLocationId: 3, stockStatus: null }).has('stock_status')).toBe(false);
  });

  it('defaults page and per_page', () => {
    const params = buildMobileInventoryQueryParams({ inventoryLocationId: 3 });
    expect(params.get('page')).toBe('1');
    expect(params.get('per_page')).toBe('30');
  });
});

describe('mobile inventory pagination helpers', () => {
  it('appends page 2 and dedupes repeated items by composite identity', () => {
    const page1 = [inventoryItem({ product_id: 1, product_variant_id: null }), inventoryItem({ product_id: 2, product_variant_id: null })];
    const page2 = [inventoryItem({ product_id: 2, product_variant_id: null }), inventoryItem({ product_id: 3, product_variant_id: null })];
    expect(mergeMobileInventoryPages(page1, page2).map((item) => item.product_id)).toEqual([1, 2, 3]);
  });

  it('keeps a simple product and a variant of the same product as distinct rows', () => {
    const simple = inventoryItem({ product_id: 1, product_variant_id: null });
    const variant = inventoryItem({ product_id: 1, product_variant_id: 9 });
    expect(mergeMobileInventoryPages([simple], [variant])).toHaveLength(2);
    expect(mobileInventoryItemKey(simple)).not.toBe(mobileInventoryItemKey(variant));
  });

  it('does not identify rows by product_id alone', () => {
    const a = inventoryItem({ product_id: 1, product_variant_id: 5 });
    const b = inventoryItem({ product_id: 1, product_variant_id: 6 });
    expect(mobileInventoryItemKey(a)).not.toBe(mobileInventoryItemKey(b));
  });
});
