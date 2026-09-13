import { CashRegisterSessionController } from '../src/services/cashRegister/cashRegisterSessionController';
import type { CashRegisterCurrentResponse } from '../src/services/cashRegister/mobileCashRegisterService';
const closed: CashRegisterCurrentResponse = { status: 'closed', register: null, summary: null };
it('fails closed during unknown state and errors, deduplicates in-flight reads', async () => {
  let resolve!: (value: CashRegisterCurrentResponse) => void;
  const read = jest.fn(() => new Promise<CashRegisterCurrentResponse>(r => { resolve = r; }));
  const controller = new CashRegisterSessionController(read);
  expect(controller.getSnapshot().status).toBe('loading');
  const first = controller.refresh(); const second = controller.refresh();
  expect(first).toBe(second); expect(read).toHaveBeenCalledTimes(1);
  resolve(closed); await first;
  expect(controller.getSnapshot().status).toBe('closed');
  read.mockRejectedValueOnce(new Error('network'));
  await controller.refresh();
  expect(controller.getSnapshot().status).toBe('error');
  expect(controller.getSnapshot().data).toBeNull();
});
it('invalidating after close aborts old reads and prevents stale reopening', async () => {
  let resolve!: (value: CashRegisterCurrentResponse) => void;
  const read = jest.fn((signal: AbortSignal) => new Promise<CashRegisterCurrentResponse>(r => { resolve = r; }));
  const controller = new CashRegisterSessionController(read);
  const pending = controller.refresh();
  controller.invalidate();
  expect(read.mock.calls[0][0].aborted).toBe(true);
  resolve({ status: 'open', register: {} as any, summary: {} as any }); await pending;
  expect(controller.getSnapshot().status).toBe('closed');
});
it('disposal prevents responses from an earlier authenticated owner', async () => {
  let resolve!: (value: CashRegisterCurrentResponse) => void;
  const controller = new CashRegisterSessionController(() => new Promise(r => { resolve = r; }));
  const pending = controller.refresh(); controller.dispose(); resolve(closed); await pending;
  expect(controller.getSnapshot().status).toBe('loading');
});
