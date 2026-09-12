import { CashRegisterOperationError } from './mobileCashRegisterOperationService';
import type { CashRegisterOperationResponse } from './mobileCashRegisterOperationService';

export type CashRegisterAttempt<TRequest> = { version: 1; owner: string; kind: string; request: TRequest; response?: CashRegisterOperationResponse };
export type CashRegisterOperationState<TRequest> = {
  status: 'loading' | 'idle' | 'submitting' | 'uncertain' | 'business_error' | 'session_expired' | 'success';
  attempt: CashRegisterAttempt<TRequest> | null;
  error: CashRegisterOperationError | null;
};
export type AttemptStorage = { read: () => Promise<string | null>; write: (value: string) => Promise<void>; remove: () => Promise<void> };

type Dependencies<TRequest> = {
  owner: string;
  kind: string;
  storage: AttemptStorage;
  send: (request: TRequest, token: string) => Promise<CashRegisterOperationResponse>;
  onSuccess?: (response: CashRegisterOperationResponse) => void;
};

/**
 * Generic retry-safe controller for a single frozen cash-register write (open OR
 * one movement). Mirrors SaleSubmissionController: the caller must persist the
 * exact request (with its operation_uuid) to durable storage BEFORE the first
 * POST. If that write fails, the POST is never sent. A retry always resends the
 * identical stored request/UUID, never a new one.
 */
export class CashRegisterOperationController<TRequest> {
  private state: CashRegisterOperationState<TRequest> = { status: 'loading', attempt: null, error: null };
  private listeners = new Set<() => void>();
  private busy = false;
  private restored: Promise<void> | null = null;
  constructor(private deps: Dependencies<TRequest>) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  isLocked = () => !['idle', 'business_error'].includes(this.state.status);
  private update(state: CashRegisterOperationState<TRequest>) { this.state = state; this.listeners.forEach(listener => listener()); }

  restore = (): Promise<void> => {
    if (this.restored) return this.restored;
    this.restored = this.load();
    return this.restored;
  };

  private async load() {
    try {
      const raw = await this.deps.storage.read();
      if (!raw) { this.update({ status: 'idle', attempt: null, error: null }); return; }
      const attempt = JSON.parse(raw) as CashRegisterAttempt<TRequest>;
      if (attempt.version !== 1 || attempt.owner !== this.deps.owner || attempt.kind !== this.deps.kind) throw new Error('Invalid saved attempt');
      this.update({ status: attempt.response ? 'success' : 'uncertain', attempt, error: null });
      if (attempt.response) this.deps.onSuccess?.(attempt.response);
    } catch {
      this.restored = null;
      this.update({ status: 'uncertain', attempt: null, error: new CashRegisterOperationError('uncertain', 'storage_error') });
    }
  }

  /** Never called with a freshly generated UUID unless start() itself creates the request. */
  async start(buildRequest: () => TRequest, token: string): Promise<void> {
    if (this.busy || this.state.status === 'success' || this.isLocked()) return;
    this.busy = true;
    try {
      const request = buildRequest();
      const attempt: CashRegisterAttempt<TRequest> = { version: 1, owner: this.deps.owner, kind: this.deps.kind, request };
      this.update({ status: 'submitting', attempt, error: null });
      // If saving fails, never send. The frozen request stays recoverable for explicit retry.
      await this.deps.storage.write(JSON.stringify(attempt));
      await this.send(attempt, token);
    } catch (error) {
      this.update({ ...this.state, status: this.state.attempt ? 'uncertain' : 'business_error', error: error instanceof CashRegisterOperationError ? error : new CashRegisterOperationError('uncertain', 'storage_error') });
    } finally { this.busy = false; }
  }

  async retry(token: string): Promise<void> {
    if (this.busy || !['uncertain', 'session_expired'].includes(this.state.status)) return;
    if (!this.state.attempt) { this.restored = null; await this.restore(); return; }
    const attempt = this.state.attempt;
    this.busy = true;
    this.update({ status: 'submitting', attempt, error: null });
    try {
      await this.deps.storage.write(JSON.stringify(attempt));
      await this.send(attempt, token);
    } catch {
      this.update({ status: 'uncertain', attempt, error: new CashRegisterOperationError('uncertain', 'storage_error') });
    } finally { this.busy = false; }
  }

  private async send(attempt: CashRegisterAttempt<TRequest>, token: string) {
    let response: CashRegisterOperationResponse;
    try {
      response = await this.deps.send(attempt.request, token);
    } catch (error) {
      const failure = error instanceof CashRegisterOperationError ? error : new CashRegisterOperationError('uncertain', 'network_error');
      if (failure.kind === 'business_error') {
        // A definitive business rejection (permission, validation, already-open,
        // closed, idempotency conflict) can be abandoned/corrected: never auto-resend.
        await this.deps.storage.remove();
        this.update({ status: 'business_error', attempt: null, error: failure });
      } else {
        // Uncertain (timeout/network/5xx) or 401: the POST may already have committed.
        // Keep the frozen attempt; explicit retry only, same UUID, never auto-resend.
        this.update({ status: failure.kind === 'session_expired' ? 'session_expired' : 'uncertain', attempt, error: failure });
      }
      return;
    }
    const confirmed = { ...attempt, response };
    try { await this.deps.storage.write(JSON.stringify(confirmed)); } catch { /* Backend already confirmed; UUID remains recoverable. */ }
    this.update({ status: 'success', attempt: confirmed, error: null });
    this.deps.onSuccess?.(response);
  }

  async finish(): Promise<boolean> {
    if (this.busy || this.state.status !== 'success') return false;
    this.busy = true;
    try {
      await this.deps.storage.remove();
      this.update({ status: 'idle', attempt: null, error: null });
      return true;
    } catch {
      this.update({ ...this.state, error: new CashRegisterOperationError('uncertain', 'storage_error') });
      return false;
    } finally { this.busy = false; }
  }

  /** Abandons a definitive business_error draft so the form can be edited and resubmitted with a new UUID. */
  reset() {
    if (!this.busy && this.state.status === 'business_error') this.update({ status: 'idle', attempt: null, error: null });
  }
}
