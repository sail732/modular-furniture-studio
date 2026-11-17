import { describe, expect, it } from "vitest";
import { describeLayout, elevationLayoutSchema } from "./elevation-layout";
import { sampleProducts } from "@/server/db/seed-data";

describe("elevation layout", () => {
  it("accepts every sample template layout", () => {
    for (const product of sampleProducts) {
      for (const template of product.templates) {
        expect(() => elevationLayoutSchema.parse(template.previewLayout), template.code).not.toThrow();
      }
    }
  });

  it("rejects empty or non-positive layouts", () => {
    expect(elevationLayoutSchema.safeParse({ base: "legs", columns: [] }).success).toBe(false);
    expect(
      elevationLayoutSchema.safeParse({
        base: "legs",
        columns: [{ widthShare: 0, cells: [{ kind: "door", heightShare: 1 }] }],
      }).success,
    ).toBe(false);
    expect(
      elevationLayoutSchema.safeParse({
        base: "legs",
        columns: [{ widthShare: 1, cells: [{ kind: "hatch", heightShare: 1 }] }],
      }).success,
    ).toBe(false);
  });

  it("describes a layout in words for assistive technology", () => {
    const ledgerB = sampleProducts[0].templates[1].previewLayout;
    expect(describeLayout(ledgerB)).toBe("4 bays with 3 doors, 2 drawers");
    const holdA = sampleProducts.find((p) => p.slug === "hold-wardrobe")!.templates[0].previewLayout;
    expect(describeLayout(holdA)).toBe("1 bay with 2 doors");
  });
});
