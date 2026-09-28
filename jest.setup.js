// Native module with no JS-only fallback; use the package's own official
// jest mock so tests never hit a real native bridge call.
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  const React = require('react');
  class LayoutAnimationMock {
    duration() { return this; }
    delay() { return this; }
    easing() { return this; }
    springify() { return this; }
    damping() { return this; }
    stiffness() { return this; }
    withInitialValues() { return this; }
    reduceMotion() { return this; }
  }
  const useSharedValue = (value) => React.useRef({ value }).current;
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      Text: ReactNative.Text,
      Image: ReactNative.Image,
      ScrollView: ReactNative.ScrollView,
      FlatList: ReactNative.FlatList,
      createAnimatedComponent: (Component) => Component,
    },
    Easing: { bezier: jest.fn(() => (value) => value) },
    FadeIn: new LayoutAnimationMock(),
    FadeInDown: new LayoutAnimationMock(),
    FadeOut: new LayoutAnimationMock(),
    LinearTransition: new LayoutAnimationMock(),
    cancelAnimation: jest.fn(),
    interpolateColor: jest.fn((_value, _input, output) => output[0]),
    runOnJS: (callback) => callback,
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => false,
    useSharedValue,
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value, _config, callback) => {
      if (callback) callback(true);
      return value;
    }),
  };
});
require('react-native-gesture-handler/jestSetup');
