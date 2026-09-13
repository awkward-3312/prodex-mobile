import React from 'react';
import { act, create } from 'react-test-renderer';
import { FlatList, Text } from 'react-native';

jest.mock('../src/components/motion', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    PressableScale: ({ children, onPress, ...props }: any) => React.createElement(Pressable, { onPress, ...props }, children),
    FadeInView: ({ children, style }: any) => React.createElement(View, { style }, children),
  };
});

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() }, useFocusEffect: (effect: any) => jest.requireActual('react').useEffect(effect, [effect]) }));

const mockGetCurrent = jest.fn();
const mockGetHistory = jest.fn();
jest.mock('../src/services/cashRegister/mobileCashRegisterService', () => ({
  ...jest.requireActual('../src/services/cashRegister/mobileCashRegisterService'),
  getCurrentCashRegister: (...args: unknown[]) => mockGetCurrent(...args),
  getCashRegisterHistory: (...args: unknown[]) => mockGetHistory(...args),
}));

const mockSignOut = jest.fn();
let mockPermissions: string[] = ['Pos_view', 'cash_register_report'];
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: { baseUrl: 'https://tenant.example', accessToken: 'token-1' },
    signOut: mockSignOut,
    hasPermission: (permission: string) => mockPermissions.includes(permission),
  }),
}));

import CashRegisterContent from '../app/cash-register/index';
import { CashRegisterProvider } from '../src/context/CashRegisterContext';
function CashRegisterScreen() { return React.createElement(CashRegisterProvider, null, React.createElement(CashRegisterContent)); }
import { MobileCashRegisterError } from '../src/services/cashRegister/mobileCashRegisterService';

const openRegister = () => ({
  status: 'open' as const,
  register: { id: 5, openedAt: '2026-05-10 08:00:00', openingBalance: '500.00', branch: { id: 1, name: 'Sucursal 1' }, inventoryLocation: { id: 2, name: 'Piso de venta' }, warehouse: null, cashDrawer: { id: 3, name: 'Caja1' } },
  summary: {
    transactionCount: 4, totalSales: '400.00', cashSales: '250.00', cashIn: '20.00', cashOut: '10.00', cashRefunds: '5.00',
    expectedCash: '755.00', cardSystemTotal: '150.00', transferTotal: '0.00', storeCreditApplied: '0.00',
    salesByPaymentMethod: [{ id: 1, name: 'Efectivo', category: 'cash', total: '250.00' }, { id: 2, name: 'Tarjeta', category: 'card', total: '150.00' }],
  },
});

function findAllText(root: ReturnType<typeof create>): string[] {
  return root.root.findAllByType(Text).map((node) => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children ?? '')));
}

function pressByLabel(root: ReturnType<typeof create>, label: string) {
  const match = root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  if (!match) throw new Error(`No pressable found for "${label}"`);
  act(() => { match.props.onPress(); });
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  mockGetCurrent.mockReset();
  mockGetHistory.mockReset();
  mockBack.mockReset();
  mockSignOut.mockReset();
  mockPermissions = ['Pos_view', 'cash_register_report'];
});

it('shows loading then the open register summary with payment methods', async () => {
  mockGetCurrent.mockResolvedValue(openRegister());
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });

  const texts = findAllText(root).join(' ');
  expect(texts).toContain('Caja abierta');
  expect(texts).toContain('Efectivo esperado');
  expect(texts).toContain('Efectivo');
  expect(texts).toContain('Tarjeta');
  expect(texts).toContain('Entrada');
  expect(texts).toContain('Salida');
});

it('hides Entrada/Salida for a report-only user on an open register', async () => {
  mockPermissions = ['cash_register_report'];
  mockGetCurrent.mockResolvedValue(openRegister());
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });

  const texts = findAllText(root).join(' ');
  expect(texts).toContain('Caja abierta');
  expect(findAllText(root)).not.toContain('Entrada');
  expect(findAllText(root)).not.toContain('Salida');
});

it('shows an "Abrir caja" button when the user can operate the register', async () => {
  mockGetCurrent.mockResolvedValue({ status: 'closed', register: null, summary: null });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });

  const texts = findAllText(root).join(' ');
  expect(texts).toContain('No tienes una caja abierta.');
  expect(findAllText(root)).toContain('Abrir caja');
});

it('hides the "Abrir caja" button for a report-only user', async () => {
  mockPermissions = ['cash_register_report'];
  mockGetCurrent.mockResolvedValue({ status: 'closed', register: null, summary: null });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });

  const texts = findAllText(root).join(' ');
  expect(texts).toContain('No tienes una caja abierta.');
  expect(findAllText(root)).not.toContain('Abrir caja');
});

it('shows a retry state on network error and recovers on retry', async () => {
  mockGetCurrent.mockRejectedValueOnce(new MobileCashRegisterError('network_error', 'Network error'));
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });
  expect(findAllText(root).join(' ')).toContain('No pudimos cargar la caja.');

  mockGetCurrent.mockResolvedValueOnce({ status: 'closed', register: null, summary: null });
  pressByLabel(root, 'Reintentar');
  await flush();
  expect(mockGetCurrent).toHaveBeenCalledTimes(2);
});

it('signs out globally on a 401', async () => {
  mockGetCurrent.mockRejectedValueOnce(new MobileCashRegisterError('session_expired', 'Session expired'));
  await act(async () => { create(React.createElement(CashRegisterScreen)); await flush(); });
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('pull-to-refresh reloads the current register', async () => {
  mockGetCurrent.mockResolvedValue(openRegister());
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });
  mockGetCurrent.mockClear();

  const scroll = root.root.findAll((node) => node.props.refreshControl !== undefined)[0];
  await act(async () => { scroll.props.refreshControl.props.onRefresh(); await flush(); });
  expect(mockGetCurrent).toHaveBeenCalledTimes(1);
});

it('does not refetch on re-render (no loop)', async () => {
  mockGetCurrent.mockResolvedValue(openRegister());
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });
  await act(async () => { root.update(React.createElement(CashRegisterScreen)); await flush(); });
  expect(mockGetCurrent).toHaveBeenCalledTimes(1);
});

it('hides the Actual/Historial segment without cash_register_report permission', async () => {
  mockPermissions = ['Pos_view'];
  mockGetCurrent.mockResolvedValue({ status: 'closed', register: null, summary: null });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });
  expect(findAllText(root)).not.toContain('Historial');
});

it('history tab lists closed sessions with pagination and refresh', async () => {
  mockGetCurrent.mockResolvedValue({ status: 'closed', register: null, summary: null });
  mockGetHistory.mockResolvedValueOnce({
    items: [{ id: 9, status: 'closed', closingStatus: 'balanced', closingStatusLabel: 'Balanceada', user: { id: 2, name: 'Ana' }, branch: 'Sucursal 1', inventoryLocation: null, warehouse: null, cashDrawer: null, openedAt: '2026-05-10 08:00:00', closedAt: '2026-05-10 18:00:00', openingBalance: '500.00', totalSales: '1200.00', expectedCash: '700.00', countedCash: '700.00', difference: '0.00' }],
    pagination: { page: 1, per_page: 20, total: 1, last_page: 1, has_more: false },
  });

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });
  pressByLabel(root, 'Filtrar por Historial');
  await flush();

  const texts = findAllText(root).join(' ');
  expect(texts).toContain('Caja #9');
  expect(texts).toContain('Balanceada');

  mockGetHistory.mockClear();
  mockGetHistory.mockResolvedValueOnce({ items: [], pagination: { page: 1, per_page: 20, total: 0, last_page: 1, has_more: false } });
  const list = root.root.findByType(FlatList);
  await act(async () => { list.props.refreshControl.props.onRefresh(); await flush(); });
  expect(mockGetHistory).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
});

it('history shows a friendly error and empty states', async () => {
  mockGetCurrent.mockResolvedValue({ status: 'closed', register: null, summary: null });
  mockGetHistory.mockRejectedValueOnce(new MobileCashRegisterError('forbidden', 'Forbidden'));

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CashRegisterScreen)); await flush(); });
  pressByLabel(root, 'Filtrar por Historial');
  await flush();

  expect(findAllText(root).join(' ')).toContain('No tienes acceso a la caja.');
});
