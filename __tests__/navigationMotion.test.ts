let mockReducedMotion = false;
let mockTabsProps: any;
let mockBottomInset = 0;
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => ({ width: 393, height: 852, scale: 3, fontScale: mockFontScale }) }));
const mockTabScreens: any[] = [];

jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { Ionicons: ({ name }: { name: string }) => React.createElement(Text, { testID: `icon-${name}` }, name) };
});

jest.mock('react-native-reanimated', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { Text, View },
    Easing: { bezier: jest.fn(() => jest.fn()) },
    interpolateColor: (value: number, _input: number[], output: string[]) => value >= 0.5 ? output[1] : output[0],
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => mockReducedMotion,
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: jest.fn((value: unknown) => value),
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Tabs = ({ children, ...props }: any) => {
    mockTabsProps = props;
    return React.createElement(View, null, children);
  };
  Tabs.Screen = (props: any) => {
    mockTabScreens.push(props);
    return null;
  };
  return { Tabs };
});

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: mockBottomInset, left: 0 }) }));
jest.mock('../src/context/CashRegisterContext', () => ({ useCashRegister: () => ({ status: 'open' }) }));
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ hasPermission: () => true }) }));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import TabsLayout from '../app/(tabs)/_layout';
import { ProdexTabItem } from '../src/components/navigation/ProdexTabItem';
import { getRootRouteOptions, getRootStackOptions, rootRoutes } from '../src/navigation/rootStackOptions';
import { colors, motion } from '../src/theme';

const timingMock = withTiming as jest.Mock;

function flattenedStyle(root: ReturnType<typeof create>, testID: string) {
  return StyleSheet.flatten(root.root.findByProps({ testID }).props.style);
}

beforeEach(() => {
  mockReducedMotion = false;
  mockBottomInset = 0;
  mockFontScale = 1;
  mockTabsProps = undefined;
  mockTabScreens.length = 0;
  timingMock.mockClear();
});

it('renders the inactive tab as an outline with a hidden pill and stable layout', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ProdexTabItem, { activeName: 'home', inactiveName: 'home-outline', focused: false, label: 'Inicio' })); });
  expect(flattenedStyle(root, 'prodex-tab-icon')).toMatchObject({ opacity: motion.opacity.inactive, transform: [{ scale: 1 }] });
  expect(flattenedStyle(root, 'prodex-tab-pill').opacity).toBe(0);
  expect(flattenedStyle(root, 'prodex-tab-icon-inactive').opacity).toBe(1);
  expect(flattenedStyle(root, 'prodex-tab-icon-active').opacity).toBe(0);
  expect(root.root.findByProps({ testID: 'prodex-tab-item' }).props.accessible).toBe(false);
  act(() => root.unmount());
});

it('renders the active tab with coordinated pill, filled icon, opacity and semantic scale', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ProdexTabItem, { activeName: 'home', inactiveName: 'home-outline', focused: true, label: 'Inicio' })); });
  expect(flattenedStyle(root, 'prodex-tab-icon')).toMatchObject({ opacity: 1, transform: [{ scale: motion.scale.feedback }] });
  expect(flattenedStyle(root, 'prodex-tab-pill').opacity).toBe(1);
  expect(flattenedStyle(root, 'prodex-tab-icon-inactive').opacity).toBe(0);
  expect(flattenedStyle(root, 'prodex-tab-icon-active').opacity).toBe(1);
  expect(timingMock).toHaveBeenLastCalledWith(1, expect.objectContaining({ duration: motion.duration.state, easing: expect.any(Function) }));
  act(() => root.unmount());
});

it('updates inactive to active with one shared timing transition', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ProdexTabItem, { activeName: 'receipt', inactiveName: 'receipt-outline', focused: false, label: 'Ventas' })); });
  timingMock.mockClear();
  act(() => { root.update(React.createElement(ProdexTabItem, { activeName: 'receipt', inactiveName: 'receipt-outline', focused: true, label: 'Ventas' })); });
  expect(timingMock).toHaveBeenCalledTimes(1);
  expect(timingMock).toHaveBeenCalledWith(1, expect.objectContaining({ duration: motion.duration.state }));
  act(() => root.unmount());
});

it('coordinates label color and opacity with the same selection progress without changing layout', () => {
  let inactive!: ReturnType<typeof create>;
  act(() => { inactive = create(React.createElement(ProdexTabItem, { activeName: 'cube', inactiveName: 'cube-outline', focused: false, label: 'Inventario' })); });
  expect(flattenedStyle(inactive, 'prodex-tab-label')).toMatchObject({ color: colors.inkMuted, opacity: motion.opacity.inactive, fontSize: 11 });
  act(() => inactive.unmount());

  let active!: ReturnType<typeof create>;
  act(() => { active = create(React.createElement(ProdexTabItem, { activeName: 'cube', inactiveName: 'cube-outline', focused: true, label: 'Inventario' })); });
  expect(flattenedStyle(active, 'prodex-tab-label')).toMatchObject({ color: colors.brand, opacity: 1, fontSize: 11 });
  act(() => active.unmount());
});

it('removes tab scale and shortens the state fade under Reduced Motion', () => {
  mockReducedMotion = true;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ProdexTabItem, { activeName: 'cart', inactiveName: 'cart-outline', focused: true, label: 'POS' })); });
  expect(flattenedStyle(root, 'prodex-tab-icon').transform).toEqual([{ scale: 1 }]);
  expect(timingMock).toHaveBeenLastCalledWith(1, expect.objectContaining({ duration: motion.duration.touch }));
  act(() => root.unmount());
});

it('uses the native tab button so selection, links and onPress remain owned by the navigator', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(TabsLayout)); });
  const options = mockTabsProps.screenOptions({ route: { name: 'index' } });
  expect(options.animation).toBe('none');
  expect(options.tabBarButton).toBeUndefined();
  expect(options.tabBarIcon({ focused: true })).toEqual(expect.anything());
  expect(options.tabBarShowLabel).toBe(false);
  expect(options.tabBarLabel).toBeUndefined();
  expect(options.tabBarStyle.height).toBe(56);
  expect(options.tabBarIconStyle.height).toBe(48);
  expect(mockTabScreens.map((screen) => screen.options.tabBarAccessibilityLabel)).toEqual(['Inicio', 'Punto de venta', 'Inventario', 'Ventas', 'Más opciones']);
  act(() => root.unmount());
});

it('configures a native hierarchical push baseline and a reduced fade fallback', () => {
  expect(getRootStackOptions(false)).toMatchObject({ headerShown: false, presentation: 'card', animation: 'default', gestureEnabled: true, gestureDirection: 'horizontal' });
  expect(getRootStackOptions(true)).toMatchObject({ presentation: 'card', animation: 'fade', animationDuration: motion.duration.touch });
  expect(rootRoutes).toEqual(expect.arrayContaining(['clients/[id]', 'sales/[id]', 'cash-register/open', 'cash-register/close', 'reports/index', 'pos/checkout']));
});

it('keeps Checkout hierarchical while Scanner and customer editor use their semantic presentations', () => {
  expect(getRootRouteOptions('pos/checkout', false)).toMatchObject({ presentation: 'card', animation: 'default' });
  expect(getRootRouteOptions('pos/scanner', false)).toEqual({ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false });
  expect(getRootRouteOptions('clients/manage', false)).toEqual({ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true });
  expect(getRootRouteOptions('clients/manage', true)).toEqual({ presentation: 'modal', animation: 'fade', gestureEnabled: true });
});

it.each([0, 24, 34])('counts the bottom safe area exactly once for inset %s', bottom => {
  mockBottomInset = bottom;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(TabsLayout)); });
  for (const route of ['index', 'pos', 'inventory', 'sales', 'more']) {
    const options = mockTabsProps.screenOptions({ route: { name: route } });
    expect(options.tabBarIcon({ focused: false })).toBeTruthy();
    expect(options.tabBarStyle.height).toBe(56 + bottom);
    expect(options.tabBarStyle.height - options.tabBarStyle.paddingTop - options.tabBarStyle.paddingBottom).toBe(48);
  }
  act(() => root.unmount());
});

it('grows the label slot with the system font size while retaining the safe area', () => {
  mockFontScale = 2;
  mockBottomInset = 34;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(TabsLayout)); });
  const options = mockTabsProps.screenOptions({ route: { name: 'index' } });
  expect(options.tabBarStyle.height).toBe(104);
  expect(options.tabBarIconStyle.height).toBe(62);
  act(() => root.unmount());
});
