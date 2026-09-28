let mockReducedMotion = false;
let mockTimingResult: unknown;
const mockWithTiming = jest.fn((value: unknown, _config?: { duration?: number }) => mockTimingResult ?? value);
const mockWithSequence = jest.fn((...values: unknown[]) => values[values.length - 1]);
const mockCancelAnimation = jest.fn();

jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  class LayoutAnimationMock {
    duration() { return this; }
    withInitialValues() { return this; }
  }
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      Text: ReactNative.Text,
      Image: ReactNative.Image,
      ScrollView: ReactNative.ScrollView,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    Easing: { bezier: jest.fn(() => (value: number) => value) },
    FadeIn: new LayoutAnimationMock(),
    FadeInDown: new LayoutAnimationMock(),
    FadeOut: new LayoutAnimationMock(),
    LinearTransition: new LayoutAnimationMock(),
    cancelAnimation: (...args: unknown[]) => mockCancelAnimation(...args),
    interpolateColor: (_value: number, _input: number[], output: string[]) => output[0],
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => mockReducedMotion,
    useSharedValue: (value: unknown) => React.useRef({ value }).current,
    withSequence: (...values: unknown[]) => mockWithSequence(...values),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown, config?: { duration?: number }) => mockWithTiming(value, config),
  };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';

import { ExactValueFeedback } from '../src/components/motion';
import { CartItemRow } from '../src/components/pos/CartItemRow';
import { CartSummaryBar } from '../src/components/pos/CartSummaryBar';
import { CategoryChip } from '../src/components/pos/CategoryChip';
import { ProductCard } from '../src/components/pos/ProductCard';
import type { CartItem, PosProduct } from '../src/types/pos';
import { formatMinorUnits } from '../src/utils/formatCurrency';

const product: PosProduct = {
  id: 'api:product:7:variant:none', productId: 7, productVariantId: null, name: 'Café premium', sku: 'CAF-7', barcode: '7000007', barcodeSymbology: 'EAN13',
  category: 'Bebidas', price: 125, priceMinorUnits: 12500, stock: 30, manageStock: true, oversellingAllowed: false,
  canSell: true, stockStatus: 'Disponible', favorite: false, icon: 'cafe-outline', tone: 'teal',
};

const cartItem = (quantity: number): CartItem => ({ product, quantity, unitPriceCents: 12500 });

beforeEach(() => {
  mockReducedMotion = false;
  mockTimingResult = undefined;
  mockWithTiming.mockClear();
  mockWithSequence.mockClear();
  mockCancelAnimation.mockClear();
});

it('confirms ProductCard only after an accepted add and never delays the callback', () => {
  const onPress = jest.fn(() => true);
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ProductCard, { product, onPress })); });
  const card = root.root.find((node) => node.props.accessibilityRole === 'button' && String(node.props.accessibilityLabel).startsWith(product.name));

  act(() => card.props.onPress());

  expect(onPress).toHaveBeenCalledWith(product);
  expect(mockWithSequence).toHaveBeenCalledTimes(1);
  expect(mockWithTiming).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
});

it('does not show ProductCard confirmation when stock/business validation rejects the add', () => {
  const onPress = jest.fn(() => false);
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ProductCard, { product, onPress })); });
  const card = root.root.find((node) => node.props.accessibilityRole === 'button' && String(node.props.accessibilityLabel).startsWith(product.name));

  act(() => card.props.onPress());

  expect(onPress).toHaveBeenCalledTimes(1);
  expect(mockWithSequence).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it('replaces ProductCard feedback during 20 rapid accepted taps without timers or blocked actions', () => {
  const onPress = jest.fn(() => true);
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ProductCard, { product, onPress })); });
  const card = root.root.find((node) => node.props.accessibilityRole === 'button' && String(node.props.accessibilityLabel).startsWith(product.name));

  act(() => { for (let tap = 0; tap < 20; tap += 1) card.props.onPress(); });

  expect(onPress).toHaveBeenCalledTimes(20);
  expect(mockWithSequence).toHaveBeenCalledTimes(20);
  expect(mockCancelAnimation).toHaveBeenCalledTimes(20);
  act(() => root.unmount());
});

it('renders cart count and total as exact final values while restarting short feedback', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(CartSummaryBar, { itemCount: 1, totalCents: 12500, onViewCart: jest.fn(), onCheckout: jest.fn() })); });
  mockWithTiming.mockClear();

  act(() => { root.update(React.createElement(CartSummaryBar, { itemCount: 2, totalCents: 25000, onViewCart: jest.fn(), onCheckout: jest.fn() })); });

  const text = root.root.findAllByType(Text).map((node) => node.props.children);
  expect(text).toContain('2 artículos');
  expect(text).toContain(formatMinorUnits(25000));
  expect(text).not.toContain(formatMinorUnits(12500));
  expect(mockWithTiming).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
});

it('keeps quantity controls immediate and gives the row isolated enter, exit, and layout transitions', () => {
  const onIncrease = jest.fn();
  const onDecrease = jest.fn();
  const onRemove = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(CartItemRow, { item: cartItem(1), animateEntering: true, onIncrease, onDecrease, onRemove })); });
  const animatedRow = root.root.find((node) => node.props.entering && node.props.exiting);
  expect(animatedRow.props.layout).toBeTruthy();
  const increase = root.root.find((node) => node.props.accessibilityLabel === 'Aumentar cantidad de Café premium');

  act(() => { for (let tap = 0; tap < 5; tap += 1) increase.props.onPress(); });
  expect(onIncrease).toHaveBeenCalledTimes(5);
  expect(onIncrease).toHaveBeenLastCalledWith(product.id);

  act(() => { root.update(React.createElement(CartItemRow, { item: cartItem(6), animateEntering: true, onIncrease, onDecrease, onRemove })); });
  expect(root.root.findAllByType(Text).map((node) => node.props.children)).toContain(6);
  act(() => root.unmount());
});

it('animates POS category selection through color only and safely replaces rapid switches', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(CategoryChip, { label: 'Bebidas', selected: false, onPress: jest.fn(), motionEnabled: true })); });
  mockWithTiming.mockClear();

  act(() => { root.update(React.createElement(CategoryChip, { label: 'Bebidas', selected: true, onPress: jest.fn(), motionEnabled: true })); });
  act(() => { root.update(React.createElement(CategoryChip, { label: 'Bebidas', selected: false, onPress: jest.fn(), motionEnabled: true })); });
  act(() => { root.update(React.createElement(CategoryChip, { label: 'Bebidas', selected: true, onPress: jest.fn(), motionEnabled: true })); });

  expect(mockWithTiming).toHaveBeenCalledTimes(3);
  expect(mockWithTiming.mock.calls.every(([, config]) => config?.duration === 180)).toBe(true);
  expect(mockWithSequence).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it('uses opacity without scale displacement for exact values under Reduced Motion', () => {
  mockReducedMotion = true;
  mockTimingResult = 0.5;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ExactValueFeedback, { value: 1 })); });
  act(() => { root.update(React.createElement(ExactValueFeedback, { value: 2 })); });
  act(() => { root.update(React.createElement(ExactValueFeedback, { value: 2 })); });

  const value = root.root.findByType(Text);
  const flattened = StyleSheet.flatten(value.props.style);
  expect(value.props.children).toBe(2);
  expect(flattened.transform).toEqual([{ scale: 1 }]);
  expect(mockWithTiming).toHaveBeenLastCalledWith(1, expect.objectContaining({ duration: 140, easing: expect.any(Function) }));
  act(() => root.unmount());
});

it('keeps category feedback to a short color transition under Reduced Motion', () => {
  mockReducedMotion = true;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(CategoryChip, { label: 'Todos', selected: false, onPress: jest.fn(), motionEnabled: true })); });
  mockWithTiming.mockClear();
  act(() => { root.update(React.createElement(CategoryChip, { label: 'Todos', selected: true, onPress: jest.fn(), motionEnabled: true })); });

  expect(mockWithTiming).toHaveBeenCalledTimes(1);
  expect(mockWithTiming).toHaveBeenLastCalledWith(1, expect.objectContaining({ duration: 140 }));
  act(() => root.unmount());
});

it('removes CartItem translation and layout movement under Reduced Motion', () => {
  mockReducedMotion = true;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(CartItemRow, { item: cartItem(1), animateEntering: true, onIncrease: jest.fn(), onDecrease: jest.fn(), onRemove: jest.fn() })); });
  const animatedRow = root.root.find((node) => node.props.entering && node.props.exiting);
  expect(animatedRow.props.layout).toBeUndefined();
  act(() => root.unmount());
});
