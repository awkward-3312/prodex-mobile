jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return { ...actual, SafeAreaProvider: ({ children }: any) => children };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
let mockReducedMotion = false;

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (Component: unknown) => Component },
    Easing: { bezier: jest.fn(() => jest.fn()) },
    cancelAnimation: jest.fn(),
    runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useEvent: (callback: (...args: unknown[]) => unknown) => callback,
    useReducedMotion: () => mockReducedMotion,
    useSharedValue: (value: unknown) => ({ value }),
    withSpring: jest.fn((value: unknown) => value),
    withTiming: jest.fn((value: unknown, _config: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    }),
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

it('shows its content and calls onClose once on backdrop tap', () => {
  const onClose = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(BottomSheet, { visible: true, onClose, children: React.createElement(Text, null, 'contenido del sheet') })); });

  expect(root.root.findByType(Modal).props.visible).toBe(true);
  expect(root.root.findAllByType(Text).some((node) => node.props.children === 'contenido del sheet')).toBe(true);

  const backdrop = findByLabel(root, 'Cerrar')[0];
  expect(backdrop).toBeTruthy();
  const pressBackdrop = backdrop.props.onPress;
  act(() => { pressBackdrop(); });
  expect(onClose).toHaveBeenCalledTimes(1);

  act(() => { pressBackdrop(); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('maps the system back/request-close event to the same dismissal path', () => {
  const onClose = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(BottomSheet, { visible: true, onClose, children: React.createElement(Text, null, 'contenido') })); });
  act(() => { root.root.findByType(Modal).props.onRequestClose(); });
  expect(onClose).toHaveBeenCalledTimes(1);
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

it('renders a drag handle only when the real sheet gesture is enabled', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(BottomSheet, { visible: true, onClose: jest.fn(), children: React.createElement(Text, null, 'x') })); });
  const handleLike = root.root.findAllByType(View).filter((node) => {
    const style = Array.isArray(node.props.style) ? node.props.style.flat() : [node.props.style];
    return style.some((s: any) => s && s.width === 40 && s.height === 4);
  });
  expect(handleLike).toHaveLength(1);

  let fixedRoot!: ReturnType<typeof create>;
  act(() => { fixedRoot = create(React.createElement(BottomSheet, { visible: true, gestureEnabled: false, onClose: jest.fn(), children: React.createElement(Text, null, 'x') })); });
  const fixedHandleLike = fixedRoot.root.findAllByType(View).filter((node) => {
    const style = Array.isArray(node.props.style) ? node.props.style.flat() : [node.props.style];
    return style.some((s: any) => s && s.width === 40 && s.height === 4);
  });
  expect(fixedHandleLike).toHaveLength(0);
});

it('blocks backdrop and hardware-back dismissal when dismissible is false', () => {
  const onClose = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(BottomSheet, { visible: true, dismissible: false, onClose, children: React.createElement(Text, null, 'contenido') })); });
  expect(findByLabel(root, 'Cerrar')).toHaveLength(0);
  act(() => { root.root.findByType(Modal).props.onRequestClose(); });
  expect(onClose).not.toHaveBeenCalled();
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
