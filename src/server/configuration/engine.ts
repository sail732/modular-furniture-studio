import { formatLength } from "@/lib/units";
import { isAllowedWidth, nearestAllowedWidths, allowedWidths } from "@/lib/width-options";
import type {
  BaySelection,
  CatalogModule,
  CatalogTemplate,
  Condition,
  ConfiguratorCatalog,
  Issue,
  Rule,
  Selection,
  ValidationResult,
} from "@/lib/configuration/types";
import { baseLabels } from "@/lib/configuration/types";
import { defaultSelection, overallWidth } from "@/lib/configuration/selection";

export { defaultSelection, overallWidth };

/**
 * The configuration engine: pure functions over plain data.
 *
 * No database, no framework, no rendering. The server calls these before a
 * configuration is saved, added to a cart or ordered; the browser never
 * decides validity. Values are never clamped: an invalid selection produces
 * issues that say what is allowed.
 */

const inches = (um: number) => formatLength(um);
const list = (values: number[]) => values.map(inches).join(", ");

function holds(condition: Condition, selection: Selection, modules: Map<string, CatalogModule>): boolean {
  if ("base" in condition) return selection.base === condition.base;
  if ("moduleType" in condition) {
    return selection.bays.some((b) => modules.get(b.moduleCode)?.type === condition.moduleType);
  }
  if ("accessory" in condition) return selection.accessories.some((a) => a.sku === condition.accessory);
  if ("handle" in condition) return selection.handleSku === condition.handle;
  if ("material" in condition) return selection.materialCode === condition.material;
  if ("finish" in condition) return selection.finishCode === condition.finish;
  return overallWidth(selection.bays) > condition.widthOverUm;
}

export function validateSelection(
  catalog: ConfiguratorCatalog,
  rules: Rule[],
  selection: Selection,
): ValidationResult {
  const issues: Issue[] = [];
  const width = overallWidth(selection.bays);
  const result = (template: CatalogTemplate | null): ValidationResult => ({
    valid: issues.length === 0,
    issues,
    overallWidthUm: width,
    heightUm: template?.heightUm ?? null,
    depthUm: template?.depthUm ?? null,
    ruleSetVersion: catalog.ruleSetVersion,
    templateVersion: template?.version ?? null,
  });

  if (selection.productSlug !== catalog.product.slug) {
    issues.push({ code: "PRODUCT_MISMATCH", path: "productSlug", message: "This configuration belongs to a different product." });
    return result(null);
  }
  const template = catalog.templates.find((t) => t.code === selection.templateCode);
  if (!template) {
    issues.push({
      code: "TEMPLATE_NOT_AVAILABLE",
      path: "templateCode",
      message: "This starting design is no longer available. Choose one of the current designs.",
      allowed: catalog.templates.map((t) => t.code),
    });
    return result(null);
  }

  // ---- Fixed dimensions: height and depth cannot be changed
  if (selection.heightUm !== undefined && selection.heightUm !== template.heightUm) {
    issues.push({
      code: "DIMENSION_FIXED",
      path: "dimensions.height",
      message: `Height is fixed at ${inches(template.heightUm)} for this design and cannot be changed. For a different height, choose another design.`,
      allowed: [template.heightUm],
    });
  }
  if (selection.depthUm !== undefined && selection.depthUm !== template.depthUm) {
    issues.push({
      code: "DIMENSION_FIXED",
      path: "dimensions.depth",
      message: `Depth is fixed at ${inches(template.depthUm)} for this design and cannot be changed. For a different depth, choose another design.`,
      allowed: [template.depthUm],
    });
  }

  // ---- Bays
  const modules = new Map(catalog.modules.map((m) => [m.code, m]));
  if (selection.bays.length < template.minBays || selection.bays.length > template.maxBays) {
    const range =
      template.minBays === template.maxBays
        ? `exactly ${template.minBays}`
        : `between ${template.minBays} and ${template.maxBays}`;
    issues.push({
      code: "BAY_COUNT_OUT_OF_RANGE",
      path: "bays",
      message: `This design takes ${range} ${template.maxBays === 1 ? "bay" : "bays"}. It has ${selection.bays.length}.`,
    });
  }
  selection.bays.forEach((bay, i) => {
    const m = modules.get(bay.moduleCode);
    if (!m) {
      issues.push({
        code: "MODULE_NOT_AVAILABLE",
        path: `bays.${i}.moduleCode`,
        message: `Bay ${i + 1} uses a module that is not available for this piece.`,
        allowed: catalog.modules.map((x) => x.code),
      });
      return;
    }
    if (!m.widthsUm.includes(bay.widthUm)) {
      issues.push({
        code: "MODULE_WIDTH_NOT_AVAILABLE",
        path: `bays.${i}.widthUm`,
        message: `${m.name} is not made ${inches(bay.widthUm)} wide. It comes in ${list(m.widthsUm)}.`,
        allowed: m.widthsUm,
        nearest: nearestIn(m.widthsUm, bay.widthUm),
      });
    }
    if (bay.count < m.minCount || bay.count > m.maxCount) {
      const label = (m.countLabel ?? "Units").toLowerCase();
      issues.push({
        code: "MODULE_COUNT_OUT_OF_RANGE",
        path: `bays.${i}.count`,
        message:
          m.minCount === m.maxCount
            ? `${m.name} has a fixed layout and cannot take ${bay.count} ${label}.`
            : `${m.name} takes ${m.minCount} to ${m.maxCount} ${label}. Bay ${i + 1} has ${bay.count}.`,
      });
    }
  });

  // ---- Overall width: only the widths this design is made in
  if (!isAllowedWidth(template, width)) {
    const nearest = nearestAllowedWidths(template, width);
    const outside = width < template.minWidthUm || width > template.maxWidthUm;
    issues.push({
      code: outside ? "WIDTH_OUT_OF_RANGE" : "WIDTH_OFF_STEP",
      path: "dimensions.width",
      message: outside
        ? `The bays add up to ${inches(width)}, but this design is made from ${inches(template.minWidthUm)} to ${inches(template.maxWidthUm)} wide. The closest available width is ${list(nearest)}.`
        : `The bays add up to ${inches(width)}, which is between sizes. This design is made in ${inches(template.widthIncrementUm)} steps; the closest widths are ${list(nearest)}.`,
      allowed: allowedWidths(template),
      nearest,
    });
  }

  // ---- Material and finish
  const material = catalog.materials.find((m) => m.code === selection.materialCode);
  const finishMaterial = catalog.materials.find((m) => m.finishes.some((f) => f.code === selection.finishCode));
  if (!material) {
    issues.push({
      code: "MATERIAL_NOT_AVAILABLE",
      path: "materialCode",
      message: "This material is not available for this piece.",
      allowed: catalog.materials.map((m) => m.code),
    });
  }
  if (!finishMaterial || !catalog.finishCodes.includes(selection.finishCode)) {
    issues.push({
      code: "FINISH_NOT_AVAILABLE",
      path: "finishCode",
      message: "This finish is not available for this piece. Choose one of the finishes listed.",
      allowed: catalog.finishCodes,
    });
  } else if (material && finishMaterial.code !== material.code) {
    const finish = finishMaterial.finishes.find((f) => f.code === selection.finishCode)!;
    issues.push({
      code: "FINISH_MATERIAL_MISMATCH",
      path: "finishCode",
      message: `${finish.name} is a ${finishMaterial.name.toLowerCase()} finish and cannot be applied to ${material.name.toLowerCase()}. For ${material.name.toLowerCase()}, choose ${material.finishes.map((f) => f.name).join(" or ")}.`,
      allowed: material.finishes.map((f) => f.code),
    });
  }

  // ---- Base, handles, accessories
  if (!template.allowedBases.includes(selection.base)) {
    issues.push({
      code: "BASE_NOT_AVAILABLE",
      path: "base",
      message: `This design is not available as "${baseLabels[selection.base].toLowerCase()}". Available: ${template.allowedBases.map((b) => baseLabels[b].toLowerCase()).join(", ")}.`,
      allowed: template.allowedBases,
    });
  }
  if (selection.handleSku !== null && !catalog.handles.some((h) => h.sku === selection.handleSku)) {
    issues.push({
      code: "HANDLE_NOT_AVAILABLE",
      path: "handleSku",
      message: "This handle is not available. Choose one of the handles listed, or no handles.",
      allowed: catalog.handles.map((h) => h.sku),
    });
  }
  const seen = new Set<string>();
  selection.accessories.forEach((a, i) => {
    const option = catalog.accessories.find((x) => x.sku === a.sku);
    if (!option) {
      issues.push({
        code: "ACCESSORY_NOT_AVAILABLE",
        path: `accessories.${i}`,
        message: "This accessory is not available for this piece.",
        allowed: catalog.accessories.map((x) => x.sku),
      });
    } else if (seen.has(a.sku)) {
      issues.push({ code: "ACCESSORY_DUPLICATED", path: `accessories.${i}`, message: `${option.name} is listed twice.` });
    } else if (a.quantity > option.maxQuantity) {
      issues.push({
        code: "ACCESSORY_QUANTITY_TOO_HIGH",
        path: `accessories.${i}`,
        message: `You can add at most ${option.maxQuantity} of ${option.name}.`,
      });
    }
    seen.add(a.sku);
  });

  // ---- Compatibility rules (data)
  for (const rule of rules) {
    if (rule.productSlug !== null && rule.productSlug !== catalog.product.slug) continue;
    const d = rule.definition;
    let broken = false;
    if (d.kind === "excludes") broken = holds(d.when, selection, modules) && holds(d.forbid, selection, modules);
    else if (d.kind === "requires") broken = holds(d.when, selection, modules) && !holds(d.require, selection, modules);
    else {
      const n = selection.bays.filter((b) => modules.get(b.moduleCode)?.type === d.moduleType).length;
      broken = (d.min !== undefined && n < d.min) || (d.max !== undefined && n > d.max);
    }
    if (broken) issues.push({ code: `RULE_${rule.code}`, path: rule.path, message: rule.message });
  }

  return result(template);
}

function nearestIn(sorted: number[], value: number): number[] {
  const below = sorted.filter((w) => w < value).at(-1);
  const above = sorted.find((w) => w > value);
  return [below, above].filter((w): w is number => w !== undefined);
}

/**
 * Change a layout's overall width to `targetUm` by stepping individual bays to
 * the next size their module is made in. Deterministic: widening grows the
 * narrowest bay first (leftmost on a tie); narrowing shrinks the widest
 * (rightmost on a tie). Returns issues, and leaves the bays untouched, when the
 * target is not an allowed width or cannot be reached with this arrangement.
 */
export function fitBaysToWidth(
  catalog: ConfiguratorCatalog,
  templateCode: string,
  bays: BaySelection[],
  targetUm: number,
): { ok: true; bays: BaySelection[] } | { ok: false; issues: Issue[] } {
  const template = catalog.templates.find((t) => t.code === templateCode);
  if (!template) {
    return { ok: false, issues: [{ code: "TEMPLATE_NOT_AVAILABLE", path: "templateCode", message: "This starting design is no longer available." }] };
  }
  if (!isAllowedWidth(template, targetUm)) {
    const nearest = nearestAllowedWidths(template, targetUm);
    return {
      ok: false,
      issues: [
        {
          code: "WIDTH_NOT_ALLOWED",
          path: "dimensions.width",
          message: `${inches(targetUm)} is not a width this design is made in. It is made from ${inches(template.minWidthUm)} to ${inches(template.maxWidthUm)} in ${inches(template.widthIncrementUm)} steps; the closest is ${list(nearest)}.`,
          allowed: allowedWidths(template),
          nearest,
        },
      ],
    };
  }
  const modules = new Map(catalog.modules.map((m) => [m.code, m]));
  const next = bays.map((b) => ({ ...b }));
  let diff = targetUm - overallWidth(next);
  for (let guard = 0; diff !== 0 && guard < 500; guard++) {
    let best: { index: number; width: number } | null = null;
    next.forEach((bay, index) => {
      const widths = modules.get(bay.moduleCode)?.widthsUm ?? [];
      const candidate = diff > 0 ? widths.find((w) => w > bay.widthUm) : widths.filter((w) => w < bay.widthUm).at(-1);
      if (candidate === undefined || Math.abs(candidate - bay.widthUm) > Math.abs(diff)) return;
      const better =
        best === null ||
        (diff > 0 ? bay.widthUm < next[best.index].widthUm : bay.widthUm >= next[best.index].widthUm);
      if (better) best = { index, width: candidate };
    });
    if (best === null) break;
    const chosen: { index: number; width: number } = best;
    next[chosen.index].widthUm = chosen.width;
    diff = targetUm - overallWidth(next);
  }
  if (diff !== 0) {
    return {
      ok: false,
      issues: [
        {
          code: "WIDTH_NOT_REACHABLE",
          path: "dimensions.width",
          message: `This arrangement of bays cannot be made ${inches(targetUm)} wide. ${diff > 0 ? "Add a bay or use wider modules" : "Remove a bay or use narrower modules"}, then choose the width again.`,
        },
      ],
    };
  }
  return { ok: true, bays: next };
}
