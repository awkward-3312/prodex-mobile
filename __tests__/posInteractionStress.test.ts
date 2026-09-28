jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => '123e4567-e89b-42d3-a456-000000000001') }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: { version: 1, workspace: 'test', baseUrl: 'https://test.prodex.invalid', accessToken: 'token', tokenType: 'Bearer', expiresAt: null },
    user: { id: 9, email: 'cashier@prodex.test' },
  }),
}));
jest.mock('../src/services/sales/mobileSaleSubmissionService', () => ({ submitMobileSale: jest.fn() }));

import React from 'react';
import { act, create } from 'react-test-renderer';

import { PosCartProvider, usePosCart } from '../src/context/PosCartContext';
import type { PosProduct } from '../src/types/pos';

const product: PosProduct = {
  id: 'api:product:21:variant:none', productId: 21, productVariantId: null, name: 'Producto rápido', sku: 'FAST-21', barcode: '21000', barcodeSymbology: 'CODE128',
  category: 'General', price: 10, priceMinorUnits: 1000, stock: 100, manageStock: true, oversellingAllowed: false,
  canSell: true, stockStatus: 'Disponible', favorite: false, icon: 'cube-outline', tone: 'blue',
};

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function mountCart() {
  let latest!: ReturnType<typeof usePosCart>;
  function Harness() {
    latest = usePosCart();
    return null;
  }
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(PosCartProvider, null, React.createElement(Harness))); });
  return { get: () => latest, root };
}

it.each([10, 20])('does not lose any of %i rapid product adds', async (addCount) => {
  const { get, root } = mountCart();
  await flush();
  const addProduct = get().addProduct;

  act(() => { for (let tap = 0; tap < addCount; tap += 1) addProduct(product); });

  expect(get().items).toHaveLength(1);
  expect(get().items[0].quantity).toBe(addCount);
  expect(get().itemCount).toBe(addCount);
  act(() => root.unmount());
});

it('processes rapid +++++ in order and keeps cart action callbacks stable', async () => {
  const { get, root } = mountCart();
  await flush();
  const callbacks = { add: get().addProduct, increase: get().increase, decrease: get().decrease, remove: get().remove };
  act(() => callbacks.add(product));

  act(() => { for (let tap = 0; tap < 5; tap += 1) callbacks.increase(product.id); });

  expect(get().items[0].quantity).toBe(6);
  expect(get().addProduct).toBe(callbacks.add);
  expect(get().increase).toBe(callbacks.increase);
  expect(get().decrease).toBe(callbacks.decrease);
  expect(get().remove).toBe(callbacks.remove);
  act(() => root.unmount());
});

it('preserves reducer order for add, remove, and add in one interaction burst', async () => {
  const { get, root } = mountCart();
  await flush();
  const { addProduct, remove } = get();

  act(() => {
    addProduct(product);
    remove(product.id);
    addProduct(product);
  });

  expect(get().items).toHaveLength(1);
  expect(get().items[0].quantity).toBe(1);
  act(() => root.unmount());
});

it('keeps weighted quantity exact and variant identities separate', async () => {
  const { get, root } = mountCart();
  await flush();
  const weighted = { ...product, id: 'api:product:40:variant:401', productId: 40, productVariantId: 401, variantName: 'Rojo', manageStock: false };
  const otherVariant = { ...weighted, id: 'api:product:40:variant:402', productVariantId: 402, variantName: 'Azul' };

  act(() => {
    get().addProduct(weighted, 1.25);
    get().addProduct(otherVariant, 0.75);
  });

  expect(get().items.map((item) => [item.product.productVariantId, item.quantity])).toEqual([[401, 1.25], [402, 0.75]]);
  expect(get().itemCount).toBe(2);
  act(() => root.unmount());
});
