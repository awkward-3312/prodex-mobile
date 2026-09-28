let mockReducedMotion = false;

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    Easing: { bezier: jest.fn(() => jest.fn()) },
    cancelAnimation: jest.fn(),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => mockReducedMotion,
    useSharedValue: (value: unknown) => ({ value }),
    withSpring: jest.fn((value: unknown) => value),
    withTiming: jest.fn((value: unknown) => value),
    // Keep these available if React Native resolves animated host types while rendering.
    Pressable,
    React,
  };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import { cancelAnimation, withSpring, withTiming } from 'react-native-reanimated';
import { FadeInView, PressableScale, useProdexMotion } from '../src/components/motion';
import { motion } from '../src/theme';

const timingMock = withTiming as jest.Mock;
const springMock = withSpring as jest.Mock;
const cancelMock = cancelAnimation as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  mockReducedMotion = false;
  timingMock.mockClear();
  springMock.mockClear();
  cancelMock.mockClear();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

it('exposes full motion values normally and removes displacement, scale and stagger with Reduced Motion', () => {
  let current!: ReturnType<typeof useProdexMotion>;
  function Probe() {
    current = useProdexMotion();
    return null;
  }

  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(Probe)); });
  expect(current.reducedMotion).toBe(false);
  expect(current.distances.content).toBe(motion.distance.content);
  expect(current.scales.press).toBe(motion.scale.press);
  expect(current.stagger.list).toBe(motion.stagger.list);

  mockReducedMotion = true;
  act(() => { root.update(React.createElement(Probe)); });
  expect(current.reducedMotion).toBe(true);
  expect(current.distances).toEqual({ inline: 0, content: 0, overlay: 0 });
  expect(current.scales.press).toBe(1);
  expect(current.stagger.list).toBe(0);
  expect(current.durations.content).toBe(motion.duration.touch);
  act(() => root.unmount());
});

it('FadeInView honors its delay and starts opacity and transform together', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(FadeInView, { delay: 100, children: React.createElement(Text, null, 'Contenido') })); });
  expect(timingMock).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(99); });
  expect(timingMock).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(1); });
  expect(timingMock).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
});

it('FadeInView cancels a pending delay and animations when unmounted', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(FadeInView, { delay: 100, children: React.createElement(Text, null, 'Contenido') })); });
  act(() => root.unmount());
  act(() => { jest.advanceTimersByTime(100); });
  expect(timingMock).not.toHaveBeenCalled();
  expect(cancelMock).toHaveBeenCalledTimes(2);
});

it('FadeInView skips stagger and uses a short fade under Reduced Motion', () => {
  mockReducedMotion = true;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(FadeInView, { delay: 500, children: React.createElement(Text, null, 'Contenido') })); });
  expect(timingMock).toHaveBeenCalledTimes(2);
  expect(timingMock.mock.calls.every(([, config]) => config.duration === motion.duration.touch)).toBe(true);
  act(() => root.unmount());
});

it('PressableScale responds immediately to press in/out and does not delay onPress', () => {
  const onPress = jest.fn();
  const onPressIn = jest.fn();
  const onPressOut = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(PressableScale, { accessibilityLabel: 'Acción', onPress, onPressIn, onPressOut, children: React.createElement(Text, null, 'Acción') })); });
  const pressable = root.root.find((node) => node.props.accessibilityLabel === 'Acción' && typeof node.props.onPressIn === 'function' && node.props.onPressIn !== onPressIn);
  act(() => pressable.props.onPressIn({}));
  expect(springMock).toHaveBeenLastCalledWith(motion.scale.press, motion.springs.press);
  expect(onPressIn).toHaveBeenCalledTimes(1);
  act(() => pressable.props.onPress({}));
  expect(onPress).toHaveBeenCalledTimes(1);
  act(() => pressable.props.onPressOut({}));
  expect(springMock).toHaveBeenLastCalledWith(1, motion.springs.press);
  expect(onPressOut).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});

it('PressableScale replaces scale springs with opacity feedback under Reduced Motion', () => {
  mockReducedMotion = true;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(PressableScale, { accessibilityLabel: 'Acción reducida', onPress: jest.fn(), children: React.createElement(Text, null, 'Acción') })); });
  const pressable = root.root.find((node) => node.props.accessibilityLabel === 'Acción reducida' && typeof node.props.onPressIn === 'function');
  act(() => pressable.props.onPressIn({}));
  expect(springMock).not.toHaveBeenCalled();
  expect(timingMock.mock.calls.some(([value]) => value === 1)).toBe(true);
  expect(timingMock.mock.calls.some(([value]) => value === motion.opacity.press)).toBe(true);
  act(() => root.unmount());
});
