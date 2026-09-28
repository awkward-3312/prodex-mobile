import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';

const mockSession = { version: 1, workspace: 'qa', baseUrl: 'https://tenant.test', accessToken: 'fixture', tokenType: 'Bearer', expiresAt: null };
const mockSignOut = jest.fn();
const mockPreflight = jest.fn();
const mockSend = jest.fn();
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ session: mockSession, user: { id: 1 }, hasPermission: () => true, signOut: mockSignOut }) }));
jest.mock('../src/context/CashRegisterContext', () => ({ useCashRegister: () => ({ invalidate: jest.fn() }) }));
jest.mock('../src/components/pos/PosRegisterGuard', () => ({ PosRegisterGuard: ({ children }: any) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '123e4567-e89b-42d3-a456-000000000001' }));
jest.mock('expo-secure-store', () => ({ getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {} }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('../src/components/ui/BottomSheet', () => ({ BottomSheet: () => null }));
jest.mock('../src/components/clients/CustomerEditor', () => ({ CustomerEditor: () => null }));
jest.mock('../src/components/pos/payment/SaleInvoiceScreen', () => { const React = jest.requireActual('react'); const { Text } = jest.requireActual('react-native'); return { SaleInvoiceScreen: () => React.createElement(Text, null, 'Venta registrada') }; });
jest.mock('../src/components/motion', () => {
  const React = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return { FadeInView: (props: any) => React.createElement(View, props), PressableScale: (props: any) => React.createElement(Pressable, props) };
});
jest.mock('../src/services/pos/mobilePosCheckoutService', () => ({
  ...jest.requireActual('../src/services/pos/mobilePosCheckoutService'),
  getCheckoutContext: async () => ({ operational_context: {}, customer: { default: { id: 5, name: 'Consumidor final' } }, payment_methods: [{ id: 10, name: 'Efectivo', is_cash: true, is_supported: true, is_available: true }], accounts: [], currency: { code: 'HNL', symbol: 'L', price_decimals: 2 }, capabilities: { can_create_sale: true } }),
  preflightSale: (...args: unknown[]) => mockPreflight(...args), searchClients: async () => ({ items: [] }),
}));
jest.mock('../src/services/sales/mobileSaleSubmissionService', () => ({ ...jest.requireActual('../src/services/sales/mobileSaleSubmissionService'), submitMobileSale: (...args: unknown[]) => mockSend(...args) }));

import CheckoutScreen from '../app/pos/checkout';
import { PosCartProvider, usePosCart } from '../src/context/PosCartContext';
import { SaleSubmissionError } from '../src/services/sales/mobileSaleSubmissionService';
let cart: ReturnType<typeof usePosCart>;
const preflight = { can_submit: true, totals: { subtotal: '100.00', subtotal_excluding_tax: '100.00', subtotal_including_tax: '115.00', merchandise_total: '100.00', net_total: '100.00', discount: '0.00', tax: '15.00', shipping: '0.00', grand_total: '115.00' }, lines: [], payments: { total_paid: '115.00', change: '0.00', balance_due: '0.00' }, errors: [] };
function Harness() { cart = usePosCart(); return React.createElement(CheckoutScreen); }
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const textOf = (root: ReturnType<typeof create>) => root.root.findAllByType(Text).map(n => n.props.children).join(' ');
const press = (root: ReturnType<typeof create>, label: string) => root.root.find(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function').props.onPress();
async function mount() {
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(PosCartProvider, null, React.createElement(Harness))); await flush(); });
  await act(async () => {
    cart.addProduct({ id: 'api:15', source: 'api', productId: 15, productVariantId: null, name: 'Café', sku: '15', barcode: '15', barcodeSymbology: 'CODE128', category: 'General', price: 100, priceMinorUnits: 10000, stock: 10, stockStatus: 'Disponible', favorite: false, icon: 'cube-outline', tone: 'blue' });
    await flush();
  });
  await act(async () => { jest.advanceTimersByTime(450); await flush(); });
  return root;
}
beforeEach(() => { jest.useFakeTimers(); mockPreflight.mockReset().mockResolvedValue(preflight); mockSend.mockReset(); });
afterEach(() => jest.useRealTimers());

it('renders rejection exclusively until explicit revalidation, then confirms and clears the cart only on success', async () => {
  mockSend.mockRejectedValueOnce(new SaleSubmissionError('business_error', 'fiscal_disabled'));
  const root = await mount();
  expect(textOf(root)).toContain('Confirma para registrar');
  await act(async () => { press(root, 'Confirmar venta'); await flush(); });
  expect(textOf(root)).toContain('Venta no registrada.');
  expect(textOf(root)).not.toContain('Confirma para registrar');
  expect(textOf(root)).not.toContain('Venta registrada');
  expect(cart.items).toHaveLength(1);
  const count = mockPreflight.mock.calls.length;
  await act(async () => { jest.advanceTimersByTime(2000); await flush(); });
  expect(mockPreflight).toHaveBeenCalledTimes(count);
  await act(async () => { press(root, 'Reintentar validación'); await flush(); });
  expect(textOf(root)).not.toContain('Venta no registrada.');
  expect(textOf(root)).toContain('Confirma para registrar');
  mockSend.mockImplementationOnce(async ({ request }) => ({ success: true, idempotent: false, sale: { id: 9, ref: 'SL_009', sale_uuid: request.sale_uuid, grand_total: '115.00', payment_status: 'paid', fiscal_number: null, fiscal_status: null } }));
  await act(async () => { press(root, 'Confirmar venta'); await flush(); });
  expect(textOf(root)).toContain('Venta registrada');
  expect(textOf(root)).not.toContain('Venta no registrada.');
  expect(cart.items).toHaveLength(0);
  act(() => root.unmount());
});

it('revalidates an edited intent after rejection and never replaces an explicit zero payment with the full total', async () => {
  mockSend.mockRejectedValueOnce(new SaleSubmissionError('business_error', 'invalid_account'));
  const root = await mount();
  await act(async () => { press(root, 'Confirmar venta'); await flush(); });
  const input = root.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === 'Monto recibido en efectivo')!;
  await act(async () => { input.props.onChangeText('0'); await flush(); });
  await act(async () => { jest.advanceTimersByTime(450); await flush(); });
  expect(mockPreflight.mock.calls.at(-1)[0].request.payment_intent[0].amount).toBe('0.00');
  expect(textOf(root)).not.toContain('Venta no registrada.');
  expect(mockSend).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});
