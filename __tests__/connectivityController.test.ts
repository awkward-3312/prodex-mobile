type FakeNetInfoState = { isConnected: boolean | null; isInternetReachable: boolean | null };

let mockListener: ((state: FakeNetInfoState) => void) | null = null;
const mockFetch = jest.fn(async (): Promise<FakeNetInfoState> => ({ isConnected: true, isInternetReachable: true }));
const mockUnsubscribe = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (listener: (state: FakeNetInfoState) => void) => {
      mockListener = listener;
      return mockUnsubscribe;
    },
    fetch: () => mockFetch(),
  },
}));

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function emit(state: Partial<FakeNetInfoState>) {
  mockListener?.({ isConnected: true, isInternetReachable: true, ...state });
}

function load() {
  jest.resetModules();
  mockListener = null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../src/services/connectivity/connectivityController') as typeof import('../src/services/connectivity/connectivityController');
}

beforeEach(() => {
  mockFetch.mockClear().mockResolvedValue({ isConnected: true, isInternetReachable: true });
  mockUnsubscribe.mockClear();
});

it('starts online after the initial NetInfo.fetch resolves', async () => {
  const { connectivityController } = load();
  await flush();
  expect(connectivityController.getSnapshot().status).toBe('online');
  expect(connectivityController.isOnline()).toBe(true);
});

it('goes offline when the device loses its network interface', async () => {
  const { connectivityController } = load();
  await flush();
  emit({ isConnected: false, isInternetReachable: null });
  expect(connectivityController.getSnapshot().status).toBe('offline');
  expect(connectivityController.isOnline()).toBe(false);
});

it('goes offline when connected but internet is confirmed unreachable (e.g. captive portal)', async () => {
  const { connectivityController } = load();
  await flush();
  emit({ isConnected: true, isInternetReachable: false });
  expect(connectivityController.getSnapshot().status).toBe('offline');
});

it('reports reconnecting while the interface is back but reachability is still unconfirmed, then online once confirmed', async () => {
  const { connectivityController } = load();
  await flush();
  emit({ isConnected: false, isInternetReachable: null });
  expect(connectivityController.getSnapshot().status).toBe('offline');

  emit({ isConnected: true, isInternetReachable: null });
  expect(connectivityController.getSnapshot().status).toBe('reconnecting');

  emit({ isConnected: true, isInternetReachable: true });
  expect(connectivityController.getSnapshot().status).toBe('online');
});

it('does not report reconnecting on a cold start with unconfirmed reachability (only after having been offline)', async () => {
  mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: null });
  const { connectivityController } = load();
  await flush();
  expect(connectivityController.getSnapshot().status).toBe('online');
});

it('notifies subscribers only on an actual status change', async () => {
  const { connectivityController } = load();
  await flush();
  const listener = jest.fn();
  const unsubscribe = connectivityController.subscribe(listener);

  emit({ isConnected: true, isInternetReachable: true }); // same status, no notification
  expect(listener).not.toHaveBeenCalled();

  emit({ isConnected: false, isInternetReachable: null });
  expect(listener).toHaveBeenCalledTimes(1);

  unsubscribe();
  emit({ isConnected: true, isInternetReachable: true });
  expect(listener).toHaveBeenCalledTimes(1);
});
