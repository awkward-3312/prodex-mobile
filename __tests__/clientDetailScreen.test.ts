import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../src/components/motion', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    PressableScale: ({ children, onPress, ...props }: any) => React.createElement(Pressable, { onPress, ...props }, children),
    FadeInView: ({ children, style }: any) => React.createElement(View, { style }, children),
  };
});

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockSearchParams: { id?: string } = { id: '42' };
jest.mock('expo-router', () => ({ useFocusEffect: (effect: any) => jest.requireActual('react').useEffect(effect, [effect]),
  router: { back: () => mockBack(), push: (...args: unknown[]) => mockPush(...args) },
  useLocalSearchParams: () => mockSearchParams,
}));

const mockGetClient = jest.fn();
jest.mock('../src/services/clients/mobileClientDetailService', () => ({
  ...jest.requireActual('../src/services/clients/mobileClientDetailService'),
  getMobileClientDetail: (...args: unknown[]) => mockGetClient(...args),
}));

const mockSignOut = jest.fn();
let mockCanManage = false;
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { baseUrl: 'https://tenant.example', accessToken: 'token-1' }, signOut: mockSignOut, hasPermission: (permission: string) => mockCanManage && permission === 'Customers_edit' }),
}));

import ClientDetailScreen from '../app/clients/[id]';
import { MobileClientDetailError } from '../src/services/clients/mobileClientDetailService';

function findAllText(root: ReturnType<typeof create>): string[] {
  return root.root.findAllByType(Text).map((node) => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children ?? '')));
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  mockCanManage = false;
  mockGetClient.mockReset();
  mockBack.mockReset();
  mockPush.mockReset();
  mockSignOut.mockReset();
  mockSearchParams.id = '42';
});

it('loads the client by id and shows only fields that exist', async () => {
  mockGetClient.mockResolvedValue({ id: 42, name: 'Cliente Real', rtn: '0801199912345', phone: null, email: null, address: null, balance: '130.00', recentSales: [] });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ClientDetailScreen)); await flush(); });

  expect(mockGetClient).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: 'https://tenant.example', accessToken: 'token-1', clientId: '42' }));
  const texts = findAllText(root).join(' ');
  expect(texts).toContain('Cliente Real');
  expect(texts).toContain('0801199912345');
});

it('shows the balance from the backend without recomputing it', async () => {
  mockGetClient.mockResolvedValue({ id: 42, name: 'Cliente Balance', rtn: null, phone: null, email: null, address: null, balance: '-25.50', recentSales: [] });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ClientDetailScreen)); await flush(); });
  expect(findAllText(root).join(' ')).toMatch(/25\.50/);
});

it('shows up to 5 recent sales and opens the official invoice on tap', async () => {
  mockGetClient.mockResolvedValue({
    id: 42, name: 'Cliente Historial', rtn: null, phone: null, email: null, address: null, balance: '0.00',
    recentSales: [{ sale_id: 7, sale_uuid: null, reference: 'SL_007', date: '2026-05-10', customer: null, branch: null, items_count: 1, grand_total: '100.00', paid_amount: '100.00', due_amount: '0.00', payment_status: 'paid', fiscal: null }],
  });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ClientDetailScreen)); await flush(); });

  const button = root.root.findAll((node) => node.props.accessibilityLabel === 'Abrir factura SL_007' && typeof node.props.onPress === 'function')[0];
  act(() => { button.props.onPress(); });
  expect(mockPush).toHaveBeenCalledWith('/sales/7');
});

it('shows a friendly message on forbidden/not_found and allows retry', async () => {
  mockGetClient.mockRejectedValueOnce(new MobileClientDetailError('not_found', 'Not found'));
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ClientDetailScreen)); await flush(); });
  expect(findAllText(root).join(' ')).toContain('No tienes acceso a este cliente.');

  mockGetClient.mockResolvedValueOnce({ id: 42, name: 'Recuperado', rtn: null, phone: null, email: null, address: null, balance: '0.00', recentSales: [] });
  const retry = root.root.findAll((node) => node.props.accessibilityLabel === 'Reintentar' && typeof node.props.onPress === 'function')[0];
  await act(async () => { retry.props.onPress(); await flush(); });
  expect(mockGetClient).toHaveBeenCalledTimes(2);
});

it('signs out globally on a 401', async () => {
  mockGetClient.mockRejectedValueOnce(new MobileClientDetailError('session_expired', 'Session expired'));
  await act(async () => { create(React.createElement(ClientDetailScreen)); await flush(); });
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('back returns to the previous screen', async () => {
  mockGetClient.mockResolvedValue({ id: 42, name: 'Cliente', rtn: null, phone: null, email: null, address: null, balance: '0.00', recentSales: [] });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ClientDetailScreen)); await flush(); });

  const back = root.root.findAll((node) => node.props.accessibilityLabel === 'Volver' && typeof node.props.onPress === 'function')[0];
  act(() => { back.props.onPress(); });
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it('does not refetch on re-render (no loop)', async () => {
  mockGetClient.mockResolvedValue({ id: 42, name: 'Cliente', rtn: null, phone: null, email: null, address: null, balance: '0.00', recentSales: [] });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ClientDetailScreen)); await flush(); });
  await act(async () => { root.update(React.createElement(ClientDetailScreen)); await flush(); });
  expect(mockGetClient).toHaveBeenCalledTimes(1);
});

it('shows Editar cliente only with Customers_edit', async () => {
  mockGetClient.mockResolvedValue({ id: 42, name: 'Ana', rtn: null, phone: null, email: null, address: null, balance: '0.00', recentSales: [] });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ClientDetailScreen)); });
  expect(root.root.findAllByType(Text).some(node => node.props.children === 'Editar cliente')).toBe(false);
  mockCanManage = true;
  act(() => root.update(React.createElement(ClientDetailScreen)));
  const button = root.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function' && node.findAllByType(Text).some(child => child.props.children === 'Editar cliente'))[0];
  act(() => button.props.onPress());
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/clients/manage', params: { clientId: '42' } });
  act(() => root.unmount());
});
