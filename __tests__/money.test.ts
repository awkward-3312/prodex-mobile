import {
  calculateChangeMinorUnits,
  calculateMixedPaymentMinorUnits,
  calculateShortfallMinorUnits,
  calculateTaxMinorUnits,
  formatMinorUnits,
  parseMinorUnits,
  toMinorUnits,
} from '../src/utils/formatCurrency';

describe('parseMinorUnits', () => {
  test.each([
    ['1000', 100000],
    ['1000.50', 100050],
    ['1,000', 100000],
    ['1,000.50', 100050],
    ['1.000,50', 100050],
    ['8420.50', 842050],
    ['0.50', 50],
    ['0,50', 50],
    ['0', 0],
  ])('%s converts to %i minor units', (input, expected) => {
    expect(parseMinorUnits(input)).toBe(expected);
  });

  test.each(['', '   ', 'abc', 'NaN', 'Infinity', '-100', '-0.50'])('%j normalizes safely to zero when invalid or negative', (input) => {
    expect(parseMinorUnits(input)).toBe(0);
  });

  it('trims valid surrounding whitespace', () => {
    expect(parseMinorUnits('  8420.50  ')).toBe(842050);
    expect(parseMinorUnits('\t0,50\n')).toBe(50);
  });

  it('rounds values with more than two decimal places', () => {
    expect(parseMinorUnits('1.005')).toBe(101);
    expect(parseMinorUnits('1.004')).toBe(100);
  });

  test.each(['1.000.50', '1,,000', '12..34', '1,2,3'])('%j rejects malformed separators', (input) => {
    expect(parseMinorUnits(input)).toBe(0);
  });
});

describe('minor unit conversion and calculations', () => {
  it('converts and formats L 8,420.50 without precision drift', () => {
    const minorUnits = toMinorUnits(8420.50);
    expect(minorUnits).toBe(842050);
    expect(formatMinorUnits(minorUnits).replace(/\s/g, ' ')).toBe('L 8,420.50');
  });

  it('calculates a cash shortfall in integer minor units', () => {
    expect(calculateShortfallMinorUnits(68450, 50000)).toBe(18450);
  });

  it('calculates cash change in integer minor units', () => {
    expect(calculateChangeMinorUnits(68450, 100000)).toBe(31550);
  });

  it('calculates exact mixed payment and pending balance', () => {
    const paid = calculateMixedPaymentMinorUnits([30000, 30000, 8450]);
    expect(paid).toBe(68450);
    expect(68450 - calculateMixedPaymentMinorUnits([30000, 30000])).toBe(8450);
  });

  it('detects a mixed payment overage', () => {
    expect(calculateMixedPaymentMinorUnits([50000, 40000]) - 68450).toBe(21550);
  });
});

describe('calculateTaxMinorUnits', () => {
  it('returns deterministic integer cents using the mock 15% rate', () => {
    const tax = calculateTaxMinorUnits(59522, 0.15);
    expect(tax).toBe(8928);
    expect(Number.isInteger(tax)).toBe(true);
  });

  test.each([
    [1, 0.15, 0],
    [2, 0.15, 0],
    [3, 0.15, 0],
    [4, 0.15, 1],
    [100, 0.15, 15],
    [101, 0.15, 15],
  ])('rounds %i cents at rate %s to %i cents', (subtotal, rate, expected) => {
    expect(calculateTaxMinorUnits(subtotal, rate)).toBe(expected);
  });

  it('never returns a float or negative tax', () => {
    expect(Number.isInteger(calculateTaxMinorUnits(68450, 0.15))).toBe(true);
    expect(calculateTaxMinorUnits(-100, 0.15)).toBe(0);
    expect(calculateTaxMinorUnits(100, -0.15)).toBe(0);
  });
});