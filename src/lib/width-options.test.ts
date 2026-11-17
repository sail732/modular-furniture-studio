import { describe, expect, it } from "vitest";
import { inchesToUm as inch } from "./units";
import { allowedWidths, isAllowedWidth, nearestAllowedWidths } from "./width-options";
import { sampleProducts, toTemplateRow } from "@/server/db/seed-data";

const rule = { minWidthUm: inch(66), maxWidthUm: inch(90), widthIncrementUm: inch(6) };

describe("width options", () => {
  it("lists every allowed width in fixed steps", () => {
    expect(allowedWidths(rule)).toEqual([66, 72, 78, 84, 90].map(inch));
    expect(allowedWidths({ ...rule, maxWidthUm: inch(66) })).toEqual([inch(66)]);
  });

  it("accepts only widths on a step inside the range", () => {
    expect(isAllowedWidth(rule, inch(78))).toBe(true);
    expect(isAllowedWidth(rule, inch(66))).toBe(true);
    expect(isAllowedWidth(rule, inch(90))).toBe(true);
    expect(isAllowedWidth(rule, inch(80))).toBe(false);
    expect(isAllowedWidth(rule, inch(60))).toBe(false);
    expect(isAllowedWidth(rule, inch(96))).toBe(false);
    expect(isAllowedWidth(rule, inch(78) + 1)).toBe(false);
    expect(isAllowedWidth(rule, 78.5)).toBe(false);
  });

  it("suggests the nearest allowed widths without choosing for the customer", () => {
    expect(nearestAllowedWidths(rule, inch(80))).toEqual([inch(78), inch(84)]);
    expect(nearestAllowedWidths(rule, inch(78))).toEqual([inch(78)]);
    expect(nearestAllowedWidths(rule, inch(40))).toEqual([inch(66)]);
    expect(nearestAllowedWidths(rule, inch(200))).toEqual([inch(90)]);
  });

  it("rejects rules whose range is not a whole number of steps", () => {
    expect(() => allowedWidths({ ...rule, maxWidthUm: inch(88) })).toThrow(RangeError);
    expect(() => allowedWidths({ ...rule, widthIncrementUm: 0 })).toThrow(RangeError);
    expect(() => isAllowedWidth({ ...rule, minWidthUm: inch(100) }, inch(78))).toThrow(RangeError);
  });

  it("every sample design has its standard width among its allowed widths", () => {
    for (const product of sampleProducts) {
      for (const template of product.templates.map(toTemplateRow)) {
        expect(isAllowedWidth(template, template.defaultWidthUm), template.code).toBe(true);
      }
    }
  });
});
