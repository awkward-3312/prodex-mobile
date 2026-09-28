jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return { ...actual, SafeAreaProvider: ({ children }: any) => children };
});
let mockReducedMotion = false;
let mockDeferExit = false;
let mockExitCallbacks: Array<(finished: boolean) => void> = [];

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
      if (callback) {
        if (mockDeferExit) mockExitCallbacks.push(callback);
        else callback(true);
      }
      return value;
    }),
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { Modal, Text, View } from 'react-native';
import { fireGestureHandler } from 'react-native-gesture-handler/jest-utils';
import { GestureDetector } from 'react-native-gesture-handler';
import { withSpring, withTiming } from 'react-native-reanimated';

import { MotionSheet, shouldDismissMotionSheet } from '../src/components/ui/MotionSheet';
import { motion } from '../src/theme';

const springMock = withSpring as jest.Mock;
const timingMock = withTiming as jest.Mock;
const mounted: ReturnType<typeof create>[] = [];

function renderSheet(props: Partial<React.ComponentProps<typeof MotionSheet>> = {}) {
  let root!: ReturnType<typeof create>;
  act(() => {
    root = create(React.createElement(MotionSheet, {
      visible: true,
      onClose: jest.fn(),
      accessibilityLabel: 'Panel de prueba',
      children: React.createElement(Text, null, 'Contenido del panel'),
      ...props,
    }));
  });
  mounted.push(root);
  return root;
}

beforeEach(() => {
  mockReducedMotion = false;
  mockDeferExit = false;
  mockExitCallbacks = [];
  springMock.mockClear();
  timingMock.mockClear();
});

afterEach(() => {
  act(() => { mounted.splice(0).forEach((root) => root.unmount()); });
});

it('opens inside an isolated accessible modal and announces its label', () => {
  const root = renderSheet();
  expect(root.root.findByType(Modal).props.visible).toBe(true);
  expect(root.root.findAllByType(Text).some((node) => node.props.children === 'Contenido del panel')).toBe(true);
  expect(root.root.find((node) => node.props.accessibilityViewIsModal === true)).toBeTruthy();
  expect(root.root.find((node) => node.props.accessibilityLabel === 'Panel de prueba')).toBeTruthy();
});

it('uses the damped sheet spring on entry and only short fades with Reduced Motion', () => {
  renderSheet();
  expect(springMock).toHaveBeenCalledWith(0, motion.springs.sheet);

  springMock.mockClear();
  timingMock.mockClear();
  mockReducedMotion = true;
  renderSheet({ accessibilityLabel: 'Panel reducido' });
  expect(springMock).not.toHaveBeenCalled();
  expect(timingMock.mock.calls.some(([, config]) => config.duration === motion.duration.touch)).toBe(true);
});

it('snaps back below the distance and velocity thresholds', () => {
  const onClose = jest.fn();
  const root = renderSheet({ onClose });
  springMock.mockClear();

  const gesture = root.root.findByType(GestureDetector).props.gesture;
  act(() => { fireGestureHandler(gesture, [{ translationY: 48, velocityY: 120 }]); });

  expect(onClose).not.toHaveBeenCalled();
  expect(springMock).toHaveBeenCalledWith(0, motion.springs.sheet);
});

it('dismisses after a long downward drag', () => {
  const onClose = jest.fn();
  const root = renderSheet({ onClose });
  const gesture = root.root.findByType(GestureDetector).props.gesture;

  act(() => { fireGestureHandler(gesture, [{ translationY: motion.gesture.sheet.dismissDistance + 1, velocityY: 100 }]); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('dismisses a fast downward flick before it reaches the distance threshold', () => {
  const onClose = jest.fn();
  const root = renderSheet({ onClose });
  const gesture = root.root.findByType(GestureDetector).props.gesture;

  act(() => { fireGestureHandler(gesture, [{ translationY: 24, velocityY: motion.gesture.sheet.dismissVelocity + 1 }]); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('keeps the exact threshold decision centralized', () => {
  expect(shouldDismissMotionSheet(motion.gesture.sheet.dismissDistance - 1, motion.gesture.sheet.dismissVelocity - 1)).toBe(false);
  expect(shouldDismissMotionSheet(motion.gesture.sheet.dismissDistance, 0)).toBe(true);
  expect(shouldDismissMotionSheet(0, motion.gesture.sheet.dismissVelocity)).toBe(true);
});

it('blocks backdrop, gesture, and hardware-back dismissal when protected', () => {
  const onClose = jest.fn();
  const root = renderSheet({ dismissible: false, onClose });
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Cerrar' && typeof node.props.onPress === 'function')).toHaveLength(0);

  const gesture = root.root.findByType(GestureDetector).props.gesture;
  act(() => {
    fireGestureHandler(gesture, [{ translationY: 180, velocityY: 1200 }]);
    root.root.findByType(Modal).props.onRequestClose();
  });
  expect(onClose).not.toHaveBeenCalled();
});

it('notifies close once and removes the visual content after the exit', () => {
  const onClose = jest.fn();
  const root = renderSheet({ onClose });
  const backdrop = root.root.find((node) => node.props.accessibilityLabel === 'Cerrar' && typeof node.props.onPress === 'function');
  const requestClose = backdrop.props.onPress;

  act(() => { requestClose(); requestClose(); });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(root.root.findByType(Modal).props.visible).toBe(false);
  expect(root.root.findAllByType(Text)).toHaveLength(0);
});

it('keeps the modal mounted until the visual exit reports completion', () => {
  mockDeferExit = true;
  const onClose = jest.fn();
  const root = renderSheet({ onClose });
  const backdrop = root.root.find((node) => node.props.accessibilityLabel === 'Cerrar' && typeof node.props.onPress === 'function');

  act(() => { backdrop.props.onPress(); });
  expect(root.root.findByType(Modal).props.visible).toBe(true);
  expect(onClose).not.toHaveBeenCalled();

  act(() => { mockExitCallbacks.forEach((callback) => callback(true)); });
  expect(root.root.findByType(Modal).props.visible).toBe(false);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('does not notify React after the component unmounts during an exit', () => {
  mockDeferExit = true;
  const onClose = jest.fn();
  const root = renderSheet({ onClose });
  const backdrop = root.root.find((node) => node.props.accessibilityLabel === 'Cerrar' && typeof node.props.onPress === 'function');

  act(() => { backdrop.props.onPress(); });
  expect(onClose).not.toHaveBeenCalled();
  act(() => { root.unmount(); });
  mounted.splice(mounted.indexOf(root), 1);
  act(() => { mockExitCallbacks.forEach((callback) => callback(true)); });
  expect(onClose).not.toHaveBeenCalled();
});

it('uses a short timing snap-back under Reduced Motion while keeping direct drag available', () => {
  mockReducedMotion = true;
  const onClose = jest.fn();
  const root = renderSheet({ onClose });
  springMock.mockClear();
  timingMock.mockClear();
  const gesture = root.root.findByType(GestureDetector).props.gesture;

  act(() => { fireGestureHandler(gesture, [{ translationY: 32, velocityY: 80 }]); });
  expect(onClose).not.toHaveBeenCalled();
  expect(springMock).not.toHaveBeenCalled();
  expect(timingMock).toHaveBeenCalledWith(0, { duration: motion.duration.touch });
});
