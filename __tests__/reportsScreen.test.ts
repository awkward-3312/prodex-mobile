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
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));

const mockGetSummary = jest.fn();
jest.mock('../src/services/reports/mobileReportsService', () => ({
  ...jest.requireActual('../src/services/reports/mobileReportsService'),
  getMobileReportsSummary: (...args: unknown[]) => mockGetSummary(...args),
}));

const mockSignOut = jest.fn();
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { baseUrl: 'https://tenant.example', accessToken: 'token-1' }, signOut: mockSignOut }),
}));

import ReportsScreen from '../app/reports/index';
import { computeReportRange, MobileReportsError } from '../src/services/reports/mobileReportsService';

const summary = (overrides: Partial<Record<string, unknown>> = {}) => ({
  from: '2026-05-01', to: '2026-05-01', salesTotal: '1000.00', salesCount: 5, averageSale: '200.00',
  taxTotal: '150.00', paidTotal: '900.00', pendingTotal: '100.00',
  topProducts: [{ name: 'Producto A', quantity: '10' }],
  topCustomers: [{ name: 'Cliente A', total: '500.00' }],
  paymentMethods: [{ name: 'Efectivo', total: '700.00' }],
  ...overrides,
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
  mockGetSummary.mockReset();
  mockBack.mockReset();
  mockSignOut.mockReset();
});

describe('computeReportRange', () => {
  it('defaults conceptually to a single-day range for "today"', () => {
    const now = new Date('2026-05-15T12:00:00Z');
    expect(computeReportRange('today', now)).toEqual({ from: '2026-05-15', to: '2026-05-15' });
  });

  it('spans 7 days including today', () => {
    const now = new Date('2026-05-15T12:00:00Z');
    expect(computeReportRange('7d', now)).toEqual({ from: '2026-05-09', to: '2026-05-15' });
  });

  it('spans 30 days including today', () => {
    const now = new Date('2026-05-30T12:00:00Z');
    expect(computeReportRange('30d', now)).toEqual({ from: '2026-05-01', to: '2026-05-30' });
  });
});

it('defaults to Hoy and fetches with matching from/to', async () => {
  mockGetSummary.mockResolvedValue(summary());
  await act(async () => { create(React.createElement(ReportsScreen)); await flush(); });
  const call = mockGetSummary.mock.calls[0][0];
  expect(call.from).toBe(call.to);
});

it('switching to 7 días refetches with a wider range', async () => {
  mockGetSummary.mockResolvedValue(summary());
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ReportsScreen)); await flush(); });
  mockGetSummary.mockClear();

  pressByLabel(root, 'Filtrar por 7 días');
  await flush();

  expect(mockGetSummary).toHaveBeenCalledTimes(1);
  const call = mockGetSummary.mock.calls[0][0];
  expect(call.from).not.toBe(call.to);
});

it('shows loading then the fetched totals', async () => {
  let resolve!: (value: unknown) => void;
  mockGetSummary.mockImplementation(() => new Promise((r) => { resolve = r; }));
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ReportsScreen)); });

  await act(async () => { resolve(summary()); await flush(); });
  const texts = findAllText(root).join(' ');
  expect(texts).toContain('Ventas totales');
  expect(texts).toContain('Producto A');
  expect(texts).toContain('Cliente A');
  expect(texts).toContain('Efectivo');
});

it('shows a zero-sales empty state without listing rankings', async () => {
  mockGetSummary.mockResolvedValue(summary({ salesCount: 0, salesTotal: '0.00', topProducts: [], topCustomers: [], paymentMethods: [] }));
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ReportsScreen)); await flush(); });
  expect(findAllText(root).join(' ')).toContain('Sin ventas en este período.');
});

it('shows a friendly message on network error', async () => {
  mockGetSummary.mockRejectedValueOnce(new MobileReportsError('network_error', 'Network error'));
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ReportsScreen)); await flush(); });
  expect(findAllText(root).join(' ')).toContain('No pudimos cargar el reporte.');
});

it('signs out globally on a 401', async () => {
  mockGetSummary.mockRejectedValueOnce(new MobileReportsError('session_expired', 'Session expired'));
  await act(async () => { create(React.createElement(ReportsScreen)); await flush(); });
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('does not refetch on re-render with the same range (no infinite loop)', async () => {
  mockGetSummary.mockResolvedValue(summary());
  let root!: ReturnType<typeof create>;
  await act(async () => { root = create(React.createElement(ReportsScreen)); await flush(); });
  await act(async () => { root.update(React.createElement(ReportsScreen)); await flush(); });
  expect(mockGetSummary).toHaveBeenCalledTimes(1);
});
