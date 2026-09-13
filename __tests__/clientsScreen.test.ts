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

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useFocusEffect: (effect: any) => jest.requireActual('react').useEffect(effect, [effect]), router: { push: (...args: unknown[]) => mockPush(...args), back: () => mockBack() } }));

const mockSearchClients = jest.fn();
jest.mock('../src/services/clients/mobileClientsService', () => ({
  ...jest.requireActual('../src/services/clients/mobileClientsService'),
  searchDirectoryClients: (...args: unknown[]) => mockSearchClients(...args),
}));

const mockSignOut = jest.fn();
let mockCanManage = false;
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { baseUrl: 'https://tenant.example', accessToken: 'token-1' }, signOut: mockSignOut, hasPermission: (permission: string) => mockCanManage && permission === 'Customers_add' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import ClientsScreen from '../app/clients/index';
import { MobilePosCheckoutError } from '../src/services/pos/mobilePosCheckoutService';
import type { ClientSearchResult } from '../src/types/mobilePosCheckout';

const client = (overrides: Partial<ClientSearchResult> = {}): ClientSearchResult => ({ id: 1, name: 'Cliente Uno', phone: '9999-9999', rtn: '0801', ...overrides });

function findAllText(root: ReturnType<typeof create>): string[] {
  return root.root.findAllByType(Text).map((node) => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children ?? '')));
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

async function advanceDebounce() {
  await act(async () => { jest.advanceTimersByTime(400); await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  mockCanManage = false;
  mockSearchClients.mockReset();
  mockPush.mockReset();
  mockSignOut.mockReset();
  jest.useFakeTimers();
});

afterEach(() => { jest.useRealTimers(); });

it('shows a loading state, then the fetched client list', async () => {
  mockSearchClients.mockResolvedValue({ items: [client()], pagination: { page: 1, per_page: 30, total: 1, last_page: 1, has_more: false } });
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ClientsScreen)); });
  await flush();

  expect(findAllText(root).join(' ')).toContain('Cliente Uno');
});

it('debounces search before calling the service', async () => {
  mockSearchClients.mockResolvedValue({ items: [], pagination: { page: 1, per_page: 30, total: 0, last_page: 1, has_more: false } });
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ClientsScreen)); });
  await flush();
  mockSearchClients.mockClear();

  const input = root.root.findByProps({ accessibilityLabel: 'Buscar cliente por nombre, teléfono o RTN' });
  act(() => { input.props.onChangeText('Juan'); });
  expect(mockSearchClients).not.toHaveBeenCalled();

  await advanceDebounce();
  expect(mockSearchClients).toHaveBeenCalledWith(expect.objectContaining({ search: 'Juan' }));
});

it('paginates on end reached without refetching page 1', async () => {
  mockSearchClients.mockResolvedValueOnce({ items: [client({ id: 1, name: 'Uno' })], pagination: { page: 1, per_page: 1, total: 2, last_page: 2, has_more: true } });
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ClientsScreen)); });
  await flush();

  mockSearchClients.mockResolvedValueOnce({ items: [client({ id: 2, name: 'Dos' })], pagination: { page: 2, per_page: 1, total: 2, last_page: 2, has_more: false } });
  const list = root.root.findByType(FlatList);
  await act(async () => { list.props.onEndReached(); await flush(); });

  expect(mockSearchClients).toHaveBeenCalledTimes(2);
  expect(mockSearchClients.mock.calls[1][0]).toMatchObject({ page: 2 });
  const texts = findAllText(root).join(' ');
  expect(texts).toContain('Uno');
  expect(texts).toContain('Dos');
});

it('refresh reloads page 1', async () => {
  mockSearchClients.mockResolvedValue({ items: [client()], pagination: { page: 1, per_page: 30, total: 1, last_page: 1, has_more: false } });
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ClientsScreen)); });
  await flush();
  mockSearchClients.mockClear();

  const list = root.root.findByType(FlatList);
  await act(async () => { list.props.refreshControl.props.onRefresh(); await flush(); });
  expect(mockSearchClients).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
});

it('shows an empty state with no clients', async () => {
  mockSearchClients.mockResolvedValue({ items: [], pagination: { page: 1, per_page: 30, total: 0, last_page: 1, has_more: false } });
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ClientsScreen)); });
  await flush();
  expect(findAllText(root).join(' ')).toContain('Aún no hay clientes registrados.');
});

it('shows a retry state on network error', async () => {
  mockSearchClients.mockRejectedValue(new MobilePosCheckoutError('network_error', 'Network error'));
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ClientsScreen)); });
  await flush();
  expect(findAllText(root).join(' ')).toContain('No pudimos cargar los clientes.');
});

it('signs out globally on a 401', async () => {
  mockSearchClients.mockRejectedValue(new MobilePosCheckoutError('session_expired', 'Session expired'));
  act(() => { create(React.createElement(ClientsScreen)); });
  await flush();
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('tapping a client navigates to its detail route', async () => {
  mockSearchClients.mockResolvedValue({ items: [client({ id: 42, name: 'Cliente Cuarenta y Dos' })], pagination: { page: 1, per_page: 30, total: 1, last_page: 1, has_more: false } });
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ClientsScreen)); });
  await flush();

  const button = root.root.findAll((node) => node.props.accessibilityLabel === 'Ver cliente Cliente Cuarenta y Dos' && typeof node.props.onPress === 'function')[0];
  act(() => { button.props.onPress(); });
  expect(mockPush).toHaveBeenCalledWith('/clients/42');
});

it('shows Nuevo cliente only with Customers_add and refreshes on returning focus', async () => {
  mockSearchClients.mockResolvedValue({ items: [], pagination: { page: 1, per_page: 30, total: 0, last_page: 1, has_more: false } });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ClientsScreen)); });
  expect(findAllText(root)).not.toContain('Nuevo cliente');
  mockCanManage = true;
  act(() => root.update(React.createElement(ClientsScreen)));
  expect(findAllText(root)).toContain('Nuevo cliente');
  const button = root.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function' && node.findAllByType(Text).some(child => child.props.children === 'Nuevo cliente'))[0];
  act(() => button.props.onPress());
  expect(mockPush).toHaveBeenCalledWith('/clients/manage');
  act(() => root.unmount());
  const calls = mockSearchClients.mock.calls.length;
  await act(async () => { root = create(React.createElement(ClientsScreen)); });
  expect(mockSearchClients.mock.calls.length).toBeGreaterThan(calls);
  act(() => root.unmount());
});
