import { describe, expect, it } from "vitest";
import { formatMoney, wholeUnitsToMinor } from "./money";

describe("money", () => {
  it("formats integer cents without floating point drift", () => {
    expect(formatMoney(129_900)).toBe("$1,299");
    expect(formatMoney(129_950)).toBe("$1,299.50");
    expect(formatMoney(5)).toBe("$0.05");
    expect(formatMoney(0)).toBe("$0");
  });

  it("refuses fractional minor units", () => {
    expect(() => formatMoney(10.5)).toThrow(RangeError);
  });

  it("parses whole-dollar filter values", () => {
    expect(wholeUnitsToMinor("1500")).toBe(150_000);
    expect(wholeUnitsToMinor("12.5")).toBeNull();
    expect(wholeUnitsToMinor("-5")).toBeNull();
    expect(wholeUnitsToMinor(undefined)).toBeNull();
  });
});
