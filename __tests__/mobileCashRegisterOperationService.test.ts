import {
  buildCashRegisterMovementRequest,
  buildCashRegisterOpenRequest,
  CashRegisterOperationError,
  parseCashRegisterOperationResponse,
} from '../src/services/cashRegister/mobileCashRegisterOperationService';

const uuid = '123e4567-e89b-42d3-a456-426614174000';

describe('buildCashRegisterOpenRequest', () => {
  it('accepts a valid opening balance and trims notes', () => {
    const request = buildCashRegisterOpenRequest(uuid, '500.00', '  Apertura normal  ');
    expect(request).toEqual({ operation_uuid: uuid, opening_balance: '500.00', notes: 'Apertura normal' });
  });

  it('sends null notes when blank', () => {
    const request = buildCashRegisterOpenRequest(uuid, '0.00', '   ');
    expect(request.notes).toBeNull();
  });

  it('rejects a non-decimal-string opening balance', () => {
    expect(() => buildCashRegisterOpenRequest(uuid, 'abc', '')).toThrow(CashRegisterOperationError);
  });

  it('rejects an invalid uuid', () => {
    expect(() => buildCashRegisterOpenRequest('not-a-uuid', '10.00', '')).toThrow(CashRegisterOperationError);
  });
});

describe('buildCashRegisterMovementRequest', () => {
  it('accepts a valid cash-in request', () => {
    const request = buildCashRegisterMovementRequest(uuid, 5, 'in', '50.00', 'Cambio inicial');
    expect(request).toEqual({ operation_uuid: uuid, register_id: 5, type: 'in', amount: '50.00', notes: 'Cambio inicial' });
  });

  it('rejects amount of zero', () => {
    expect(() => buildCashRegisterMovementRequest(uuid, 5, 'in', '0', 'Motivo válido')).toThrow(CashRegisterOperationError);
  });

  it('rejects a negative amount', () => {
    expect(() => buildCashRegisterMovementRequest(uuid, 5, 'out', '-10.00', 'Motivo válido')).toThrow(CashRegisterOperationError);
  });

  it('rejects a reason shorter than 3 characters', () => {
    expect(() => buildCashRegisterMovementRequest(uuid, 5, 'in', '10.00', 'ab')).toThrow(CashRegisterOperationError);
  });

  it('rejects a missing reason', () => {
    expect(() => buildCashRegisterMovementRequest(uuid, 5, 'out', '10.00', '   ')).toThrow(CashRegisterOperationError);
  });
});

describe('parseCashRegisterOperationResponse', () => {
  const validRegister = { id: 5, opened_at: '2026-09-12 08:00:00', opening_balance: '500.00', branch: null, inventory_location: null, warehouse: null, cash_drawer: null };
  const validSummary = {
    transaction_count: 0, total_sales: '0.00', cash_sales: '0.00', cash_in: '50.00', cash_out: '0.00', cash_refunds: '0.00',
    expected_cash: '550.00', card_system_total: '0.00', transfer_total: '0.00',
  };

  it('parses a valid response', () => {
    const parsed = parseCashRegisterOperationResponse({
      success: true, idempotent: false, operation: { operation_uuid: uuid, operation_type: 'cash_in' },
      register: validRegister, summary: validSummary,
    }, uuid);
    expect(parsed.idempotent).toBe(false);
    expect(parsed.operationType).toBe('cash_in');
    expect(parsed.summary.cashIn).toBe('50.00');
  });

  it('throws uncertain invalid_response when the operation_uuid does not match', () => {
    expect(() => parseCashRegisterOperationResponse({
      success: true, idempotent: false, operation: { operation_uuid: 'different-uuid', operation_type: 'cash_in' },
      register: validRegister, summary: validSummary,
    }, uuid)).toThrow(CashRegisterOperationError);
  });

  it('throws uncertain invalid_response on malformed register/summary', () => {
    expect(() => parseCashRegisterOperationResponse({
      success: true, idempotent: false, operation: { operation_uuid: uuid, operation_type: 'open' }, register: null, summary: null,
    }, uuid)).toThrow(CashRegisterOperationError);
  });
});
