import type { CashRegisterCurrentResponse } from './mobileCashRegisterService';
export type CashRegisterSessionState = {
  status: 'loading' | 'open' | 'closed' | 'error';
  data: CashRegisterCurrentResponse | null;
  error: unknown;
};
/** One in-flight authoritative read shared by focus, opening and manual refresh. */
export class CashRegisterSessionController {
  private state: CashRegisterSessionState = { status: 'loading', data: null, error: null };
  private listeners = new Set<() => void>();
  private pending: Promise<void> | null = null;
  private abort: AbortController | null = null;
  constructor(private read: (signal: AbortSignal) => Promise<CashRegisterCurrentResponse>) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(state: CashRegisterSessionState) { this.state = state; this.listeners.forEach(listener => listener()); }
  refresh = (): Promise<void> => {
    if (this.pending) return this.pending;
    const abort = new AbortController();
    this.abort = abort;
    this.update({ status: 'loading', data: this.state.data, error: null });
    this.pending = this.read(abort.signal).then(data => {
      if (!abort.signal.aborted) this.update({ status: data.status, data, error: null });
    }).catch(error => {
      if (!abort.signal.aborted) this.update({ status: 'error', data: null, error });
    }).finally(() => { if (this.abort === abort) this.pending = null; });
    return this.pending;
  };
  invalidate = () => {
    this.dispose();
    this.update({ status: 'closed', data: null, error: null });
  };
  dispose = () => { this.abort?.abort(); this.abort = null; this.pending = null; };
}
