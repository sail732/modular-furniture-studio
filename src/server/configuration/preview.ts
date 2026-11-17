import { buildLayout } from "@/lib/configuration/layout";
import type { ConfiguratorCatalog, Selection } from "@/lib/configuration/types";

/** Everything a read-only view needs to draw and describe a saved selection. */
export function describeSelection(catalog: ConfiguratorCatalog, selection: Selection) {
  const modules = new Map(catalog.modules.map((m) => [m.code, m]));
  const finish = catalog.materials.flatMap((m) => m.finishes).find((f) => f.code === selection.finishCode);
  const material = catalog.materials.find((m) => m.code === selection.materialCode);
  return {
    layout: buildLayout(
      selection.bays.map((bay) => ({
        widthUm: bay.widthUm,
        count: bay.count,
        cellTemplate: modules.get(bay.moduleCode)?.cellTemplate ?? [{ kind: "open" as const, heightShare: 1 }],
      })),
      selection.base,
    ),
    finishHex: finish?.swatchHex ?? "#C7CEC6",
    finishName: finish?.name ?? "Unavailable finish",
    materialName: material?.name ?? "",
    bays: selection.bays.map((bay) => {
      const m = modules.get(bay.moduleCode);
      return {
        name: m?.name ?? "Unavailable module",
        widthUm: bay.widthUm,
        countText: m?.countLabel && m.minCount < m.maxCount ? `${m.countLabel.toLowerCase()}: ${bay.count}` : null,
      };
    }),
    handleName: catalog.handles.find((h) => h.sku === selection.handleSku)?.name ?? "No handles",
    accessories: selection.accessories.map((a) => ({
      name: catalog.accessories.find((x) => x.sku === a.sku)?.name ?? a.sku,
      quantity: a.quantity,
    })),
  };
}
