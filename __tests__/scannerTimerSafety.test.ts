const mockBack = jest.fn();
const mockAddProduct = jest.fn();
const mockResolveScannedProduct = jest.fn();
let mockScannerReducedMotion = false;
let mockCanGoBack = true;
const mockReplace = jest.fn();
let mockPermission: any = { granted: true, canAskAgain: true };
const mockInsets = { top: 59, bottom: 34, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: ({ children }: any) => children, useSafeAreaInsets: () => mockInsets }));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-linking', () => ({ openSettings: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), canGoBack: () => mockCanGoBack, replace: (path: string) => mockReplace(path) } }));
jest.mock('expo-camera', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    CameraView: (props: unknown) => React.createElement(View, { ...props as object, testID: 'camera' }),
    useCameraPermissions: () => [mockPermission, jest.fn()],
  };
});
jest.mock('../src/components/pos/PosRegisterGuard', () => ({ PosRegisterGuard: ({ children }: { children: unknown }) => children }));
jest.mock('../src/components/motion', () => {
  const React = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');
  return {
    FadeInView: ({ children, ...props }: { children: unknown }) => React.createElement(View, props, children),
    PressableScale: ({ children, ...props }: { children: unknown }) => React.createElement(Pressable, props, children),
    useProdexMotion: () => ({ reducedMotion: mockScannerReducedMotion, durations: { touch: 140 } }),
  };
});
jest.mock('../src/context/PosCartContext', () => ({ usePosCart: () => ({ items: [], addProduct: mockAddProduct }) }));
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ session: { baseUrl: 'https://tenant.test', accessToken: 'token' }, inventoryLocationId: 7, signOut: jest.fn() }) }));
jest.mock('../src/services/pos/productBarcodeService', () => ({ resolveScannedProduct: (...args: unknown[]) => mockResolveScannedProduct(...args) }));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import { cancelAnimation } from 'react-native-reanimated';
import ScannerScreen from '../app/pos/scanner';

const foundResult = {
  status: 'found',
  product: { id: '42', name: 'Producto escaneado', price: 100, stock: 5, stockStatus: 'Disponible' },
  quantity: 1,
};

beforeEach(() => {
  jest.useFakeTimers();
  mockScannerReducedMotion = false;
  mockBack.mockReset();
  mockReplace.mockReset();
  mockCanGoBack = true;
  mockPermission = { granted: true, canAskAgain: true };
  mockAddProduct.mockReset();
  mockResolveScannedProduct.mockReset().mockResolvedValue(foundResult);
  (cancelAnimation as jest.Mock).mockClear();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

async function scan(root: ReturnType<typeof create>) {
  const camera = root.root.findByProps({ testID: 'camera' });
  await act(async () => {
    camera.props.onBarcodeScanned({ data: 'ABC123', type: 'code128' });
    await Promise.resolve();
  });
}

it('cancels the delayed return when the scanner unmounts', async () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ScannerScreen)); });
  await scan(root);
  expect(mockAddProduct).toHaveBeenCalledTimes(1);
  const cancellationCount = (cancelAnimation as jest.Mock).mock.calls.length;
  act(() => root.unmount());
  expect(cancelAnimation).toHaveBeenCalledTimes(cancellationCount + 1);
  act(() => { jest.advanceTimersByTime(450); });
  expect(mockBack).not.toHaveBeenCalled();
});

it('allows only one back navigation when the user closes before the success delay', async () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ScannerScreen)); });
  await scan(root);
  const close = root.root.find((node) => node.props.accessibilityLabel === 'Cerrar escáner');
  act(() => close.props.onPress());
  act(() => { jest.advanceTimersByTime(450); });
  expect(mockBack).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});

it('locks duplicate barcode events before the backend result resolves', async () => {
  let resolveResult!: (value: typeof foundResult) => void;
  mockResolveScannedProduct.mockImplementationOnce(() => new Promise((resolve) => { resolveResult = resolve; }));
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ScannerScreen)); });
  const handler = root.root.findByProps({ testID: 'camera' }).props.onBarcodeScanned;

  await act(async () => {
    const first = handler({ data: 'ABC123', type: 'code128' });
    const duplicate = handler({ data: 'ABC123', type: 'code128' });
    resolveResult(foundResult);
    await Promise.all([first, duplicate]);
  });

  expect(mockResolveScannedProduct).toHaveBeenCalledTimes(1);
  expect(mockAddProduct).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});

it('keeps scanner errors textual, assertive, and retryable without navigating', async () => {
  mockResolveScannedProduct.mockResolvedValueOnce({ status: 'not_found', barcode: 'MISSING' });
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ScannerScreen)); });
  await scan(root);

  const alert = root.root.find((node) => node.type === View && node.props.accessibilityRole === 'alert');
  expect(alert.props.accessibilityLiveRegion).toBe('none');
  expect(root.root.findAllByType(Text).filter((node) => node.props.children === 'Producto no encontrado')).toHaveLength(1);
  expect(mockAddProduct).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(450); });
  expect(mockBack).not.toHaveBeenCalled();

  const retry = root.root.find((node) => node.props.accessibilityLabel === 'Escanear nuevamente');
  act(() => retry.props.onPress());
  expect(root.root.findByProps({ testID: 'camera' }).props.onBarcodeScanned).toEqual(expect.any(Function));
  act(() => root.unmount());
});

it('uses a single polite live region only for the successful result', async () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ScannerScreen)); });
  await scan(root);

  const liveRegions = root.root.findAll((node) => node.type === View && node.props.accessibilityLiveRegion === 'polite');
  expect(liveRegions).toHaveLength(1);
  expect(liveRegions[0].props.accessibilityRole).toBeUndefined();
  act(() => root.unmount());
});

it('keeps scanner emphasis to opacity with no scale pulse under Reduced Motion', async () => {
  mockScannerReducedMotion = true;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ScannerScreen)); });
  await scan(root);

  const target = root.root.findByProps({ testID: 'scanner-target' });
  expect(StyleSheet.flatten(target.props.style).transform).toEqual([{ scale: 1 }]);
  expect(mockAddProduct).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});

it.each([null, { granted: false, canAskAgain: false }])('keeps a usable close action while permissions are unresolved/denied: %j', (permission) => {
  mockPermission = permission;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ScannerScreen)); });
  const close = root.root.find(node => node.props.accessibilityLabel === 'Cerrar escáner');
  expect(StyleSheet.flatten(close.props.style)).toMatchObject({ width: 44, height: 44 });
  expect(StyleSheet.flatten(root.root.findByProps({ testID: 'scanner-safe-content' }).props.style)).toMatchObject({ paddingTop: 59, paddingBottom: 34 });
  act(() => close.props.onPress());
  expect(mockBack).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});

it('returns to POS when a scanner deep link has no back history', () => {
  mockCanGoBack = false;
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ScannerScreen)); });
  act(() => root.root.find(node => node.props.accessibilityLabel === 'Cerrar escáner').props.onPress());
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)/pos');
  act(() => root.unmount());
});

it.each(['close', 'unmount'])('ignores a product lookup that completes after %s', async (action) => {
  let resolveResult!: (value: typeof foundResult) => void;
  mockResolveScannedProduct.mockImplementationOnce(() => new Promise(resolve => { resolveResult = resolve; }));
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(ScannerScreen)); });
  act(() => root.root.findByProps({ testID: 'camera' }).props.onBarcodeScanned({ data: 'ABC123', type: 'code128' }));
  act(() => action === 'close' ? root.root.find(node => node.props.accessibilityLabel === 'Cerrar escáner').props.onPress() : root.unmount());
  await act(async () => { resolveResult(foundResult); await Promise.resolve(); });
  act(() => jest.advanceTimersByTime(1000));
  expect(mockAddProduct).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalledTimes(action === 'close' ? 1 : 0);
  if (action === 'close') act(() => root.unmount());
});
