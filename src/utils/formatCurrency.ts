import { appConfig } from '../config/app';

type CurrencyConfig = typeof appConfig.currency;

export function formatCurrency(value: number, currency: CurrencyConfig = appConfig.currency) {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    currencyDisplay: 'symbol',
    maximumFractionDigits: 2,
  }).format(value);
}

export function toMinorUnits(value: number) {
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) : 0;
}

export function parseMinorUnits(value: string) {
  const trimmed = value.trim().replace(/\s/g, '');
  if (trimmed.length === 0) return 0;

  const commaIndex = trimmed.lastIndexOf(',');
  const dotIndex = trimmed.lastIndexOf('.');
  let normalized = trimmed;

  if (!/^\d[\d.,]*$/.test(trimmed)) return 0;

  if (commaIndex >= 0 && dotIndex >= 0) {
    const integerPart = commaIndex > dotIndex ? trimmed.slice(0, commaIndex) : trimmed.slice(0, dotIndex);
    const fractionalPart = commaIndex > dotIndex ? trimmed.slice(commaIndex + 1) : trimmed.slice(dotIndex + 1);
    const groupingSeparator = commaIndex > dotIndex ? '.' : ',';
    const groupingPattern = new RegExp(`^\\d{1,3}(?:\\${groupingSeparator}\\d{3})*$`);
    if (!groupingPattern.test(integerPart) || !/^\d+$/.test(fractionalPart)) return 0;
    normalized = `${integerPart.replace(new RegExp(`\\${groupingSeparator}`, 'g'), '')}.${fractionalPart}`;
  } else if (commaIndex >= 0) {
    if ((trimmed.match(/,/g) ?? []).length > 1) {
      if (!/^\d{1,3}(?:,\d{3})+$/.test(trimmed)) return 0;
      normalized = trimmed.replace(/,/g, '');
    } else {
      const fractionalDigits = trimmed.length - commaIndex - 1;
      normalized = fractionalDigits === 3 && commaIndex <= 3 ? trimmed.replace(',', '') : trimmed.replace(',', '.');
    }
  } else if ((trimmed.match(/\./g) ?? []).length > 1) {
    return 0;
  }

  normalized = normalized.replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? toMinorUnits(parsed) : 0;
}

export function formatMinorUnits(value: number, currency: CurrencyConfig = appConfig.currency) {
  return formatCurrency(value / 100, currency);
}

export function calculateTaxMinorUnits(subtotalCents: number, rate: number) {
  return Math.round(Math.max(0, subtotalCents) * Math.max(0, rate));
}

export function calculateShortfallMinorUnits(totalCents: number, receivedCents: number) {
  return Math.max(0, totalCents - receivedCents);
}

export function calculateChangeMinorUnits(totalCents: number, receivedCents: number) {
  return Math.max(0, receivedCents - totalCents);
}

export function calculateMixedPaymentMinorUnits(amounts: number[]) {
  return amounts.reduce((total, amount) => total + Math.max(0, Math.round(amount)), 0);
}
