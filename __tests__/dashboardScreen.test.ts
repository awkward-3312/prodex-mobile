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

const mockGetSummary = jest.fn();
jest.mock('../src/services/dashboard/mobileDashboardService', () => ({
  ...jest.requireActual('../src/services/dashboard/mobileDashboardService'),
  getMobileDashboardSummary: (...args: unknown[]) => mockGetSummary(...args),
}));

const mockGetSales = jest.fn();
jest.mock('../src/services/sales/mobileSalesService', () => ({
  ...jest.requireActual('../src/services/sales/mobileSalesService'),
  getMobileSales: (...args: unknown[]) => mockGetSales(...args),
}));

const mockSignOut = jest.fn();
let mockPermissions: string[] = ['Reports_sales', 'Customers_view'];
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Laura Martinez' },
    tenant: { company_name: 'Mercado Central' },
    operationalContext: { branch: { name: 'Sucursal 1' } },
    session: { baseUrl: 'https://tenant.example', accessToken: 'token-1' },
    signOut: mockSignOut,
    hasPermission: (permission: string) => mockPermissions.includes(permission),
  }),
}));

import DashboardScreen from '../app/(tabs)/index';
import { MobileDashboardError } from '../src/services/dashboard/mobileDashboardService';

const summary = (overrides: Partial<Record<string, unknown>> = {}) => ({
  today: { salesTotal: '18420.50', salesCount: 64, averageSale: '287.82', salesTotalDeltaPct: 12.4, averageSaleDeltaPct: 5.8, topProducts: [{ id: 1, name: 'Latte grande', quantity: '42' }] },
  week: { from: '2026-05-11', to: '2026-05-15', total: '96280.00', days: [
    { date: '2026-05-11', total: '10000.00' }, { date: '2026-05-12', total: '12000.00' }, { date: '2026-05-13', total: '11000.00' },
    { date: '2026-05-14', total: '15000.00' }, { date: '2026-05-15', total: '18000.00' },
  ] },
  ...overrides,
});

const sale = (overrides: Partial<Record<string, unknown>> = {}) => ({
  sale_id: 1, sale_uuid: null, reference: 'SL_001', date: '2026-05-15 10:42:00', customer: { id: 1, name: 'Café Norte' }, branch: null,
  items_count: 1, grand_total: '486.00', paid_amount: '486.00', due_amount: '0.00', payment_status: 'paid', fiscal: null,
  ...overrides,
});

function findAllText(root: ReturnType<typeof create>): string[] {
  return root.root.findAllByType(Text).map((node) => (Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children ?? '')));
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  mockGetSummary.mockReset();
  mockGetSales.mockReset();
  mockPush.mockReset();
  mockSignOut.mockReset();
  mockPermissions = ['Reports_sales', 'Customers_view'];
});

it('shows the greeting, today totals, week chart and top products', async () => {
  mockGetSummary.mockResolvedValue(summary());
  mockGetSales.mockResolvedValue({ items: [sale()], pagination: { page: 1, per_page: 3, total: 1, last_page: 1, has_more: false } });

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(DashboardScreen)); await flush(); });

  const texts = findAllText(root).join(' ');
  expect(texts).toContain('Laura');
  expect(texts).toContain('Mercado Central');
  expect(texts).toContain('Ventas de hoy');
  expect(texts).toContain('Ventas de la semana');
  expect(texts).toContain('Top productos');
  expect(texts).toContain('Latte grande');
  expect(texts).toContain('Café Norte');
});

it('hides top productos when the backend omits it (no permission)', async () => {
  mockGetSummary.mockResolvedValue(summary({ today: { ...summary().today, topProducts: null } }));
  mockGetSales.mockResolvedValue({ items: [], pagination: { page: 1, per_page: 3, total: 0, last_page: 1, has_more: false } });

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(DashboardScreen)); await flush(); });
  expect(findAllText(root)).not.toContain('Top productos');
});

it('hides "Ver reporte" without Reports_sales permission', async () => {
  mockPermissions = [];
  mockGetSummary.mockResolvedValue(summary({ today: { ...summary().today, topProducts: null } }));
  mockGetSales.mockResolvedValue({ items: [], pagination: { page: 1, per_page: 3, total: 0, last_page: 1, has_more: false } });

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(DashboardScreen)); await flush(); });
  expect(findAllText(root)).not.toContain('Ver reporte');
});

it('recent sale rows open the official invoice', async () => {
  mockGetSummary.mockResolvedValue(summary());
  mockGetSales.mockResolvedValue({ items: [sale({ sale_id: 42 })], pagination: { page: 1, per_page: 3, total: 1, last_page: 1, has_more: false } });

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(DashboardScreen)); await flush(); });

  const button = root.root.findAll((node) => typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith('Abrir factura SL_001') && typeof node.props.onPress === 'function')[0];
  act(() => { button.props.onPress(); });
  expect(mockPush).toHaveBeenCalledWith('/sales/42');
});

it('quick actions navigate to existing real routes', async () => {
  mockGetSummary.mockResolvedValue(summary());
  mockGetSales.mockResolvedValue({ items: [], pagination: { page: 1, per_page: 3, total: 0, last_page: 1, has_more: false } });

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(DashboardScreen)); await flush(); });

  const press = (label: string) => {
    const node = root.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
    act(() => { node.props.onPress(); });
  };
  press('Nueva venta');
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/pos');
  press('Inventario');
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/inventory');
  press('Clientes');
  expect(mockPush).toHaveBeenCalledWith('/clients');
});

it('shows a retry state on network error and recovers', async () => {
  mockGetSummary.mockRejectedValueOnce(new MobileDashboardError('network_error', 'Network error'));
  mockGetSales.mockResolvedValue({ items: [], pagination: { page: 1, per_page: 3, total: 0, last_page: 1, has_more: false } });

  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(DashboardScreen)); await flush(); });
  expect(findAllText(root).join(' ')).toContain('No pudimos cargar el resumen.');

  mockGetSummary.mockResolvedValueOnce(summary());
  const retry = root.root.findAll((node) => node.props.accessibilityLabel === 'Reintentar' && typeof node.props.onPress === 'function')[0];
  await act(async () => { retry.props.onPress(); await flush(); });
  expect(mockGetSummary).toHaveBeenCalledTimes(2);
});

it('signs out globally on a 401', async () => {
  mockGetSummary.mockRejectedValueOnce(new MobileDashboardError('session_expired', 'Session expired'));
  mockGetSales.mockResolvedValue({ items: [], pagination: { page: 1, per_page: 3, total: 0, last_page: 1, has_more: false } });
  await act(async () => { create(React.createElement(DashboardScreen)); await flush(); });
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('does not refetch on re-render (no loop)', async () => {
  mockGetSummary.mockResolvedValue(summary());
  mockGetSales.mockResolvedValue({ items: [], pagination: { page: 1, per_page: 3, total: 0, last_page: 1, has_more: false } });
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(DashboardScreen)); await flush(); });
  await act(async () => { root.update(React.createElement(DashboardScreen)); await flush(); });
  expect(mockGetSummary).toHaveBeenCalledTimes(1);
});
