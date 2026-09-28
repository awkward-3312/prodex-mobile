jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../src/components/motion', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    ExactValueFeedback: ({ value, ...props }: any) => React.createElement(Text, props, value),
    PressableScale: ({ children, onPress, ...props }: any) => React.createElement(Pressable, { ...props, onPress }, children),
    useProdexMotion: () => ({ reducedMotion: false }),
  };
});

jest.mock('../src/components/ui/MotionSheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    MotionSheet: ({ children, ...props }: any) => React.createElement(View, { ...props, testID: 'motion-sheet' }, children),
  };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import { ScrollView } from 'react-native';

import { CartSheet } from '../src/components/pos/CartSheet';
import type { CartItem } from '../src/types/pos';

const item: CartItem = {
  product: {
    id: 'product-7',
    name: 'Café premium',
    sku: 'CAF-7',
    barcode: '7000007',
    barcodeSymbology: 'EAN13',
    category: 'Bebidas',
    price: 125,
    stock: 10,
    stockStatus: 'Disponible',
    favorite: false,
    icon: 'cafe-outline',
    tone: 'teal',
  },
  quantity: 2,
  unitPriceCents: 12500,
};

function press(root: ReturnType<typeof create>, label: string) {
  const target = root.root.find((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
  act(() => { target.props.onPress(); });
}

it('keeps cart scrolling, totals, and every business callback after migration', () => {
  const onClose = jest.fn();
  const onIncrease = jest.fn();
  const onDecrease = jest.fn();
  const onRemove = jest.fn();
  const onCheckout = jest.fn();
  let root!: ReturnType<typeof create>;

  act(() => {
    root = create(React.createElement(CartSheet, {
      visible: true,
      items: [item],
      subtotalCents: 25000,
      discountCents: 0,
      taxCents: 3750,
      totalCents: 28750,
      onClose,
      onIncrease,
      onDecrease,
      onRemove,
      onCheckout,
    }));
  });

  const sheet = root.root.find((node) => node.props.testID === 'motion-sheet');
  expect(sheet.props.heightPct).toBe(0.8);
  expect(root.root.findByType(ScrollView)).toBeTruthy();

  press(root, 'Aumentar cantidad de Café premium');
  press(root, 'Disminuir cantidad de Café premium');
  press(root, 'Eliminar Café premium');
  press(root, 'Cobrar venta');
  act(() => { sheet.props.onClose(); });

  expect(onIncrease).toHaveBeenCalledWith('product-7');
  expect(onDecrease).toHaveBeenCalledWith('product-7');
  expect(onRemove).toHaveBeenCalledWith('product-7');
  expect(onCheckout).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('animates only a newly inserted row and does not reanimate existing rows', () => {
  const callbacks = { onClose: jest.fn(), onIncrease: jest.fn(), onDecrease: jest.fn(), onRemove: jest.fn(), onCheckout: jest.fn() };
  const secondItem: CartItem = {
    ...item,
    product: { ...item.product, id: 'product-8', name: 'Té premium', sku: 'TE-8', barcode: '8000008' },
    quantity: 1,
  };
  const props = {
    visible: true,
    subtotalCents: 25000,
    discountCents: 0,
    taxCents: 0,
    totalCents: 25000,
    ...callbacks,
  };
  let root!: ReturnType<typeof create>;

  act(() => { root = create(React.createElement(CartSheet, { ...props, items: [item] })); });
  const enteringRows = () => root.root.findAll((node) => Boolean(node.props.item?.product?.id && node.props.animateEntering));
  expect(enteringRows()).toHaveLength(0);

  act(() => { root.update(React.createElement(CartSheet, { ...props, items: [item, secondItem] })); });
  expect(enteringRows()).toHaveLength(1);

  act(() => { root.update(React.createElement(CartSheet, { ...props, visible: false, items: [item, secondItem] })); });
  act(() => { root.update(React.createElement(CartSheet, { ...props, visible: true, items: [item, secondItem] })); });
  expect(enteringRows()).toHaveLength(0);
  act(() => root.unmount());
});
