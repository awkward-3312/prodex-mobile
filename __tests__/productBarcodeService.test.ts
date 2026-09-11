import { posProducts } from '../src/config/posMockData';
import { addProductToCartItems } from '../src/context/PosCartContext';
import { buildApiCartProductId, findProductByBarcode, normalizeBarcodeSymbology, resolveProductByCode, resolveScannedProduct } from '../src/services/pos/productBarcodeService';
import type { CartItem, PosProduct } from '../src/types/pos';
import { calculateLineSubtotalMinorUnits, getCartSubtotal } from '../src/utils/posCart';

const product = (id: string): CartItem => {
  const selected = posProducts.find((item) => item.id === id);
  if (!selected) throw new Error(`Missing mock product ${id}`);
  return { product: selected, quantity: 1, unitPriceCents: Math.round(selected.price * 100) };
};

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as unknown as Response;
}

const apiProduct = (overrides: Record<string, unknown> = {}) => ({
  data: {
    match: { field: 'code', type: 'product', scanned_value: 'ABC123', scanner_type: 'code128', weighted: false },
    product: { id: 15, product_id: 15, product_variant_id: null, name: 'Café', product_name: 'Café', variant_name: null, code: 'ABC123', barcode_symbology: 'CODE128', unit: 'u', unit_id: 1 },
    pricing: { price: '148.50', source: 'base_pos_catalog' },
    inventory: { location_id: 3, inventory_location_id: 3, quantity: 24, reserved_quantity: 0, available_quantity: 24, manage_stock: true, out_of_stock: false, low_stock: false, overselling_allowed: false },
    sellability: { can_sell: true, reason: null },
    scan_quantity: 1,
    ...overrides,
  },
});

const request = (code = 'ABC123', cartItems: CartItem[] = []) => resolveScannedProduct({
  code,
  symbology: 'code128',
  tenantBaseUrl: 'https://prueba02.prodexhub.cloud',
  accessToken: 'token-value',
  inventoryLocationId: 3,
  cartItems,
});

describe('findProductByBarcode', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('finds an exact valid EAN barcode', () => {
    const result = findProductByBarcode('7501000000012');
    expect(result.status).toBe('found');
    if (result.status === 'found') expect(result.product.name).toBe('Café molido 500 g');
  });

  it('finds an exact internal Code 128 barcode', () => {
    const result = findProductByBarcode('PX-00000003');
    expect(result.status).toBe('found');
    if (result.status === 'found') expect(result.product.sku).toBe('REF-2L-001');
  });

  it('normalizes accidental surrounding spaces', () => {
    const result = findProductByBarcode(' 7501000000029 ');
    expect(result.status).toBe('found');
  });

  it('does not confuse SKU with barcode', () => {
    expect(findProductByBarcode('CAF-500-001').status).toBe('not_found');
  });

  it('rejects partial matches', () => {
    expect(findProductByBarcode('750100000001').status).toBe('not_found');
    expect(findProductByBarcode('PX-000000').status).toBe('not_found');
  });

  it('returns not_found for an unknown barcode', () => {
    const result = findProductByBarcode('9999999999999');
    expect(result).toEqual({ status: 'not_found', barcode: '9999999999999' });
  });

  it('identifies a product with no stock', () => {
    const result = findProductByBarcode('PX-00000007');
    expect(result.status).toBe('out_of_stock');
  });

  it('identifies when the current cart reached stock maximum', () => {
    const limited = posProducts.find((item) => item.id === 'prod-5');
    if (!limited) throw new Error('Missing limited mock product');
    const result = findProductByBarcode(limited.barcode, [{ ...product('prod-5'), quantity: limited.stock }]);
    expect(result.status).toBe('stock_limit_reached');
  });
});

describe('resolveScannedProduct backend integration', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('resolves a real simple product by code and sends scanner_type', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(apiProduct()));
    const result = await request();

    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.product.productId).toBe('15');
      expect(result.product.productVariantId).toBeNull();
      expect(result.product.price).toBe(148.5);
      expect(result.quantity).toBe(1);
    }

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/api/mobile/products/resolve?');
    expect(calledUrl).toContain('value=ABC123');
    expect(calledUrl).toContain('inventory_location_id=3');
    expect(calledUrl).toContain('scanner_type=code128');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-value' }) }));
  });

  it('preserves leading zeroes and alphanumeric values', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(apiProduct()));
    await request('00123-ABC');
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('value=00123-ABC');
  });

  it('maps a variant without collapsing it into the simple product', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(apiProduct({
      match: { field: 'code', type: 'product_variant', scanned_value: 'VAR500', scanner_type: 'code128', weighted: false },
      product: { id: 15, product_id: 15, product_variant_id: 38, product_name: 'Café', variant_name: '500 g', code: 'VAR500' },
    })));

    const result = await request('VAR500');
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.product.id).toBe('api:product:15:variant:38');
      expect(result.product.variantName).toBe('500 g');
    }
  });

  it('accepts GTIN fallback matches from the backend', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(apiProduct({
      match: { field: 'gtin', type: 'product', scanned_value: '07501000000012', scanner_type: 'ean13', weighted: false },
      product: { id: 15, product_id: 15, product_variant_id: null, product_name: 'Café', code: null, gtin: '07501000000012' },
    })));

    const result = await resolveScannedProduct({ code: '07501000000012', symbology: 'ean13', tenantBaseUrl: 'https://prueba02.prodexhub.cloud', accessToken: 'token-value', inventoryLocationId: 3 });
    expect(result.status).toBe('found');
    if (result.status === 'found') expect(result.product.barcode).toBe('07501000000012');
  });

  it.each([
    [404, 'product_not_found', 'not_found'],
    [409, 'ambiguous_code', 'ambiguous_code'],
    [422, 'invalid_location', 'invalid_location'],
    [403, 'forbidden_location', 'invalid_location'],
    [401, 'unauthenticated', 'session_expired'],
    [401, 'token_idle_timeout', 'session_expired'],
  ])('maps HTTP %i %s to %s', async (status, code, expected) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: { code } }, status));
    await expect(request()).resolves.toMatchObject({ status: expected });
  });

  it('does not sell when can_sell is false', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(apiProduct({
      sellability: { can_sell: false, reason: 'Producto bloqueado' },
    })));

    await expect(request()).resolves.toMatchObject({ status: 'not_sellable', reason: 'Producto bloqueado' });
  });

  it('returns out_of_stock when backend marks the product unsellable due to stock', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(apiProduct({
      inventory: { available_quantity: 0, manage_stock: true, out_of_stock: true, overselling_allowed: false },
      sellability: { can_sell: false, reason: 'Producto sin stock' },
    })));

    await expect(request()).resolves.toMatchObject({ status: 'out_of_stock' });
  });

  it('allows out of stock products when backend allows overselling', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(apiProduct({
      inventory: { available_quantity: 0, manage_stock: true, out_of_stock: true, overselling_allowed: true },
      sellability: { can_sell: true, reason: null },
    })));

    await expect(request()).resolves.toMatchObject({ status: 'found' });
  });

  it('blocks local cart quantity above available stock', async () => {
    const response = apiProduct({
      inventory: { available_quantity: 2, manage_stock: true, out_of_stock: false, overselling_allowed: false },
    });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(response));
    const existingProduct: PosProduct = {
      id: buildApiCartProductId(15),
      name: 'Café',
      sku: 'ABC123',
      barcode: 'ABC123',
      barcodeSymbology: 'CODE128',
      category: 'Abarrotes',
      price: 148.5,
      stock: 2,
      manageStock: true,
      oversellingAllowed: false,
      stockStatus: 'Disponible',
      favorite: false,
      icon: 'cube-outline',
      tone: 'blue',
    };

    await expect(request('ABC123', [{ product: existingProduct, quantity: 2, unitPriceCents: 14850 }])).resolves.toMatchObject({ status: 'stock_limit_reached' });
  });

  it('supports weighted scan quantities', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(apiProduct({
      match: { field: 'weighted', type: 'product', scanned_value: '200123400735', scanner_type: 'ean13', weighted: true },
      scan_quantity: 0.735,
    })));

    const result = await request('200123400735');
    expect(result.status).toBe('found');
    if (result.status === 'found') expect(result.quantity).toBe(0.735);
  });

  it.each([
    [Promise.reject(new TypeError('Network request failed')), 'network_error'],
    [Promise.reject(new DOMException('Aborted', 'AbortError')), 'timeout'],
  ])('maps request failure to %s', async (rejection, expected) => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => rejection as Promise<Response>);
    await expect(request()).resolves.toMatchObject({ status: expected });
  });

  it('rejects malformed successful responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ data: { product: { id: 1 } } }));
    await expect(request()).resolves.toMatchObject({ status: 'invalid_product_response' });
  });
});

describe('cart identity and decimal quantities', () => {
  const baseProduct: PosProduct = {
    id: 'api:product:15',
    source: 'api',
    productId: 15,
    productVariantId: null,
    name: 'Café',
    sku: 'ABC123',
    barcode: 'ABC123',
    barcodeSymbology: 'CODE128',
    category: 'Abarrotes',
    price: 148.5,
    stock: 10,
    manageStock: true,
    oversellingAllowed: false,
    stockStatus: 'Disponible',
    favorite: false,
    icon: 'cube-outline',
    tone: 'blue',
  };

  it('adds a simple product once and increments the same line', () => {
    const once = addProductToCartItems([], baseProduct, 1);
    const twice = addProductToCartItems(once, baseProduct, 1);
    expect(twice).toHaveLength(1);
    expect(twice[0].quantity).toBe(2);
  });

  it('keeps two variants as distinct cart lines', () => {
    const variantA = { ...baseProduct, id: 'api:product:15:variant:38', productVariantId: 38, variantName: '500 g' };
    const variantB = { ...baseProduct, id: 'api:product:15:variant:39', productVariantId: 39, variantName: '1 kg' };
    const items = addProductToCartItems(addProductToCartItems([], variantA, 1), variantB, 1);
    expect(items.map((item) => item.product.id)).toEqual(['api:product:15:variant:38', 'api:product:15:variant:39']);
  });

  it('increments the matching variant only', () => {
    const variantA = { ...baseProduct, id: 'api:product:15:variant:38', productVariantId: 38 };
    const variantB = { ...baseProduct, id: 'api:product:15:variant:39', productVariantId: 39 };
    const items = addProductToCartItems(addProductToCartItems(addProductToCartItems([], variantA, 1), variantB, 1), variantA, 1);
    expect(items.find((item) => item.product.id === variantA.id)?.quantity).toBe(2);
    expect(items.find((item) => item.product.id === variantB.id)?.quantity).toBe(1);
  });

  it('respects stock maximum unless overselling is enabled', () => {
    const limited = { ...baseProduct, stock: 2, manageStock: true, oversellingAllowed: false };
    const blocked = addProductToCartItems(addProductToCartItems([], limited, 2), limited, 1);
    expect(blocked[0].quantity).toBe(2);

    const oversell = { ...limited, id: 'api:product:16', oversellingAllowed: true };
    const allowed = addProductToCartItems(addProductToCartItems([], oversell, 2), oversell, 1);
    expect(allowed[0].quantity).toBe(3);
  });

  it('uses scan_quantity 1 and weighted decimal quantities', () => {
    expect(addProductToCartItems([], baseProduct)[0].quantity).toBe(1);
    expect(addProductToCartItems([], baseProduct, 0.735)[0].quantity).toBe(0.735);
  });

  it('calculates weighted subtotals using scaled quantities', () => {
    expect(calculateLineSubtotalMinorUnits(14850, 0.735)).toBe(10915);
    expect(getCartSubtotal([{ product: baseProduct, quantity: 0.735, unitPriceCents: 14850 }])).toBe(10915);
  });
});

describe('normalizeBarcodeSymbology', () => {
  test.each([
    ['code128', 'CODE128'],
    ['code39', 'CODE39'],
    ['ean8', 'EAN8'],
    ['ean13', 'EAN13'],
    ['upc_a', 'UPC'],
    ['upc_e', 'UPC'],
  ])('%s normalizes to %s', (input, expected) => {
    expect(normalizeBarcodeSymbology(input)).toBe(expected);
  });

  it('handles unsupported types safely', () => {
    expect(normalizeBarcodeSymbology('qr')).toBeNull();
    expect(resolveProductByCode({ code: '7501000000012', symbology: 'qr' }).status).toBe('not_found');
  });

  it('resolves the exact code independently of SKU', () => {
    const result = resolveProductByCode({ code: '7501000000012', symbology: 'ean13' });
    expect(result.status).toBe('found');
    expect(resolveProductByCode({ code: 'CAF-500-001', symbology: 'code128' }).status).toBe('not_found');
  });
});
