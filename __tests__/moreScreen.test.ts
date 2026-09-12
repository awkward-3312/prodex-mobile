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

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

const mockSignOut = jest.fn();
let mockPermissions: string[] = [];
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Cajero PRODEX', email: 'cajero@test.com' },
    session: { baseUrl: 'https://tenant.example' },
    tenant: { company_name: 'PRODEX Demo' },
    operationalContext: { branch: { name: 'Sucursal 1' } },
    signOut: mockSignOut,
    hasPermission: (permission: string) => mockPermissions.includes(permission),
  }),
}));

import MoreScreen from '../app/(tabs)/more';

function findAllText(root: ReturnType<typeof create>): string[] {
  return root.root.findAllByType(Text).map((node) => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children ?? '')));
}

function pressByLabel(root: ReturnType<typeof create>, label: string) {
  const match = root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  if (!match) throw new Error(`No pressable found with accessibilityLabel "${label}"`);
  act(() => { match.props.onPress(); });
}

beforeEach(() => {
  mockPush.mockReset();
  mockSignOut.mockReset();
  mockPermissions = [];
});

it('hides Clientes, Caja and Reportes when the user has none of those permissions', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(MoreScreen)); });
  const texts = findAllText(root);
  expect(texts).not.toContain('Clientes');
  expect(texts).not.toContain('Caja');
  expect(texts).not.toContain('Reportes');
  expect(texts).toContain('Cerrar sesión');
});

it('shows Caja when the user has Pos_view, and it navigates to /cash-register', () => {
  mockPermissions = ['Pos_view'];
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(MoreScreen)); });
  expect(findAllText(root)).toContain('Caja');

  pressByLabel(root, 'Caja');
  expect(mockPush).toHaveBeenCalledWith('/cash-register');
});

it('shows Caja when the user has cash_register_report, even without Pos_view', () => {
  mockPermissions = ['cash_register_report'];
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(MoreScreen)); });
  expect(findAllText(root)).toContain('Caja');
});

it('shows Clientes only when the user has Clients_view, and it navigates to /clients', () => {
  mockPermissions = ['Customers_view'];
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(MoreScreen)); });
  expect(findAllText(root)).toContain('Clientes');
  expect(findAllText(root)).not.toContain('Reportes');

  pressByLabel(root, 'Clientes');
  expect(mockPush).toHaveBeenCalledWith('/clients');
});

it('shows Reportes only when the user has a reports permission, and it navigates to /reports', () => {
  mockPermissions = ['Reports_sales'];
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(MoreScreen)); });
  expect(findAllText(root)).toContain('Reportes');
  expect(findAllText(root)).not.toContain('Clientes');

  pressByLabel(root, 'Reportes');
  expect(mockPush).toHaveBeenCalledWith('/reports');
});

it('logout stays intact regardless of permissions', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(MoreScreen)); });
  pressByLabel(root, 'Cerrar sesión');
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('always shows the account card with user, company and branch', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(MoreScreen)); });
  const texts = findAllText(root).join(' ');
  expect(texts).toContain('Cajero PRODEX');
  expect(texts).toContain('PRODEX Demo');
  expect(texts).toContain('Sucursal 1');
});
