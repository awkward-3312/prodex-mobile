import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => '123e4567-e89b-42d3-a456-000000000001') }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: { version: 1, workspace: 'prueba02', baseUrl: 'https://prueba02.prodexhub.cloud', accessToken: 'token-1', tokenType: 'Bearer', expiresAt: null },
    user: { id: 1, email: 'cajero@prodex.test' },
  }),
}));

const mockSend = jest.fn();
jest.mock('../src/services/sales/mobileSaleSubmissionService', () => ({
  ...jest.requireActual('../src/services/sales/mobileSaleSubmissionService'),
  submitMobileSale: (...args: unknown[]) => mockSend(...args),
}));

import { PosCartProvider, usePosCart } from '../src/context/PosCartContext';
import type { PosProduct } from '../src/types/pos';
import type { SalePreflightRequest } from '../src/types/mobilePosSalePreflight';
import type { SaleSubmissionRequest } from '../src/types/mobileSaleSubmission';

const product: PosProduct = {
  id: 'p1', productId: 10, productVariantId: null, name: 'Producto', sku: 'SKU1', barcode: '000', barcodeSymbology: 'CODE128',
  category: 'General', price: 100, priceMinorUnits: 10000, stock: 5, manageStock: true, oversellingAllowed: false,
  stockStatus: 'Disponible', favorite: false, icon: 'cube-outline', tone: 'blue',
};
const currency = { code: 'HNL', symbol: 'L.', price_decimals: 2 };
function success(request: SaleSubmissionRequest, idempotent = false) {
  return { success: true as const, idempotent, sale: { id: 9, ref: 'SL_009', sale_uuid: request.sale_uuid, grand_total: '115.00', payment_status: 'paid' as const, fiscal_number: null, fiscal_status: null } };
}

/** Mirrors app/pos/checkout.tsx's exact branch conditions, so this test fails the way the physical bug did if that contract regresses. */
function screenLabel(cart: ReturnType<typeof usePosCart>): 'success' | 'confirming' | 'pending_confirmation' | 'empty' | 'checkout' {
  if (cart.submission.status === 'success' && cart.submission.attempt?.response) return 'success';
  if (cart.cartLocked) return cart.submission.status === 'submitting' || cart.submission.status === 'loading' ? 'confirming' : 'pending_confirmation';
  if (cart.items.length === 0) return 'empty';
  return 'checkout';
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function mount() {
  let latest!: ReturnType<typeof usePosCart>;
  function Harness() {
    latest = usePosCart();
    return null;
  }
  act(() => { create(React.createElement(PosCartProvider, null, React.createElement(Harness))); });
  return () => latest;
}

const intent: SalePreflightRequest = { client_id: 3, lines: [{ product_id: 10, product_variant_id: null, quantity: '1.000' }], payment_intent: [{ payment_method_id: 7, amount: '115.00', account_id: null }] };
const validatedKey = 'validated-key';

async function confirmSale(get: () => ReturnType<typeof usePosCart>) {
  await act(async () => {
    await get().saleSubmission.start({ intent, currentKey: validatedKey, validatedKey, canSubmit: true, currency, token: 'token-1' });
  });
}

beforeEach(() => { mockSend.mockReset(); });

it('walks the exact confirm flow the checkout screen renders: preflight valid -> tap -> submitting -> success -> cart clears', async () => {
  const get = mount();
  await flush();
  act(() => { get().addProduct(product); });
  expect(screenLabel(get())).toBe('checkout');

  let resolveSend!: (value: ReturnType<typeof success>) => void;
  mockSend.mockImplementation(() => new Promise((resolve) => { resolveSend = resolve; }));

  let startPromise!: Promise<void>;
  act(() => {
    startPromise = get().saleSubmission.start({ intent, currentKey: validatedKey, validatedKey, canSubmit: true, currency, token: 'token-1' });
  });
  // Immediately on tap (synchronously, before the network call resolves), the screen
  // must leave the "validated, not yet confirmed" state - this is the physical bug.
  expect(screenLabel(get())).toBe('confirming');
  expect(get().items).toHaveLength(1); // cart not cleared yet

  await flush(); // let the pending storage write resolve so the network call actually fires
  resolveSend(success(mockSend.mock.calls[0][0].request));
  await act(async () => { await startPromise; });

  expect(screenLabel(get())).toBe('success');
  expect(get().items).toHaveLength(0); // cleared only after confirmed success
});

it('sends a single POST when the confirm tap is duplicated (double tap protection)', async () => {
  const get = mount();
  await flush();
  act(() => { get().addProduct(product); });
  mockSend.mockResolvedValue(success({ sale_uuid: '123e4567-e89b-42d3-a456-000000000001', client_id: 3, lines: [], payments: [] } as unknown as SaleSubmissionRequest));

  await act(async () => {
    await Promise.all([
      get().saleSubmission.start({ intent, currentKey: validatedKey, validatedKey, canSubmit: true, currency, token: 'token-1' }),
      get().saleSubmission.start({ intent, currentKey: validatedKey, validatedKey, canSubmit: true, currency, token: 'token-1' }),
    ]);
  });
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(screenLabel(get())).toBe('success');
});

it('treats idempotent=true as success', async () => {
  const get = mount();
  await flush();
  act(() => { get().addProduct(product); });
  mockSend.mockImplementation(({ request }: { request: SaleSubmissionRequest }) => Promise.resolve(success(request, true)));

  await confirmSale(get);
  await flush();
  expect(screenLabel(get())).toBe('success');
  expect(get().submission.attempt?.response?.idempotent).toBe(true);
});

it('keeps the cart and UUID and shows the pending-confirmation screen on a timeout, never the stale validated screen', async () => {
  const get = mount();
  await flush();
  act(() => { get().addProduct(product); });
  mockSend.mockRejectedValueOnce(new Error('timeout'));

  await confirmSale(get);
  await flush();

  expect(screenLabel(get())).toBe('pending_confirmation');
  expect(get().items).toHaveLength(1);
  const uuidAfterTimeout = get().submission.attempt?.request.sale_uuid;
  expect(uuidAfterTimeout).toBeTruthy();

  mockSend.mockResolvedValueOnce(success({ sale_uuid: uuidAfterTimeout } as unknown as SaleSubmissionRequest));
  await act(async () => { await get().saleSubmission.retry('token-1'); });
  await flush();
  expect(mockSend.mock.calls[1][0].request.sale_uuid).toBe(uuidAfterTimeout);
  expect(screenLabel(get())).toBe('success');
});
