jest.mock('../src/components/pos/CartSummaryBar', () => ({ CartSummaryBar: () => null }));
import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';

const mockPush = jest.fn();
const mockFocus = new Set<() => void | (() => void)>();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() }, useFocusEffect: (effect: () => void | (() => void)) => {
  const React = jest.requireActual('react');
  React.useEffect(() => { mockFocus.add(effect); const cleanup = effect(); return () => { mockFocus.delete(effect); cleanup?.(); }; }, [effect]);
} }));
jest.mock('../src/components/motion', () => {
  const { View, Pressable } = jest.requireActual('react-native');
  return { FadeInView: View, PressableScale: Pressable };
});
const mockSignOut = jest.fn();
let mockPermissions = ['Pos_view', 'cash_register_report'];
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ session: { baseUrl: 'https://tenant.test', accessToken: 'token' }, user: { id: 3 }, hasPermission: (p: string) => mockPermissions.includes(p), signOut: mockSignOut }) }));
const mockRead = jest.fn();
jest.mock('../src/services/cashRegister/mobileCashRegisterService', () => ({ ...jest.requireActual('../src/services/cashRegister/mobileCashRegisterService'), getCurrentCashRegister: (...args: unknown[]) => mockRead(...args) }));
import { CashRegisterProvider, useCashRegister } from '../src/context/CashRegisterContext';
import { PosRegisterGuard } from '../src/components/pos/PosRegisterGuard';
import CashRegisterScreen from '../app/cash-register/index';
import { MobileCashRegisterError } from '../src/services/cashRegister/mobileCashRegisterService';
let state!: ReturnType<typeof useCashRegister>;
function Probe() { state = useCashRegister(); return null; }
const closed = { status: 'closed', register: null, summary: null };
const open = (sales = '0.00') => ({ status: 'open', register: { id: 6, openedAt: '2026-09-13', openingBalance: '100.00', branch: null, inventoryLocation: null, cashDrawer: null }, summary: { totalSales: sales, cashSales: sales === '1840.00' ? '920.00' : '0.00', cashIn: '0.00', cashOut: '0.00', cashRefunds: '0.00', expectedCash: sales === '1840.00' ? '1020.00' : '100.00', transactionCount: sales === '1840.00' ? 2 : 0, salesByPaymentMethod: [], cardSystemTotal: '920.00', transferTotal: '0.00' } });
function render(child: React.ReactElement) { return create(React.createElement(CashRegisterProvider, null, React.createElement(Probe), child)); }
function texts(root: ReturnType<typeof create>) { return root.root.findAllByType(Text).map(node => String(node.props.children)).join(' '); }
async function focus() { await act(async () => { mockFocus.forEach(effect => effect()); }); }
beforeEach(() => { mockFocus.clear(); mockRead.mockReset(); mockPush.mockReset(); mockSignOut.mockReset(); mockPermissions = ['Pos_view', 'cash_register_report']; });
it('direct POS route hides catalog/cart while loading or closed and offers Abrir caja', async () => {
  let resolve!: (value: unknown) => void;
  mockRead.mockImplementation(() => new Promise(r => { resolve = r; }));
  let root!: ReturnType<typeof create>;
  await act(async () => { root = render(React.createElement(PosRegisterGuard, null, React.createElement(Text, null, 'Catalog and cart'))); });
  expect(texts(root)).not.toContain('Catalog and cart');
  await act(async () => { resolve(closed); });
  expect(texts(root)).toContain('Necesitas abrir caja antes de comenzar a vender.');
  expect(texts(root)).not.toContain('Catalog and cart');
  const cta = root.root.findAll(node => node.props.accessibilityLabel === 'Abrir caja' && typeof node.props.onPress === 'function')[0];
  act(() => cta.props.onPress()); expect(mockPush).toHaveBeenCalledWith('/cash-register/open');
  act(() => root.unmount());
});
it('opening makes POS available and closing immediately hides it', async () => {
  mockRead.mockResolvedValue(closed); let root!: ReturnType<typeof create>;
  await act(async () => { root = render(React.createElement(PosRegisterGuard, null, React.createElement(Text, null, 'Catalog and cart'))); });
  mockRead.mockResolvedValue(open());
  await act(async () => { state.invalidate(); await state.refresh(); });
  expect(texts(root)).toContain('Catalog and cart');
  act(() => state.invalidate());
  expect(texts(root)).not.toContain('Catalog and cart');
  act(() => root.unmount());
});
it('expired session fails closed and uses global signOut', async () => {
  mockRead.mockRejectedValue(new MobileCashRegisterError('session_expired', 'Expired'));
  let root!: ReturnType<typeof create>;
  await act(async () => { root = render(React.createElement(PosRegisterGuard, null, React.createElement(Text, null, 'Catalog and cart'))); });
  expect(mockSignOut).toHaveBeenCalled(); expect(texts(root)).not.toContain('Catalog and cart');
  act(() => root.unmount());
});
it('Caja refetches on focus and renders updated authoritative sales without counting cash sales as entradas', async () => {
  mockRead.mockResolvedValue(open()); let root!: ReturnType<typeof create>;
  await act(async () => { root = render(React.createElement(CashRegisterScreen)); });
  expect(mockRead).toHaveBeenCalledTimes(1);
  mockRead.mockResolvedValue(open('1840.00')); await focus();
  expect(mockRead).toHaveBeenCalledTimes(2);
  expect(texts(root)).toContain('1,840.00'); expect(texts(root)).toContain('1,020.00');
  expect(state.data?.summary?.cashIn).toBe('0.00');
  act(() => root.unmount());
});
it('the actual POS route never mounts its catalog/cart when closed', async () => {
  const PosScreen = require('../app/(tabs)/pos').default;
  mockRead.mockResolvedValue(closed); let root!: ReturnType<typeof create>;
  await act(async () => { root = render(React.createElement(PosScreen)); });
  expect(texts(root)).toContain('Necesitas abrir caja antes de comenzar a vender.');
  expect(root.root.findAll(node => node.type === require('../src/components/pos/CartSheet').CartSheet)).toHaveLength(0);
  expect(root.root.findAll(node => node.type === require('../src/components/pos/PosSearchBar').PosSearchBar)).toHaveLength(0);
  act(() => root.unmount());
});
