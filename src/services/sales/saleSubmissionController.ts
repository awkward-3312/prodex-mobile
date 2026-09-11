import type { CheckoutCurrency } from '../../types/mobilePosCheckout';
import type { SalePreflightRequest } from '../../types/mobilePosSalePreflight';
import type { SaleAttempt, SaleSubmissionRequest, SaleSubmissionResponse } from '../../types/mobileSaleSubmission';
import { buildSaleSubmissionRequest, parseSaleSubmissionResponse, SaleSubmissionError } from './mobileSaleSubmissionService';

export type SubmissionState = {
  status: 'loading' | 'idle' | 'submitting' | 'uncertain' | 'business_error' | 'session_expired' | 'success';
  attempt: SaleAttempt | null;
  error: SaleSubmissionError | null;
};
export type AttemptStorage = { read: () => Promise<string | null>; write: (value: string) => Promise<void>; remove: () => Promise<void> };
type Dependencies = {
  owner: string;
  uuid: () => string;
  storage: AttemptStorage;
  send: (request: SaleSubmissionRequest, token: string) => Promise<SaleSubmissionResponse>;
  confirmed: () => void;
};

/** Owns the frozen request beyond screen mounts. No timer/background task can submit. */
export class SaleSubmissionController {
  private state: SubmissionState = { status: 'loading', attempt: null, error: null };
  private listeners = new Set<() => void>();
  private busy = false;
  private draftUuid: string | null = null;
  private restored: Promise<void> | null = null;
  constructor(private deps: Dependencies) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  isLocked = () => !['idle', 'business_error'].includes(this.state.status);
  private update(state: SubmissionState) { this.state = state; this.listeners.forEach(listener => listener()); }

  restore = (): Promise<void> => {
    if (this.restored) return this.restored;
    this.restored = this.load();
    return this.restored;
  };
  private async load() {
    try {
      const raw = await this.deps.storage.read();
      if (!raw) { this.update({ status: 'idle', attempt: null, error: null }); return; }
      const attempt = JSON.parse(raw) as SaleAttempt;
      if (attempt.version !== 1 || attempt.owner !== this.deps.owner || !attempt.currency || typeof attempt.currency.symbol !== 'string') throw Error('Invalid saved attempt');
      attempt.request = buildSaleSubmissionRequest(attempt.request.sale_uuid, { client_id: attempt.request.client_id, lines: attempt.request.lines, payment_intent: attempt.request.payments });
      if (attempt.response) attempt.response = parseSaleSubmissionResponse(attempt.response, attempt.request.sale_uuid);
      this.draftUuid = attempt.request.sale_uuid;
      this.update({ status: attempt.response ? 'success' : 'uncertain', attempt, error: null });
      if (attempt.response) this.deps.confirmed();
    } catch {
      this.restored = null;
      this.update({ status: 'uncertain', attempt: null, error: new SaleSubmissionError('uncertain', 'storage_error') });
    }
  }

  async start({ intent, currentKey, validatedKey, canSubmit, currency, token }: { intent: SalePreflightRequest; currentKey: string; validatedKey: string; canSubmit: boolean; currency: CheckoutCurrency; token: string }): Promise<void> {
    if (this.busy || this.state.status === 'success' || this.isLocked()) return;
    if (!canSubmit || !validatedKey || currentKey !== validatedKey) {
      this.update({ ...this.state, status: 'business_error', error: new SaleSubmissionError('business_error', 'stale_preflight') });
      return;
    }
    this.busy = true;
    try {
      this.draftUuid ??= this.deps.uuid();
      const request = buildSaleSubmissionRequest(this.draftUuid, intent);
      const attempt: SaleAttempt = { version: 1, owner: this.deps.owner, request, currency: { ...currency } };
      this.update({ status: 'submitting', attempt, error: null });
      // If saving fails, never send. Keep the UUID and frozen intent for explicit retry.
      await this.deps.storage.write(JSON.stringify(attempt));
      await this.send(attempt, token, false);
    } catch (error) {
      this.update({ ...this.state, status: this.state.attempt ? 'uncertain' : 'business_error', error: error instanceof SaleSubmissionError ? error : new SaleSubmissionError('uncertain', 'storage_error') });
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
      await this.send(attempt, token, true);
    } catch {
      this.update({ status: 'uncertain', attempt, error: new SaleSubmissionError('uncertain', 'storage_error') });
    } finally { this.busy = false; }
  }

  private async send(attempt: SaleAttempt, token: string, wasUncertain: boolean) {
    let response: SaleSubmissionResponse;
    try {
      response = await this.deps.send(attempt.request, token);
      // Validate even injected adapters; only the matching UUID can unlock/clear a cart.
      response = parseSaleSubmissionResponse(response, attempt.request.sale_uuid);
    } catch (error) {
      const failure = error instanceof SaleSubmissionError ? error : new SaleSubmissionError('uncertain', 'network_error');
      if (failure.kind === 'business_error' && !wasUncertain) {
        // A first, definitive rejection may be edited and re-preflighted with the same UUID.
        await this.deps.storage.remove();
        this.update({ status: 'business_error', attempt: null, error: failure });
      } else {
        // A later rejection cannot disprove a previously committed but unanswered POST.
        this.update({ status: failure.kind === 'session_expired' ? 'session_expired' : 'uncertain', attempt, error: failure });
      }
      return;
    }
    const confirmed = { ...attempt, response };
    try { await this.deps.storage.write(JSON.stringify(confirmed)); } catch { /* Pending UUID remains recoverable; backend already confirmed. */ }
    this.update({ status: 'success', attempt: confirmed, error: null });
    this.deps.confirmed();
  }

  async finish(): Promise<boolean> {
    if (this.busy || this.state.status !== 'success') return false;
    this.busy = true;
    try {
      await this.deps.storage.remove();
      this.draftUuid = null;
      this.update({ status: 'idle', attempt: null, error: null });
      return true;
    } catch {
      this.update({ ...this.state, error: new SaleSubmissionError('uncertain', 'storage_error') });
      return false;
    } finally { this.busy = false; }
  }
  resetDraft() { if (!this.busy && !this.isLocked() && this.state.status !== 'success') this.draftUuid = null; }
}
