import { describe, expect, it } from "vitest";
import { describeLayout, elevationLayoutSchema } from "./elevation-layout";
import { buildLayout, expandCells } from "./configuration/layout";
import { sampleProducts } from "@/server/db/seed-data";
import { moduleBlueprints } from "@/server/db/seed-modules";

const layoutOf = (slug: string, templateIndex: number) => {
  const product = sampleProducts.find((p) => p.slug === slug)!;
  const template = product.templates[templateIndex];
  return buildLayout(
    template.bays.map(([type, widthIn, count]) => ({
      widthUm: widthIn,
      count,
      cellTemplate: moduleBlueprints[type].cellTemplate,
    })),
    template.base,
  );
};

describe("2D layout", () => {
  it("builds a valid layout for every sample template from its modules", () => {
    for (const product of sampleProducts) {
      product.templates.forEach((template, i) => {
        expect(() => elevationLayoutSchema.parse(layoutOf(product.slug, i)), template.code).not.toThrow();
      });
    }
  });

  it("expands repeated cells by the unit count", () => {
    expect(expandCells(moduleBlueprints.drawers.cellTemplate, 3).map((c) => c.kind)).toEqual(["drawer", "drawer", "drawer"]);
    expect(expandCells(moduleBlueprints["open-over-door"].cellTemplate, 2).map((c) => c.kind)).toEqual(["open", "open", "door"]);
    expect(expandCells(moduleBlueprints.door.cellTemplate, 0).map((c) => c.kind)).toEqual(["door"]);
    // Never returns an empty bay.
    expect(expandCells(moduleBlueprints.open.cellTemplate, 0)).toHaveLength(1);
  });

  it("uses bay widths as column proportions", () => {
    const layout = layoutOf("ledger-media-console", 0);
    expect(layout.base).toBe("legs");
    expect(layout.columns.map((c) => c.widthShare)).toEqual([18, 24, 18]);
  });

  it("rejects empty or unknown layouts", () => {
    expect(elevationLayoutSchema.safeParse({ base: "legs", columns: [] }).success).toBe(false);
    expect(
      elevationLayoutSchema.safeParse({
        base: "legs",
        columns: [{ widthShare: 1, cells: [{ kind: "hatch", heightShare: 1 }] }],
      }).success,
    ).toBe(false);
  });

  it("describes a layout in words for assistive technology", () => {
    expect(describeLayout(layoutOf("ledger-media-console", 1))).toBe("4 bays with 3 doors, 2 drawers");
    expect(describeLayout(layoutOf("hold-wardrobe", 0))).toBe("1 bay with 2 doors");
  });
});
