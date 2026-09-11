import { posProducts } from '../src/config/posMockData';
import { findProductByBarcode, normalizeBarcodeSymbology, resolveProductByCode } from '../src/services/pos/productBarcodeService';
import type { CartItem } from '../src/types/pos';

const product = (id: string): CartItem => {
  const selected = posProducts.find((item) => item.id === id);
  if (!selected) throw new Error(`Missing mock product ${id}`);
  return { product: selected, quantity: 1, unitPriceCents: Math.round(selected.price * 100) };
};

describe('findProductByBarcode', () => {
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
