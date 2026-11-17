/**
 * The single definition of which widths a design can be made in.
 *
 * Business rule (confirmed 2026-11-16): width is the only dimension a customer
 * can change, and only in fixed steps between a design's minimum and maximum.
 * Height and depth are fixed per design. All values are integer micrometres.
 */
export interface WidthRule {
  minWidthUm: number;
  maxWidthUm: number;
  widthIncrementUm: number;
}

function assertRule(rule: WidthRule): void {
  const { minWidthUm: min, maxWidthUm: max, widthIncrementUm: step } = rule;
  if (![min, max, step].every(Number.isInteger) || min <= 0 || step <= 0 || max < min) {
    throw new RangeError("Invalid width rule");
  }
  if ((max - min) % step !== 0) {
    throw new RangeError("Width range is not a whole number of steps");
  }
}

/** Every width the design can be made in, smallest first. */
export function allowedWidths(rule: WidthRule): number[] {
  assertRule(rule);
  const widths: number[] = [];
  for (let w = rule.minWidthUm; w <= rule.maxWidthUm; w += rule.widthIncrementUm) widths.push(w);
  return widths;
}

export function isAllowedWidth(rule: WidthRule, widthUm: number): boolean {
  assertRule(rule);
  return (
    Number.isInteger(widthUm) &&
    widthUm >= rule.minWidthUm &&
    widthUm <= rule.maxWidthUm &&
    (widthUm - rule.minWidthUm) % rule.widthIncrementUm === 0
  );
}

/**
 * The allowed widths closest to a requested width, for explaining a rejected
 * value. Returns one width when the request is allowed or outside the range,
 * and the two neighbours when it falls between steps. Never used to change a
 * customer's input silently.
 */
export function nearestAllowedWidths(rule: WidthRule, widthUm: number): number[] {
  assertRule(rule);
  if (widthUm <= rule.minWidthUm) return [rule.minWidthUm];
  if (widthUm >= rule.maxWidthUm) return [rule.maxWidthUm];
  const below =
    rule.minWidthUm + Math.floor((widthUm - rule.minWidthUm) / rule.widthIncrementUm) * rule.widthIncrementUm;
  return below === widthUm ? [below] : [below, below + rule.widthIncrementUm];
}
