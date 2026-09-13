import * as SecureStore from 'expo-secure-store';
import { CustomerWriteError, validCustomerCreate, validManagedCustomer, type CustomerCreateRequest, type ManagedCustomer } from './customerManagementService';

type Storage = { read(): Promise<string | null>; write(raw: string): Promise<void>; remove(): Promise<void> };
type Attempt = { version: 1; owner: string; request: CustomerCreateRequest; result?: ManagedCustomer };
type State = { status: 'loading' | 'idle' | 'busy' | 'uncertain' | 'session_expired' | 'error' | 'success'; attempt: Attempt | null; error: CustomerWriteError | null };
export function customerAttemptStorage(owner: string): Storage {
  const key = `prodex.customer.v1.${Array.from(owner).map(char => char.codePointAt(0)!.toString(16)).join('-')}`;
  return { read: () => SecureStore.getItemAsync(key), write: raw => SecureStore.setItemAsync(key, raw), remove: () => SecureStore.deleteItemAsync(key) };
}
/** One customer creation per tenant/operator. No financial state or tokens are persisted. */
export class CustomerCreateController {
  private state: State = { status: 'loading', attempt: null, error: null };
  private listeners = new Set<() => void>();
  private busy = false;
  private restoring: Promise<void> | null = null;
  constructor(private owner: string, private storage: Storage, private send: (request: CustomerCreateRequest, token: string) => Promise<ManagedCustomer>) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(state: State) { this.state = state; this.listeners.forEach(listener => listener()); }
  restore = () => this.restoring ?? (this.restoring = this.load());
  private async load() {
    try {
      const raw = await this.storage.read();
      if (!raw) { this.set({ status: 'idle', attempt: null, error: null }); return; }
      const attempt = JSON.parse(raw) as Attempt;
      if (attempt.version !== 1 || attempt.owner !== this.owner || !validCustomerCreate(attempt.request) || (attempt.result !== undefined && !validManagedCustomer(attempt.result))) throw new Error();
      this.set({ status: attempt.result ? 'success' : 'uncertain', attempt, error: null });
    } catch { this.set({ status: 'uncertain', attempt: null, error: new CustomerWriteError('uncertain', 'storage_error') }); }
  }
  async start(request: CustomerCreateRequest, token: string) {
    if (this.busy || !['idle', 'error'].includes(this.state.status)) return;
    if (!validCustomerCreate(request)) { this.set({ status: 'error', attempt: null, error: new CustomerWriteError('definitive', 'validation_error') }); return; }
    await this.execute({ version: 1, owner: this.owner, request: JSON.parse(JSON.stringify(request)) }, token);
  }
  async retry(token: string) {
    if (this.busy || !['uncertain', 'session_expired'].includes(this.state.status)) return;
    if (!this.state.attempt) { this.restoring = null; await this.restore(); return; }
    await this.execute(this.state.attempt, token);
  }
  private async execute(attempt: Attempt, token: string) {
    this.busy = true;
    this.set({ status: 'busy', attempt, error: null });
    try {
      await this.storage.write(JSON.stringify(attempt));
    } catch {
      this.set({ status: 'uncertain', attempt, error: new CustomerWriteError('uncertain', 'storage_error') }); this.busy = false; return;
    }
    try {
      const result = await this.send(attempt.request, token);
      if (!validManagedCustomer(result)) throw new CustomerWriteError('uncertain', 'invalid_response');
      const confirmed = { ...attempt, result };
      try { await this.storage.write(JSON.stringify(confirmed)); } catch { /* Frozen pending UUID still recovers this success. */ }
      this.set({ status: 'success', attempt: confirmed, error: null });
    } catch (error) {
      const failure = error instanceof CustomerWriteError ? error : new CustomerWriteError('uncertain', 'network_error');
      if (failure.kind === 'definitive') {
        try { await this.storage.remove(); this.set({ status: 'error', attempt: null, error: failure }); }
        catch { this.set({ status: 'uncertain', attempt, error: new CustomerWriteError('uncertain', 'storage_error') }); }
      } else this.set({ status: failure.kind, attempt, error: failure });
    } finally { this.busy = false; }
  }
  async finish(): Promise<boolean> {
    if (this.busy || this.state.status !== 'success') return false;
    this.busy = true;
    try { await this.storage.remove(); this.set({ status: 'idle', attempt: null, error: null }); return true; }
    catch { this.set({ ...this.state, error: new CustomerWriteError('uncertain', 'storage_error') }); return false; }
    finally { this.busy = false; }
  }
}
