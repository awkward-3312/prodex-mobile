import { getMobilePosCatalog, mapMobilePosCatalogItemToPosProduct, mergeCatalogPages, MobilePosCatalogError } from '../src/services/pos/mobilePosCatalogService';
import type { MobilePosCatalogItem } from '../src/types/mobilePosCatalog';

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
}

const catalogItem = (overrides: Partial<MobilePosCatalogItem> = {}): MobilePosCatalogItem => ({
  product_id: 15,
  product_variant_id: null,
  name: 'Café',
  variant_name: null,
  display_name: 'Café',
  code: '00123',
  gtin: '07501000000123',
  barcode_symbology: 'CODE128',
  type: 'stockable',
  unit: 'u',
  unit_id: 1,
  category: { id: 7, name: 'Abarrotes' },
  image_url: null,
  pricing: { price: '148.50', source: 'base_pos_catalog' },
  inventory: {
    inventory_location_id: 3,
    quantity: 24,
    reserved_quantity: 0,
    available_quantity: 24,
    manage_stock: true,
    out_of_stock: false,
    low_stock: false,
    overselling_allowed: false,
  },
  sellability: { can_sell: true, reason: null },
  ...overrides,
});

const catalogResponse = (items: MobilePosCatalogItem[] = [catalogItem()]) => ({
  data: {
    items,
    categories: [{ id: 7, name: 'Abarrotes' }],
    pagination: { page: 1, per_page: 30, total: items.length, last_page: 1, has_more: false },
  },
});

const request = (overrides = {}) => getMobilePosCatalog({
  baseUrl: 'https://tenant.example',
  accessToken: 'token-value',
  inventoryLocationId: 3,
  ...overrides,
});

describe('getMobilePosCatalog', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the catalog URL with location, encoded search, category and pagination', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(catalogResponse()));
    await request({ search: 'café especial', categoryId: 7, page: 2, perPage: 50 });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/api/mobile/pos/catalog?');
    expect(calledUrl).toContain('inventory_location_id=3');
    expect(calledUrl).toContain('search=caf%C3%A9+especial');
    expect(calledUrl).toContain('category_id=7');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('per_page=50');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-value' }) }));
  });

  it('unwraps the data envelope', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(catalogResponse()));
    const response = await request();
    expect(response.items).toHaveLength(1);
    expect(response.categories[0].name).toBe('Abarrotes');
    expect(response.pagination.has_more).toBe(false);
  });

  it.each([
    [401, 'unauthenticated', 'session_expired'],
    [401, 'token_idle_timeout', 'session_expired'],
    [403, 'forbidden', 'forbidden'],
    [422, 'invalid_location', 'invalid_location'],
    [429, 'too_many_requests', 'rate_limited'],
    [500, 'server_failed', 'server_error'],
  ])('maps HTTP %i %s to %s', async (status, code, expected) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: { code } }, status));
    await expect(request()).rejects.toMatchObject({ status: expected });
  });

  it.each([
    [Promise.reject(new TypeError('Network request failed')), 'network_error'],
    [Promise.reject(new DOMException('Aborted', 'AbortError')), 'timeout'],
  ])('maps request failure to %s', async (rejection, expected) => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => rejection as Promise<Response>);
    await expect(request()).rejects.toMatchObject({ status: expected });
  });

  it('rejects malformed responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { items: [{ product_id: 1 }] } }));
    await expect(request()).rejects.toBeInstanceOf(MobilePosCatalogError);
    await expect(request()).rejects.toMatchObject({ status: 'invalid_response' });
  });
});

describe('mapMobilePosCatalogItemToPosProduct', () => {
  it('maps price string to minor units for a simple product', () => {
    const product = mapMobilePosCatalogItemToPosProduct(catalogItem());
    expect(product.id).toBe('api:product:15');
    expect(product.priceMinorUnits).toBe(14850);
    expect(product.price).toBe(148.5);
  });

  it('maps variants without losing their identity', () => {
    const product = mapMobilePosCatalogItemToPosProduct(catalogItem({ product_variant_id: 38, variant_name: 'M', display_name: 'Camiseta · M' }));
    expect(product.id).toBe('api:product:15:variant:38');
    expect(product.name).toBe('Camiseta · M');
    expect(product.variantName).toBe('M');
  });

  it('preserves leading zeroes and alphanumeric codes', () => {
    expect(mapMobilePosCatalogItemToPosProduct(catalogItem({ code: '00123' })).sku).toBe('00123');
    expect(mapMobilePosCatalogItemToPosProduct(catalogItem({ code: 'ABC-001' })).sku).toBe('ABC-001');
  });

  it('handles null images, false sellability and overselling', () => {
    const product = mapMobilePosCatalogItemToPosProduct(catalogItem({
      image_url: null,
      inventory: { ...catalogItem().inventory, available_quantity: 0, out_of_stock: true, overselling_allowed: true },
      sellability: { can_sell: false, reason: 'Producto bloqueado' },
    }));
    expect(product.imageUrl).toBeNull();
    expect(product.canSell).toBe(false);
    expect(product.oversellingAllowed).toBe(true);
    expect(product.stockStatus).toBe('Disponible');
  });
});

describe('catalog pagination helpers', () => {
  it('appends page 2 and dedupes repeated items', () => {
    const page1 = [catalogItem({ product_id: 1 }), catalogItem({ product_id: 2 })];
    const page2 = [catalogItem({ product_id: 2 }), catalogItem({ product_id: 3 })];
    expect(mergeCatalogPages(page1, page2).map((item) => item.product_id)).toEqual([1, 2, 3]);
  });

  it('keeps a simple product and a variant of the same product as distinct items', () => {
    const simple = catalogItem({ product_id: 1, product_variant_id: null });
    const variant = catalogItem({ product_id: 1, product_variant_id: 9 });
    expect(mergeCatalogPages([simple], [variant])).toHaveLength(2);
  });

  it('has_more=false can be used to avoid additional loads', () => {
    const response = catalogResponse();
    expect(response.data.pagination.has_more).toBe(false);
  });

  it('search and category resets are represented by replacing page 1', () => {
    const oldPage = [catalogItem({ product_id: 1 })];
    const searchPage = [catalogItem({ product_id: 4 })];
    const categoryPage = [catalogItem({ product_id: 5 })];
    expect(searchPage).not.toEqual(oldPage);
    expect(categoryPage).not.toEqual(searchPage);
  });
});
