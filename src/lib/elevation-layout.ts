import { z } from "zod";

/**
 * Phase 1 illustrative front-elevation layout for a design template.
 *
 * This is presentation data only. From Phase 2 the layout is derived from the
 * template's modules; nothing here is a source of truth for dimensions, rules
 * or price.
 */
export const cellKinds = ["door", "door-pair", "drawer", "open", "hanging", "void"] as const;
export type CellKind = (typeof cellKinds)[number];

export const elevationLayoutSchema = z.object({
  base: z.enum(["legs", "plinth", "floor", "wall"]),
  columns: z
    .array(
      z.object({
        widthShare: z.number().positive(),
        cells: z
          .array(z.object({ kind: z.enum(cellKinds), heightShare: z.number().positive() }))
          .min(1),
      }),
    )
    .min(1),
});

export type ElevationLayout = z.infer<typeof elevationLayoutSchema>;

/** Human summary used as the illustration's accessible description. */
export function describeLayout(layout: ElevationLayout): string {
  const counts = new Map<CellKind, number>();
  for (const column of layout.columns) {
    for (const cell of column.cells) {
      if (cell.kind === "void") continue;
      const n = cell.kind === "door-pair" ? 2 : 1;
      const key = cell.kind === "door-pair" ? "door" : cell.kind;
      counts.set(key, (counts.get(key) ?? 0) + n);
    }
  }
  const labels: Record<CellKind, [string, string]> = {
    door: ["door", "doors"],
    "door-pair": ["door", "doors"],
    drawer: ["drawer", "drawers"],
    open: ["open compartment", "open compartments"],
    hanging: ["hanging section", "hanging sections"],
    void: ["", ""],
  };
  const parts = [...counts.entries()].map(
    ([kind, n]) => `${n} ${n === 1 ? labels[kind][0] : labels[kind][1]}`,
  );
  const bays = layout.columns.length;
  return `${bays} ${bays === 1 ? "bay" : "bays"} with ${parts.join(", ")}`;
}
