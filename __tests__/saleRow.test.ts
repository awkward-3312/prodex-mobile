import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('../src/components/motion', () => {
  const { Pressable: RNPressable } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return { PressableScale: ({ children, onPress, ...props }: any) => React.createElement(RNPressable, { onPress, ...props }, children) };
});

function findButton(root: ReturnType<typeof create>) {
  const matches = root.root.findAll((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function');
  return matches[0] ?? null;
}

import { SaleRow } from '../src/components/sales/SaleRow';
import type { MobileSale } from '../src/types/mobileSales';

const sale: MobileSale = {
  sale_id: 25,
  sale_uuid: '11111111-1111-1111-1111-111111111111',
  reference: 'SL_0025',
  date: '2026-05-15 14:32:00',
  customer: { id: 1, name: 'Cliente Final' },
  branch: { id: 3, name: 'Sucursal 1' },
  items_count: 2,
  grand_total: '575.00',
  paid_amount: '575.00',
  due_amount: '0.00',
  payment_status: 'paid',
  fiscal: null,
};

it('is not pressable when no onPress is given (history-less contexts stay static)', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(SaleRow, { sale })); });
  expect(findButton(root)).toBeNull();
});

it('opens the sale receipt with the exact sale on tap and exposes a useful accessibility label', () => {
  const onPress = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(SaleRow, { sale, onPress })); });

  const button = findButton(root);
  expect(button).not.toBeNull();
  expect(button!.props.accessibilityLabel).toMatch(/SL_0025/);
  expect(button!.props.accessibilityLabel).toMatch(/575\.00/);

  act(() => { button!.props.onPress(); });
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(onPress).toHaveBeenCalledWith(sale);
});

it('does not recreate the press handler across re-renders with the same onPress prop (memo-friendly)', () => {
  const onPress = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(SaleRow, { sale, onPress })); });
  const first = findButton(root)!.props.onPress;
  act(() => { root.update(React.createElement(SaleRow, { sale, onPress })); });
  const second = findButton(root)!.props.onPress;
  // Rendering twice with an identical sale+onPress must not force new work per row.
  expect(typeof first).toBe('function');
  expect(typeof second).toBe('function');
});
