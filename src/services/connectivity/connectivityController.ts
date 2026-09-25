import { useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';

export type ConnectivityStatus = 'online' | 'offline' | 'reconnecting';
export type ConnectivityState = { status: ConnectivityStatus };

/**
 * Single app-wide source of truth for device connectivity, built on
 * @react-native-community/netinfo (Expo-supported, bundled with SDK 57).
 * Not tenant/session-scoped: it reflects the device's network state, so a
 * single singleton for the app's lifetime is correct (mirrors the
 * getSnapshot/subscribe pattern used by the other controllers in this repo,
 * e.g. SaleSubmissionController, CashRegisterOperationController).
 *
 * Status meaning:
 * - 'offline': no network interface (isConnected === false) or the network
 *   is confirmed to have no internet access (isInternetReachable === false).
 * - 'reconnecting': the network interface just came back but reachability
 *   hasn't been confirmed yet (isInternetReachable still null/probing),
 *   and the last known state was offline.
 * - 'online': connected with confirmed (or not-yet-contradicted) internet
 *   access. Reachability is optimistic on cold start to avoid flashing
 *   "reconnecting" before NetInfo has reported anything.
 */
class ConnectivityController {
  private state: ConnectivityState = { status: 'online' };
  private listeners = new Set<() => void>();
  private wasOffline = false;

  constructor() {
    NetInfo.addEventListener(this.handleChange);
    // addEventListener alone does not guarantee an immediate callback on
    // every platform; prime the real state explicitly.
    NetInfo.fetch().then(this.handleChange).catch(() => {});
  }

  getSnapshot = (): ConnectivityState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  isOnline = (): boolean => this.state.status === 'online';

  private handleChange = (netState: NetInfoState) => {
    const status = this.deriveStatus(netState);
    if (status === this.state.status) return;
    this.wasOffline = status === 'offline' ? true : status === 'online' ? false : this.wasOffline;
    this.state = { status };
    this.listeners.forEach((listener) => listener());
  };

  private deriveStatus(netState: NetInfoState): ConnectivityStatus {
    if (netState.isConnected === false) return 'offline';
    if (netState.isInternetReachable === false) return 'offline';
    if (netState.isInternetReachable == null) return this.wasOffline ? 'reconnecting' : 'online';
    return 'online';
  }
}

export const connectivityController = new ConnectivityController();

/** Imperative check for non-component code (services, controllers). */
export function isOnline(): boolean {
  return connectivityController.isOnline();
}

/** React hook for components/screens that need to render connectivity state. */
export function useConnectivity(): ConnectivityState {
  return useSyncExternalStore(connectivityController.subscribe, connectivityController.getSnapshot, connectivityController.getSnapshot);
}
