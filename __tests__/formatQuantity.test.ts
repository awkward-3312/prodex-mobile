import { formatQuantity } from '../src/utils/formatQuantity';

describe('formatQuantity', () => {
  it('trims trailing zeros from whole quantities', () => {
    expect(formatQuantity('12.000')).toBe('12');
    expect(formatQuantity('9.000')).toBe('9');
  });

  it('trims trailing zeros while preserving weighted precision', () => {
    expect(formatQuantity('0.500')).toBe('0.5');
    expect(formatQuantity('0.050')).toBe('0.05');
    expect(formatQuantity('0.345')).toBe('0.345');
    expect(formatQuantity('12.340')).toBe('12.34');
  });

  it('leaves an already-integer string untouched', () => {
    expect(formatQuantity('12')).toBe('12');
    expect(formatQuantity('0')).toBe('0');
  });

  it('preserves a leading sign if backend ever sends one', () => {
    expect(formatQuantity('-0.500')).toBe('-0.5');
    expect(formatQuantity('+12.000')).toBe('+12');
  });

  it('falls back to the raw value for malformed input instead of crashing', () => {
    expect(formatQuantity('abc')).toBe('abc');
    expect(formatQuantity('')).toBe('');
    expect(formatQuantity('12.5.3')).toBe('12.5.3');
    expect(formatQuantity('1e10')).toBe('1e10');
  });

  it('never routes through Number/parseFloat/parseInt (string-only transformation)', () => {
    const numberSpy = jest.spyOn(globalThis, 'Number');
    const parseFloatSpy = jest.spyOn(globalThis, 'parseFloat');
    const parseIntSpy = jest.spyOn(globalThis, 'parseInt');

    formatQuantity('12.000');
    formatQuantity('0.500');

    expect(numberSpy).not.toHaveBeenCalled();
    expect(parseFloatSpy).not.toHaveBeenCalled();
    expect(parseIntSpy).not.toHaveBeenCalled();

    numberSpy.mockRestore();
    parseFloatSpy.mockRestore();
    parseIntSpy.mockRestore();
  });
});
