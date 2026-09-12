import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';

const mockGetReceipt = jest.fn();
jest.mock('../src/services/sales/mobileSaleReceiptService', () => ({
  ...jest.requireActual('../src/services/sales/mobileSaleReceiptService'),
  getMobileSaleReceipt: (...args: unknown[]) => mockGetReceipt(...args),
}));

const mockWebView = jest.fn((_props: unknown) => null);
jest.mock('react-native-webview', () => ({ WebView: (props: unknown) => { mockWebView(props); return null; } }));

// Reanimated/worklets need native/jest setup this project does not configure yet - swap
// the motion components for plain Pressable/View so this test exercises the real data
// flow (fetch/retry/callbacks) without pulling in unconfigured native worklet code.
jest.mock('../src/components/motion', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    PressableScale: ({ children, onPress, ...props }: any) => React.createElement(Pressable, { onPress, ...props }, children),
    FadeInView: ({ children, style }: any) => React.createElement(View, { style }, children),
  };
});

import { SaleInvoiceScreen } from '../src/components/pos/payment/SaleInvoiceScreen';
import { SaleConfirmation } from '../src/components/pos/payment/SaleConfirmation';
import type { SaleAttempt } from '../src/types/mobileSaleSubmission';

const attempt: SaleAttempt = {
  version: 1,
  owner: 'tenant|user',
  request: { sale_uuid: '123e4567-e89b-42d3-a456-000000000001', client_id: 3, lines: [], payments: [] },
  currency: { code: 'HNL', symbol: 'L.', price_decimals: 2 },
  response: { success: true, idempotent: false, sale: { id: 5, ref: 'SL_005', sale_uuid: '123e4567-e89b-42d3-a456-000000000001', grand_total: '115.00', payment_status: 'paid', fiscal_number: null, fiscal_status: null } },
};

function findAllText(root: ReturnType<typeof create>): string[] {
  return root.root.findAllByType(Text).map((node) => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children ?? '')));
}

function pressByText(root: ReturnType<typeof create>, label: string) {
  const textNode = root.root.findAllByType(Text).find((node) => (Array.isArray(node.props.children) ? node.props.children.join('') : node.props.children) === label);
  if (!textNode) throw new Error(`No text node found for "${label}"`);
  let node: any = textNode.parent;
  while (node && typeof node.props.onPress !== 'function') node = node.parent;
  if (!node) throw new Error(`No pressable ancestor found for "${label}"`);
  act(() => { node.props.onPress(); });
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

// Mirrors app/pos/checkout.tsx's real wiring: SaleInvoiceScreen driven by the confirmed
// attempt, falling back to SaleConfirmation (with a retry) if the receipt fails to load.
function renderCheckoutInvoice(onNewSale: () => void, onSales: () => void, onSessionExpired?: () => void) {
  return React.createElement(SaleInvoiceScreen, {
    saleId: attempt.response!.sale.id,
    baseUrl: 'https://tenant.example',
    accessToken: 'token-1',
    primaryAction: { label: 'Nueva venta', onPress: onNewSale },
    secondaryAction: { label: 'Ver ventas', onPress: onSales },
    onSessionExpired,
    renderFallback: (retry: () => void) => React.createElement(SaleConfirmation, { attempt, onNewSale, onSales, onRetryInvoice: retry }),
  });
}

beforeEach(() => {
  mockGetReceipt.mockReset();
  mockWebView.mockReset();
});

it('fetches the receipt with the mobile bearer session and renders it as the success screen (factura)', async () => {
  mockGetReceipt.mockResolvedValue({ saleId: '5', reference: 'SL_005', html: '<html>factura oficial</html>' });
  const onNewSale = jest.fn();
  const onSales = jest.fn();

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(renderCheckoutInvoice(onNewSale, onSales)); });

  expect(mockGetReceipt).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: 'https://tenant.example', accessToken: 'token-1', saleId: 5 }));
  expect(mockWebView).toHaveBeenCalledWith(expect.objectContaining({ source: { html: '<html>factura oficial</html>' } }));
  expect(findAllText(root)).toContain('Factura');

  pressByText(root, 'Nueva venta');
  expect(onNewSale).toHaveBeenCalledTimes(1);
  pressByText(root, 'Ver ventas');
  expect(onSales).toHaveBeenCalledTimes(1);
});

it('shows a loading state before the receipt resolves', async () => {
  let resolveReceipt!: (value: unknown) => void;
  mockGetReceipt.mockImplementation(() => new Promise((resolve) => { resolveReceipt = resolve; }));

  let root!: ReturnType<typeof create>;
  act(() => { root = create(renderCheckoutInvoice(jest.fn(), jest.fn())); });

  expect(findAllText(root)).toContain('Cargando factura...');
  expect(mockWebView).not.toHaveBeenCalled();

  await act(async () => { resolveReceipt({ saleId: '5', reference: 'SL_005', html: '<html>ok</html>' }); await Promise.resolve(); await Promise.resolve(); });
  expect(mockWebView).toHaveBeenCalled();
});

it('keeps the sale as confirmed and offers a retry when the receipt endpoint fails - never re-submits the sale', async () => {
  mockGetReceipt.mockRejectedValueOnce(new Error('network_error'));
  const onNewSale = jest.fn();
  const onSales = jest.fn();

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(renderCheckoutInvoice(onNewSale, onSales)); });

  const texts = findAllText(root);
  expect(texts).toContain('Venta registrada');
  expect(texts.join(' ')).toContain('Venta registrada correctamente');
  expect(texts).toContain('SL_005');
  expect(mockWebView).not.toHaveBeenCalled();

  mockGetReceipt.mockResolvedValueOnce({ saleId: '5', reference: 'SL_005', html: '<html>recovered</html>' });
  await act(async () => { pressByText(root, 'Reintentar factura'); await Promise.resolve(); await Promise.resolve(); });

  expect(mockGetReceipt).toHaveBeenCalledTimes(2);
  expect(mockWebView).toHaveBeenCalledWith(expect.objectContaining({ source: { html: '<html>recovered</html>' } }));
});

it('calls onSessionExpired on a 401 instead of showing the fallback, and never fetches twice on mount (no render loop)', async () => {
  const { MobileSaleReceiptError } = jest.requireActual('../src/services/sales/mobileSaleReceiptService');
  mockGetReceipt.mockRejectedValue(new MobileSaleReceiptError('session_expired', 'Session expired'));
  const onSessionExpired = jest.fn();

  await act(async () => { create(renderCheckoutInvoice(jest.fn(), jest.fn(), onSessionExpired)); await flush(); });

  expect(onSessionExpired).toHaveBeenCalledTimes(1);
  expect(mockGetReceipt).toHaveBeenCalledTimes(1);
});
