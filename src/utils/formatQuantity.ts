const DECIMAL_STRING_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;

/**
 * Backend sends stock quantities as fixed decimal(...,3) strings ("12.000",
 * "0.500") to avoid float precision loss in transit. This trims trailing
 * zeros purely as string manipulation — no Number()/parseFloat/parseInt —
 * so a weighted 0.500 stays exactly 0.5, never gets rounded through a float
 * round-trip, and a malformed value safely falls back to itself instead of
 * throwing or silently becoming "NaN".
 */
export function formatQuantity(value: string): string {
  const match = DECIMAL_STRING_PATTERN.exec(value.trim());
  if (!match) return value;

  const [, sign, integerPart, fractionalPart] = match;
  if (!fractionalPart) return `${sign}${integerPart}`;

  const trimmedFraction = fractionalPart.replace(/0+$/, '');
  return trimmedFraction.length > 0 ? `${sign}${integerPart}.${trimmedFraction}` : `${sign}${integerPart}`;
}
