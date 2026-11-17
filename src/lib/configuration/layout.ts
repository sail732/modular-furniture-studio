import type { ElevationLayout } from "@/lib/elevation-layout";
import type { BaseKind, CellTemplate } from "./types";

/** Expand a module's cell template for a given unit count. */
export function expandCells(template: CellTemplate, count: number): ElevationLayout["columns"][number]["cells"] {
  const cells: ElevationLayout["columns"][number]["cells"] = [];
  for (const cell of template) {
    const times = cell.repeat === "count" ? Math.max(count, 0) : 1;
    for (let i = 0; i < times; i++) cells.push({ kind: cell.kind, heightShare: cell.heightShare ?? 1 });
  }
  // A bay always draws something, even with a zero count.
  return cells.length > 0 ? cells : [{ kind: "open", heightShare: 1 }];
}

/**
 * Build the 2D front-view layout from bays. Presentation only: the result is
 * never used for validation, pricing or manufacturing.
 */
export function buildLayout(
  bays: { widthUm: number; count: number; cellTemplate: CellTemplate }[],
  base: BaseKind,
): ElevationLayout {
  return {
    base,
    columns: bays.map((bay) => ({
      widthShare: bay.widthUm,
      cells: expandCells(bay.cellTemplate, bay.count),
    })),
  };
}
