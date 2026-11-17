/**
 * Dimension handling.
 *
 * Canonical storage unit: integer micrometres (µm).
 *   1 inch = 25,400 µm exactly, so every 1/8-inch step (3,175 µm) and every
 *   0.001 mm step is an exact integer. No floating point is stored.
 */
export const UM_PER_INCH = 25_400;
export const UM_PER_MM = 1_000;
export const UM_PER_CM = 10_000;

export type LengthUnit = "in" | "cm";

/** Convert inches to canonical micrometres. Rejects values finer than 1/8 in. */
export function inchesToUm(inches: number): number {
  const um = inches * UM_PER_INCH;
  const rounded = Math.round(um);
  if (Math.abs(um - rounded) > 1e-6 || rounded % (UM_PER_INCH / 8) !== 0) {
    throw new RangeError(`${inches} in is not a multiple of 1/8 inch`);
  }
  return rounded;
}

export function umToInches(um: number): number {
  return um / UM_PER_INCH;
}

/** Centimetres rounded half-up to one decimal place, for display only. */
export function umToCmDisplay(um: number): number {
  return Math.round(um / (UM_PER_CM / 10)) / 10;
}

const FRACTIONS: Record<number, string> = {
  1: "⅛",
  2: "¼",
  3: "⅜",
  4: "½",
  5: "⅝",
  6: "¾",
  7: "⅞",
};

/**
 * Format a canonical length for display, e.g. 72″, 15¾″ or 182.9 cm.
 * Inches are rounded to the nearest 1/8 inch (exact for all stored values
 * created through inchesToUm).
 */
export function formatLength(um: number, unit: LengthUnit = "in"): string {
  if (!Number.isInteger(um) || um < 0) {
    throw new RangeError("Length must be a non-negative integer of micrometres");
  }
  if (unit === "cm") return `${umToCmDisplay(um)} cm`;
  const eighths = Math.round(um / (UM_PER_INCH / 8));
  const whole = Math.floor(eighths / 8);
  const rest = eighths % 8;
  if (rest === 0) return `${whole}″`;
  return `${whole === 0 ? "" : whole}${FRACTIONS[rest]}″`;
}

/** e.g. 72″ W × 22″ H × 16″ D */
export function formatDimensions(
  size: { widthUm: number; heightUm: number; depthUm: number },
  unit: LengthUnit = "in",
): string {
  return `${formatLength(size.widthUm, unit)} W × ${formatLength(size.heightUm, unit)} H × ${formatLength(size.depthUm, unit)} D`;
}
