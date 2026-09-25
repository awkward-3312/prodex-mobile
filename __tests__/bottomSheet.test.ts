jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../src/components/motion', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    PressableScale: ({ children, onPress, ...props }: any) => React.createElement(Pressable, { onPress, ...props }, children),
    FadeInView: ({ children, style }: any) => React.createElement(View, { style }, children),
  };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import { Modal, Text, View } from 'react-native';
import { BottomSheet } from '../src/components/ui/BottomSheet';

function findByLabel(root: ReturnType<typeof create>, label: string) {
  return root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
}

it('keeps the Modal closed when not visible', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(BottomSheet, { visible: false, onClose: jest.fn(), children: React.createElement(Text, null, 'contenido') })); });
  expect(root.root.findByType(Modal).props.visible).toBe(false);
});

it('shows its content and calls onClose on backdrop tap and on the system back/request-close event', () => {
  const onClose = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(BottomSheet, { visible: true, onClose, children: React.createElement(Text, null, 'contenido del sheet') })); });

  expect(root.root.findByType(Modal).props.visible).toBe(true);
  expect(root.root.findAllByType(Text).some((node) => node.props.children === 'contenido del sheet')).toBe(true);

  const backdrop = findByLabel(root, 'Cerrar')[0];
  expect(backdrop).toBeTruthy();
  act(() => { backdrop.props.onPress(); });
  expect(onClose).toHaveBeenCalledTimes(1);

  act(() => { root.root.findByType(Modal).props.onRequestClose(); });
  expect(onClose).toHaveBeenCalledTimes(2);
});

it('renders an explicit close button only when showCloseButton is requested', () => {
  let closedRoot!: ReturnType<typeof create>;
  act(() => { closedRoot = create(React.createElement(BottomSheet, { visible: true, onClose: jest.fn(), closeAccessibilityLabel: 'Cerrar selector', children: React.createElement(Text, null, 'x') })); });
  // Only the backdrop carries this label when showCloseButton is off.
  expect(findByLabel(closedRoot, 'Cerrar selector')).toHaveLength(1);

  let openRoot!: ReturnType<typeof create>;
  act(() => { openRoot = create(React.createElement(BottomSheet, { visible: true, onClose: jest.fn(), showCloseButton: true, closeAccessibilityLabel: 'Cerrar selector', children: React.createElement(Text, null, 'x') })); });
  // The explicit close button adds more matches for the same label.
  expect(findByLabel(openRoot, 'Cerrar selector').length).toBeGreaterThan(1);
});

it('omits the handle when showHandle is false', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(BottomSheet, { visible: true, onClose: jest.fn(), showHandle: false, children: React.createElement(Text, null, 'x') })); });
  const handleLike = root.root.findAllByType(View).filter((node) => {
    const style = Array.isArray(node.props.style) ? node.props.style.flat() : [node.props.style];
    return style.some((s: any) => s && s.width === 38 && s.height === 4);
  });
  expect(handleLike).toHaveLength(0);
});

it('uses a fixed height when heightPct is given, and a capped max-height otherwise', () => {
  let fixedRoot!: ReturnType<typeof create>;
  act(() => { fixedRoot = create(React.createElement(BottomSheet, { visible: true, onClose: jest.fn(), heightPct: 0.8, children: React.createElement(Text, null, 'x') })); });
  const fixedWrap = fixedRoot.root.findAllByType(View).find((node) => {
    const style = Array.isArray(node.props.style) ? node.props.style.flat() : [node.props.style];
    return style.some((s: any) => s && typeof s.height === 'number');
  });
  expect(fixedWrap).toBeTruthy();

  let cappedRoot!: ReturnType<typeof create>;
  act(() => { cappedRoot = create(React.createElement(BottomSheet, { visible: true, onClose: jest.fn(), children: React.createElement(Text, null, 'x') })); });
  const cappedWrap = cappedRoot.root.findAllByType(View).find((node) => {
    const style = Array.isArray(node.props.style) ? node.props.style.flat() : [node.props.style];
    return style.some((s: any) => s && typeof s.maxHeight === 'number');
  });
  expect(cappedWrap).toBeTruthy();
});
