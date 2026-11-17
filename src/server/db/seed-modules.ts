import type { CellTemplate, ModuleType } from "@/lib/configuration/types";

/**
 * How each module type is named, drawn and assembled. Used by the sample seed
 * to generate modules and their component recipes for every product.
 *
 * Recipe quantities are `fixed + perCount x count`. Part keys are resolved to
 * a product-specific SKU (e.g. "DOOR" -> "LED-DOOR") or a shared SKU.
 */
export interface ModuleBlueprint {
  name: string;
  description: string;
  countLabel: string | null;
  cellTemplate: CellTemplate;
  handles: { fixed: number; perCount: number };
  recipe: {
    part: "SHELF" | "DOOR" | "DRW-BOX" | "DRW-FRONT" | "HW-HINGE" | "HW-RUNNER" | "HW-HANG-RAIL";
    fixed: number;
    perCount: number;
    cutTo: "none" | "bay_width" | "half_bay_width";
  }[];
}

const cell = (kind: CellTemplate[number]["kind"], heightShare = 1, repeat?: "count") => ({
  kind,
  heightShare,
  ...(repeat ? { repeat } : {}),
});

export const moduleBlueprints: Record<ModuleType, ModuleBlueprint> = {
  open: {
    name: "Open bay",
    description: "Open compartments separated by shelves.",
    countLabel: "Compartments",
    cellTemplate: [cell("open", 1, "count")],
    handles: { fixed: 0, perCount: 0 },
    recipe: [{ part: "SHELF", fixed: -1, perCount: 1, cutTo: "bay_width" }],
  },
  door: {
    name: "Cabinet with one door",
    description: "A closed cabinet behind a single door.",
    countLabel: "Shelves inside",
    cellTemplate: [cell("door")],
    handles: { fixed: 1, perCount: 0 },
    recipe: [
      { part: "DOOR", fixed: 1, perCount: 0, cutTo: "bay_width" },
      { part: "HW-HINGE", fixed: 2, perCount: 0, cutTo: "none" },
      { part: "SHELF", fixed: 0, perCount: 1, cutTo: "bay_width" },
    ],
  },
  "door-pair": {
    name: "Cabinet with a pair of doors",
    description: "A wide closed cabinet behind two doors.",
    countLabel: "Shelves inside",
    cellTemplate: [cell("door-pair")],
    handles: { fixed: 2, perCount: 0 },
    recipe: [
      { part: "DOOR", fixed: 2, perCount: 0, cutTo: "half_bay_width" },
      { part: "HW-HINGE", fixed: 4, perCount: 0, cutTo: "none" },
      { part: "SHELF", fixed: 0, perCount: 1, cutTo: "bay_width" },
    ],
  },
  drawers: {
    name: "Drawer bay",
    description: "A stack of drawers.",
    countLabel: "Drawers",
    cellTemplate: [cell("drawer", 1, "count")],
    handles: { fixed: 0, perCount: 1 },
    recipe: [
      { part: "DRW-BOX", fixed: 0, perCount: 1, cutTo: "none" },
      { part: "DRW-FRONT", fixed: 0, perCount: 1, cutTo: "bay_width" },
      { part: "HW-RUNNER", fixed: 0, perCount: 1, cutTo: "none" },
    ],
  },
  hanging: {
    name: "Hanging section",
    description: "Full-height hanging space with a rail.",
    countLabel: null,
    cellTemplate: [cell("hanging")],
    handles: { fixed: 0, perCount: 0 },
    recipe: [{ part: "HW-HANG-RAIL", fixed: 1, perCount: 0, cutTo: "bay_width" }],
  },
  "open-over-door": {
    name: "Open shelves over a cabinet",
    description: "Open compartments above a doored cabinet.",
    countLabel: "Open compartments",
    cellTemplate: [cell("open", 1, "count"), cell("door", 1.4)],
    handles: { fixed: 1, perCount: 0 },
    recipe: [
      { part: "SHELF", fixed: 0, perCount: 1, cutTo: "bay_width" },
      { part: "DOOR", fixed: 1, perCount: 0, cutTo: "bay_width" },
      { part: "HW-HINGE", fixed: 2, perCount: 0, cutTo: "none" },
    ],
  },
  "hanging-over-drawers": {
    name: "Hanging space over drawers",
    description: "Short hanging space above a stack of drawers.",
    countLabel: "Drawers",
    cellTemplate: [cell("hanging", 3), cell("drawer", 1, "count")],
    handles: { fixed: 0, perCount: 1 },
    recipe: [
      { part: "HW-HANG-RAIL", fixed: 1, perCount: 0, cutTo: "bay_width" },
      { part: "SHELF", fixed: 1, perCount: 0, cutTo: "bay_width" },
      { part: "DRW-BOX", fixed: 0, perCount: 1, cutTo: "none" },
      { part: "DRW-FRONT", fixed: 0, perCount: 1, cutTo: "bay_width" },
      { part: "HW-RUNNER", fixed: 0, perCount: 1, cutTo: "none" },
    ],
  },
  knee: {
    name: "Knee space",
    description: "Open space under the desktop for sitting.",
    countLabel: null,
    cellTemplate: [cell("void")],
    handles: { fixed: 0, perCount: 0 },
    recipe: [],
  },
};

export const moduleCode = (prefix: string, type: ModuleType) => `${prefix}-${type.toUpperCase()}`;
