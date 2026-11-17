import type { BaySelection, CatalogModule, ConfiguratorCatalog, Selection } from "./types";

/** Pure helpers shared by the server engine and the configurator UI. */

export function overallWidth(bays: { widthUm: number }[]): number {
  return bays.reduce((n, b) => n + b.widthUm, 0);
}

/** The selection a template starts from. */
export function defaultSelection(catalog: ConfiguratorCatalog, templateCode: string, finishCode?: string): Selection {
  const template = catalog.templates.find((t) => t.code === templateCode) ?? catalog.templates[0];
  const finish = catalog.finishCodes.includes(finishCode ?? "") ? finishCode! : catalog.defaultFinishCode;
  const material = catalog.materials.find((m) => m.finishes.some((f) => f.code === finish))!;
  return {
    productSlug: catalog.product.slug,
    templateCode: template.code,
    bays: template.defaultBays.map((b) => ({ ...b })),
    materialCode: material.code,
    finishCode: finish,
    base: template.defaultBase,
    handleSku: catalog.handles[0]?.sku ?? null,
    accessories: template.defaultAccessories.map((a) => ({ ...a })),
  };
}

/** A new bay of the given module at a sensible starting size. Convenience only; the server validates the result. */
export function newBay(module: CatalogModule, preferredWidthUm?: number): BaySelection {
  const width =
    preferredWidthUm !== undefined && module.widthsUm.includes(preferredWidthUm)
      ? preferredWidthUm
      : closest(module.widthsUm, preferredWidthUm ?? module.widthsUm[0]);
  return { moduleCode: module.code, widthUm: width, count: module.defaultCount };
}

function closest(values: number[], target: number): number {
  return values.reduce((best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best), values[0]);
}
