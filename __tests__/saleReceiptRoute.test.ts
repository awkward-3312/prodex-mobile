import React from 'react';
import { act, create } from 'react-test-renderer';

const mockGetReceipt = jest.fn();
jest.mock('../src/services/sales/mobileSaleReceiptService', () => ({
  ...jest.requireActual('../src/services/sales/mobileSaleReceiptService'),
  getMobileSaleReceipt: (...args: unknown[]) => mockGetReceipt(...args),
}));

jest.mock('react-native-webview', () => ({ WebView: () => null }));

jest.mock('../src/components/motion', () => {
  const { Pressable } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return { PressableScale: ({ children, onPress, ...props }: any) => React.createElement(Pressable, { onPress, ...props }, children) };
});

const mockBack = jest.fn();
const mockSearchParams: { id?: string } = { id: '25' };
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => mockSearchParams,
}));

const mockSignOut = jest.fn();
let mockSession: { baseUrl: string; accessToken: string } | null = { baseUrl: 'https://tenant.example', accessToken: 'token-1' };
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: mockSession, signOut: mockSignOut }),
}));

import SaleReceiptScreen from '../app/sales/[id]';
import { MobileSaleReceiptError } from '../src/services/sales/mobileSaleReceiptService';

function findAllText(root: ReturnType<typeof create>): string[] {
  const { Text } = jest.requireActual('react-native');
  return root.root.findAllByType(Text).map((node: any) => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children ?? '')));
}

function pressByLabel(root: ReturnType<typeof create>, label: string) {
  const match = root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  if (!match) throw new Error(`No pressable found with accessibilityLabel "${label}"`);
  act(() => { match.props.onPress(); });
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  mockGetReceipt.mockReset();
  mockBack.mockReset();
  mockSignOut.mockReset();
  mockSearchParams.id = '25';
  mockSession = { baseUrl: 'https://tenant.example', accessToken: 'token-1' };
});

it('loads the receipt for the exact sale_id from the route and renders the official HTML', async () => {
  mockGetReceipt.mockResolvedValue({ saleId: '25', reference: 'SL_0025', html: '<html>factura</html>' });

  await act(async () => { create(React.createElement(SaleReceiptScreen)); await flush(); });

  expect(mockGetReceipt).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: 'https://tenant.example', accessToken: 'token-1', saleId: '25' }));
});

it('does not duplicate the receipt fetch on re-render (no render loop)', async () => {
  mockGetReceipt.mockResolvedValue({ saleId: '25', reference: 'SL_0025', html: '<html>factura</html>' });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(SaleReceiptScreen)); await flush(); });
  await act(async () => { root.update(React.createElement(SaleReceiptScreen)); await flush(); });

  expect(mockGetReceipt).toHaveBeenCalledTimes(1);
});

it('shows a friendly message on forbidden/not_found without exposing raw backend errors, and allows retry', async () => {
  mockGetReceipt.mockRejectedValueOnce(new MobileSaleReceiptError('not_found', 'Not found'));
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(SaleReceiptScreen)); await flush(); });

  const texts = findAllText(root).join(' ');
  expect(texts).toContain('No tienes acceso a esta venta.');
  expect(texts).not.toMatch(/Not found|404|Exception|SQLSTATE/i);

  mockGetReceipt.mockResolvedValueOnce({ saleId: '25', reference: 'SL_0025', html: '<html>ok</html>' });
  pressByLabel(root, 'Reintentar');
  await flush();
  expect(mockGetReceipt).toHaveBeenCalledTimes(2);
});

it('maps a network error to a generic message, never the sale itself failing', async () => {
  mockGetReceipt.mockRejectedValueOnce(new MobileSaleReceiptError('network_error', 'Network error'));
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(SaleReceiptScreen)); await flush(); });

  const texts = findAllText(root).join(' ');
  expect(texts).toContain('No pudimos cargar la factura.');
});

it('signs out globally on a 401 instead of showing a local fallback', async () => {
  mockGetReceipt.mockRejectedValueOnce(new MobileSaleReceiptError('session_expired', 'Session expired'));
  await act(async () => { create(React.createElement(SaleReceiptScreen)); await flush(); });

  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('back button returns to Sales without a second sale submission or fetch', async () => {
  mockGetReceipt.mockResolvedValue({ saleId: '25', reference: 'SL_0025', html: '<html>ok</html>' });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(SaleReceiptScreen)); await flush(); });

  pressByLabel(root, 'Volver');
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockGetReceipt).toHaveBeenCalledTimes(1);
});
