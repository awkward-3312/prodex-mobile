import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TextInput, Switch } from 'react-native';
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args), back: jest.fn() }, useFocusEffect: (effect: any) => jest.requireActual('react').useEffect(effect, [effect]) }));
const mockUUID = jest.fn();
jest.mock('expo-crypto', () => ({ randomUUID: () => mockUUID() }));
jest.mock('../src/components/motion', () => { const { View, Pressable } = jest.requireActual('react-native'); return { FadeInView: View, PressableScale: Pressable }; });
const mockSignOut = jest.fn();
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ session: { baseUrl: 'https://tenant.test', accessToken: 'token' }, user: { id: 3 }, hasPermission: () => true, signOut: mockSignOut }) }));
const mockRefresh = jest.fn(async () => {});
const mockInvalidate = jest.fn();
const mockData = { status: 'open', register: { id: 6, openedAt: '2026-09-13', openingBalance: '100.00', branch: { name: 'Centro' }, inventoryLocation: { name: 'Piso' }, cashDrawer: { name: 'Caja 2' } }, summary: { totalSales: '1840.00', cashSales: '920.00', cashIn: '0.00', cashOut: '0.00', cashRefunds: '0.00', expectedCash: '1020.00', transactionCount: 2, salesByPaymentMethod: [], cardSystemTotal: '920.00', transferTotal: '100.00', denominations: { currencyCode: 'HNL', bills: ['500', '20'], coins: ['0.50', '0.20', '0.10', '0.05'] } } };
jest.mock('../src/context/CashRegisterContext', () => ({ useCashRegister: () => ({ data: mockData, status: 'open', refresh: mockRefresh, invalidate: mockInvalidate }) }));
const mockStorage = { read: jest.fn(async (): Promise<string | null> => null), write: jest.fn(async (_value: string) => {}), remove: jest.fn(async () => {}) };
jest.mock('../src/services/cashRegister/cashRegisterAttemptStorage', () => ({ cashRegisterAttemptStorage: () => mockStorage }));
const mockSend = jest.fn();
jest.mock('../src/services/cashRegister/mobileCashRegisterCloseService', () => ({ ...jest.requireActual('../src/services/cashRegister/mobileCashRegisterCloseService'), closeCashRegister: (...args: unknown[]) => mockSend(...args) }));
import CloseScreen from '../app/cash-register/close';
import { CashRegisterOperationError } from '../src/services/cashRegister/mobileCashRegisterOperationService';
const success = { success: true, idempotent: true, operationUuid: '123e4567-e89b-42d3-a456-426614174000', operationType: 'close', registerId: 6, closedAt: '2026-09-13T12:00:00Z', expectedCash: '1020.00', countedCash: '1020.00', difference: '0.00' };
function text(root: ReturnType<typeof create>) { return root.root.findAllByType(Text).map(node => Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children)).join(' ').replace(/\u00a0/g, ' '); }
function press(root: ReturnType<typeof create>, label: string) {
  const node = root.root.findAll(node => typeof node.props.onPress === 'function' && node.findAllByType(Text).some(child => child.props.children === label))[0];
  if (!node) throw new Error(`Missing ${label}`);
  return node.props.onPress();
}
function input(root: ReturnType<typeof create>, label: string, value: string) { root.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!.props.onChangeText(value); }
function confirmBreakdown(root: ReturnType<typeof create>) {
  act(() => root.root.findAllByType(Switch).find(node => node.props.accessibilityLabel === 'Confirmo el desglose por denominaciones')!.props.onValueChange(true));
}
function complete(root: ReturnType<typeof create>, counted = '1020.00', twenties = '1') {
  act(() => { input(root, 'Monto contado', counted); input(root, 'Cantidad de 500', '2'); input(root, 'Cantidad de 20', twenties); });
  confirmBreakdown(root);
}
function reviewButton(root: ReturnType<typeof create>) {
  return root.root.findAll(node => typeof node.props.onPress === 'function' && node.findAllByType(Text).some(child => child.props.children === 'Revisar cierre'))[0];
}
const completeMap = { '500': 2, '20': 1, '0.50': 0, '0.20': 0, '0.10': 0, '0.05': 0 };
beforeEach(() => { jest.clearAllMocks(); mockUUID.mockReturnValue('123e4567-e89b-42d3-a456-426614174000'); mockStorage.read.mockResolvedValue(null); mockSend.mockResolvedValue(success); });
it('shows authoritative context, optional card/transfer reconciliation and requires confirmation', async () => {
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(CloseScreen)); });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(text(root)).toContain('Centro · Piso · Caja 2');
  expect(text(root)).toContain('Conciliación de tarjetas');
  expect(text(root)).toContain('Transferencias verificadas');
  complete(root);
  expect(text(root)).toContain('Exacto');
  act(() => press(root, 'Revisar cierre'));
  expect(text(root)).toContain('Confirmar cierre');
  expect(text(root)).toContain('1,020.00'); expect(text(root)).toContain('1,840.00');
  expect(mockSend).not.toHaveBeenCalled();
  await act(async () => { press(root, 'Cerrar caja'); press(root, 'Cerrar caja'); });
  expect(mockSend).toHaveBeenCalledTimes(1); expect(mockStorage.write).toHaveBeenCalled();
  expect(mockInvalidate).toHaveBeenCalledTimes(1); expect(mockRefresh).toHaveBeenCalledTimes(2);
  expect(mockReplace).toHaveBeenCalledWith('/cash-register'); expect(mockStorage.remove).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});
it('requires both counts, displays every backend denomination and separates breakdown mismatch from register difference', async () => {
  let root!: ReturnType<typeof create>; await act(async () => { root = create(React.createElement(CloseScreen)); });
  const keys = [...mockData.summary.denominations.bills, ...mockData.summary.denominations.coins];
  for (const key of keys) expect(root.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === `Cantidad de ${key}`)?.props.value).toBe('0');
  expect(text(root)).not.toContain('Monto directo');
  act(() => input(root, 'Monto contado', '1020.00'));
  expect(reviewButton(root).props.disabled).toBe(true);
  act(() => press(root, 'Revisar cierre')); expect(mockSend).not.toHaveBeenCalled();
  act(() => input(root, 'Cantidad de 500', '2'));
  expect(text(root)).toContain('Faltan L 20.00 en el desglose');
  expect(text(root)).toContain('Diferencia de caja · Exacto');
  expect(reviewButton(root).props.disabled).toBe(true);
  act(() => input(root, 'Cantidad de 20', '2'));
  expect(text(root)).toContain('Sobran L 20.00 en el desglose');
  expect(reviewButton(root).props.disabled).toBe(true);
  act(() => input(root, 'Cantidad de 20', '1'));
  expect(reviewButton(root).props.disabled).toBe(true);
  confirmBreakdown(root);
  expect(reviewButton(root).props.disabled).toBe(false);
  act(() => press(root, 'Revisar cierre'));
  await act(async () => { press(root, 'Cerrar caja'); });
  expect(mockSend.mock.calls[0][0].request.counted_denominations).toEqual(completeMap);
  expect(JSON.parse(mockStorage.write.mock.calls[0][0]).request.counted_denominations).toEqual(completeMap);
  act(() => root.unmount());
});
it.each([['1000.00', '0', 'Faltante'], ['1040.00', '2', 'Sobrante']])('allows reconciled physical count %s despite a register difference', async (counted, twenties, label) => {
  let root!: ReturnType<typeof create>; await act(async () => { root = create(React.createElement(CloseScreen)); });
  complete(root, counted, twenties);
  expect(text(root)).toContain(`Diferencia de caja · ${label}`);
  expect(reviewButton(root).props.disabled).toBe(false);
  act(() => root.unmount());
});
it('accepts an explicitly confirmed all-zero count but clearing a quantity blocks review', async () => {
  let root!: ReturnType<typeof create>; await act(async () => { root = create(React.createElement(CloseScreen)); });
  act(() => input(root, 'Monto contado', '0.00')); confirmBreakdown(root);
  expect(reviewButton(root).props.disabled).toBe(false);
  act(() => input(root, 'Cantidad de 0.05', ''));
  expect(reviewButton(root).props.disabled).toBe(true);
  act(() => root.unmount());
});
it('restores an uncertain close without sending and Retry uses the saved payload', async () => {
  const request = { operation_uuid: success.operationUuid, register_id: 6, counted_cash: '1020.00', counted_denominations: completeMap, notes: 'Frozen' };
  mockStorage.read.mockResolvedValue(JSON.stringify({ version: 1, owner: 'https://tenant.test|3', kind: 'close', request }));
  let root!: ReturnType<typeof create>; await act(async () => { root = create(React.createElement(CloseScreen)); });
  expect(mockSend).not.toHaveBeenCalled(); expect(text(root)).toContain('Reintentar cierre');
  await act(async () => { press(root, 'Reintentar cierre'); });
  expect(mockSend.mock.calls[0][0].request).toEqual(request);
  act(() => root.unmount());
});
it('401 signs out and preserves close attempt', async () => {
  mockSend.mockRejectedValue(new CashRegisterOperationError('session_expired', 'session_expired'));
  let root!: ReturnType<typeof create>; await act(async () => { root = create(React.createElement(CloseScreen)); });
  complete(root); act(() => press(root, 'Revisar cierre'));
  await act(async () => { press(root, 'Cerrar caja'); });
  expect(mockSignOut).toHaveBeenCalled(); expect(mockStorage.remove).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled(); act(() => root.unmount());
});
it('business rejection offers correction and does not navigate as success', async () => {
  mockSend.mockRejectedValue(new CashRegisterOperationError('business_error', 'validation_error'));
  let root!: ReturnType<typeof create>; await act(async () => { root = create(React.createElement(CloseScreen)); });
  complete(root); act(() => press(root, 'Revisar cierre'));
  await act(async () => { press(root, 'Cerrar caja'); });
  expect(text(root)).toContain('Corregir'); expect(mockReplace).not.toHaveBeenCalled();
  await act(async () => { press(root, 'Corregir'); });
  expect(text(root)).toContain('Revisión de caja');
  mockUUID.mockReturnValue('123e4567-e89b-42d3-a456-426614174001');
  mockSend.mockResolvedValue(success);
  complete(root, '1040.00', '2');
  act(() => press(root, 'Revisar cierre'));
  await act(async () => { press(root, 'Cerrar caja'); });
  expect(mockSend.mock.calls[1][0].request.operation_uuid).not.toBe(mockSend.mock.calls[0][0].request.operation_uuid);
  expect(mockSend.mock.calls[1][0].request.counted_cash).toBe('1040.00');
  expect(mockSend.mock.calls[1][0].request.counted_denominations).toEqual({ ...completeMap, '20': 2 });
  act(() => root.unmount());
});
