import React from 'react';
import { act, create } from 'react-test-renderer';
import type { AuthSession } from '../src/types/auth';

const session: AuthSession = { version: 1, workspace: 'demo', baseUrl: 'https://tenant.example', accessToken: 'token-1', tokenType: 'Bearer', expiresAt: null };

const mockGetSession = jest.fn(async () => session);
const mockSaveSession = jest.fn(async (_session: AuthSession) => {});
const mockClearSession = jest.fn(async () => {});
jest.mock('../src/services/auth/sessionStorage', () => ({
  getSession: () => mockGetSession(),
  saveSession: (value: AuthSession) => mockSaveSession(value),
  clearSession: () => mockClearSession(),
}));

const mockBootstrap = jest.fn(async (_baseUrl: string, _token: string) => ({ user: { id: 1, name: 'Ana' }, tenant: { base_url: 'https://tenant.example' }, permissions: [] }));
jest.mock('../src/services/auth/authService', () => ({
  bootstrap: (baseUrl: string, token: string) => mockBootstrap(baseUrl, token),
  login: jest.fn(),
  logout: jest.fn(async () => {}),
}));

type ConnectivityStatus = 'online' | 'offline' | 'reconnecting';
let mockStatus: ConnectivityStatus = 'online';
const mockConnectivityListeners = new Set<() => void>();
jest.mock('../src/services/connectivity/connectivityController', () => {
  const actualReact = jest.requireActual('react');
  return {
    isOnline: () => mockStatus === 'online',
    useConnectivity: () => {
      const [, force] = actualReact.useState(0);
      actualReact.useEffect(() => {
        const listener = () => force((n: number) => n + 1);
        mockConnectivityListeners.add(listener);
        return () => mockConnectivityListeners.delete(listener);
      }, []);
      return { status: mockStatus };
    },
  };
});
function setConnectivity(status: ConnectivityStatus) {
  mockStatus = status;
  mockConnectivityListeners.forEach((listener) => listener());
}

import { AuthProvider, useAuth } from '../src/context/AuthContext';

function Probe({ onState }: { onState: (state: ReturnType<typeof useAuth>) => void }) {
  const state = useAuth();
  onState(state);
  return null;
}

async function renderAuth() {
  let latest!: ReturnType<typeof useAuth>;
  let root!: ReturnType<typeof create>;
  await act(async () => {
    root = create(React.createElement(AuthProvider, null, React.createElement(Probe, { onState: (state) => { latest = state; } })));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return { root, get state() { return latest; } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue(session);
  mockBootstrap.mockResolvedValue({ user: { id: 1, name: 'Ana' }, tenant: { base_url: 'https://tenant.example' }, permissions: [] });
  mockStatus = 'online';
  mockConnectivityListeners.clear();
});

it('never calls bootstrap while offline and shows a clear connectivity message', async () => {
  mockStatus = 'offline';
  const { state } = await renderAuth();
  expect(mockBootstrap).not.toHaveBeenCalled();
  expect(state.status).toBe('bootstrap_error');
  expect(state.error).toMatch(/sin conexión/i);
});

it('auto-retries safely on reconnect and reaches authenticated without duplicate calls', async () => {
  mockStatus = 'offline';
  const harness = await renderAuth();
  expect(mockBootstrap).not.toHaveBeenCalled();
  expect(harness.state.status).toBe('bootstrap_error');

  await act(async () => {
    setConnectivity('online');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(mockBootstrap).toHaveBeenCalledTimes(1);
  expect(harness.state.status).toBe('authenticated');

  // A second reconnect notification while already authenticated must not
  // trigger a redundant bootstrap call.
  await act(async () => {
    setConnectivity('reconnecting');
    setConnectivity('online');
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(mockBootstrap).toHaveBeenCalledTimes(1);
});

it('proceeds with bootstrap normally when online from the start', async () => {
  const { state } = await renderAuth();
  expect(mockBootstrap).toHaveBeenCalledTimes(1);
  expect(state.status).toBe('authenticated');
});
