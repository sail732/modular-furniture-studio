import type { Selection } from "@/lib/configuration/types";
import type { EngineInternals, PartRef } from "./catalog";
import { overallWidth } from "./engine";

export interface ResolvedItem {
  source: "carcass" | "bay" | "option";
  bayIndex: number | null;
  moduleCode: string | null;
  componentId: string;
  sku: string;
  componentRevision: number;
  name: string;
  quantity: number;
  cutLengthUm: number | null;
  finishCode: string | null;
}

/**
 * Turn a VALID selection into the list of components it is built from.
 * Callers must validate first; this function does not re-check rules.
 *
 * Cut lengths are nominal (overall or bay width). They are not manufacturing
 * dimensions: panel-thickness deductions, tolerances and kerf are Phase 6.
 */
export function resolveItems(internals: EngineInternals, selection: Selection): ResolvedItem[] {
  const items: ResolvedItem[] = [];
  const width = overallWidth(selection.bays);
  const add = (
    part: PartRef,
    quantity: number,
    source: ResolvedItem["source"],
    extra: Partial<Pick<ResolvedItem, "bayIndex" | "moduleCode" | "cutLengthUm">> = {},
  ) => {
    if (quantity <= 0) return;
    items.push({
      source,
      bayIndex: extra.bayIndex ?? null,
      moduleCode: extra.moduleCode ?? null,
      componentId: part.id,
      sku: part.sku,
      componentRevision: part.revision,
      name: part.name,
      quantity,
      cutLengthUm: extra.cutLengthUm ?? null,
      finishCode: part.takesFinish ? selection.finishCode : null,
    });
  };

  for (const c of internals.carcass) {
    if (c.whenBase !== null && c.whenBase !== selection.base) continue;
    if (c.cutTo === "bay_width") {
      // One line per bay, each cut to that bay's width.
      selection.bays.forEach((bay, i) => add(c.part, c.quantity, "carcass", { bayIndex: i, cutLengthUm: bay.widthUm }));
      continue;
    }
    const multiplier =
      c.quantityRule === "per_bay"
        ? selection.bays.length
        : c.quantityRule === "per_divider"
          ? selection.bays.length - 1
          : 1;
    add(c.part, c.quantity * multiplier, "carcass", { cutLengthUm: c.cutTo === "overall_width" ? width : null });
  }

  let handles = 0;
  selection.bays.forEach((bay, i) => {
    const recipe = internals.moduleRecipes.get(bay.moduleCode);
    if (!recipe) throw new Error(`resolveItems: unknown module ${bay.moduleCode}`);
    for (const r of recipe.parts) {
      const cut = r.cutTo === "bay_width" ? bay.widthUm : r.cutTo === "half_bay_width" ? bay.widthUm / 2 : null;
      add(r.part, r.fixed + r.perCount * bay.count, "bay", { bayIndex: i, moduleCode: bay.moduleCode, cutLengthUm: cut });
    }
    handles += recipe.handlesFixed + recipe.handlesPerCount * bay.count;
  });

  if (selection.handleSku !== null && handles > 0) {
    const handle = internals.optionParts.get(selection.handleSku);
    if (!handle) throw new Error(`resolveItems: unknown handle ${selection.handleSku}`);
    add(handle, handles, "option");
  }
  for (const accessory of selection.accessories) {
    const part = internals.optionParts.get(accessory.sku);
    if (!part) throw new Error(`resolveItems: unknown accessory ${accessory.sku}`);
    add(part, accessory.quantity, "option");
  }
  return items;
}
