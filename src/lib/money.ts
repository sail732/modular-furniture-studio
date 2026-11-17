/**
 * Money is always an integer number of minor units (cents for USD).
 * Formatting is the only place a decimal representation appears.
 */
export function formatMoney(
  minorUnits: number,
  currency = "USD",
  locale = "en-US",
): string {
  if (!Number.isInteger(minorUnits)) {
    throw new RangeError("Money must be an integer number of minor units");
  }
  const digits = new Intl.NumberFormat(locale, { style: "currency", currency })
    .resolvedOptions().maximumFractionDigits ?? 2;
  const divisor = 10 ** digits;
  const wholeOnly = minorUnits % divisor === 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: wholeOnly ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(minorUnits / divisor);
}

/** Parse a whole-dollar filter value (e.g. "1500") into cents, or null. */
export function wholeUnitsToMinor(value: string | undefined): number | null {
  if (!value || !/^\d{1,7}$/.test(value)) return null;
  return Number(value) * 100;
}
