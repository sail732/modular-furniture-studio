import { describe, expect, it } from "vitest";
import { formatDimensions, formatLength, inchesToUm, umToCmDisplay, umToInches } from "./units";

describe("units", () => {
  it("converts whole and fractional inches exactly", () => {
    expect(inchesToUm(1)).toBe(25_400);
    expect(inchesToUm(72)).toBe(1_828_800);
    expect(inchesToUm(15.75)).toBe(400_050);
    expect(inchesToUm(0.125)).toBe(3_175);
    expect(umToInches(inchesToUm(47.5))).toBe(47.5);
  });

  it("rejects values finer than 1/8 inch instead of rounding silently", () => {
    expect(() => inchesToUm(1.1)).toThrow(RangeError);
    expect(() => inchesToUm(1 / 16)).toThrow(RangeError);
  });

  it("formats inches with fractions", () => {
    expect(formatLength(inchesToUm(72))).toBe("72″");
    expect(formatLength(inchesToUm(15.75))).toBe("15¾″");
    expect(formatLength(inchesToUm(0.5))).toBe("½″");
  });

  it("formats centimetres to one decimal for display", () => {
    expect(umToCmDisplay(inchesToUm(72))).toBe(182.9);
    expect(formatLength(inchesToUm(16), "cm")).toBe("40.6 cm");
  });

  it("formats a full dimension set", () => {
    expect(
      formatDimensions({ widthUm: inchesToUm(72), heightUm: inchesToUm(22), depthUm: inchesToUm(16) }),
    ).toBe("72″ W × 22″ H × 16″ D");
  });

  it("rejects non-integer canonical values", () => {
    expect(() => formatLength(1.5)).toThrow(RangeError);
  });
});
