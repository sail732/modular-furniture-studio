import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import {
  categories,
  compatibilityRules,
  components,
  designTemplates,
  finishes,
  materials,
  moduleComponents,
  moduleWidths,
  modules,
  productAccessories,
  productComponents,
  productFinishes,
  products,
  ruleSets,
  templateBays,
} from "@/server/db/schema";
import type { BaseKind, ConfiguratorCatalog, Rule } from "@/lib/configuration/types";

/** A component as the engine needs it. Deliberately has no cost or manufacturing fields. */
export interface PartRef {
  id: string;
  sku: string;
  revision: number;
  name: string;
  takesFinish: boolean;
}

/** Server-only data used to resolve a selection into components. Never sent to the browser. */
export interface EngineInternals {
  productId: string;
  templateIds: Map<string, string>;
  carcass: {
    part: PartRef;
    quantity: number;
    quantityRule: "fixed" | "per_bay" | "per_divider";
    cutTo: "none" | "overall_width" | "bay_width";
    whenBase: BaseKind | null;
  }[];
  moduleRecipes: Map<
    string,
    {
      handlesFixed: number;
      handlesPerCount: number;
      parts: { part: PartRef; fixed: number; perCount: number; cutTo: "none" | "bay_width" | "half_bay_width" }[];
    }
  >;
  optionParts: Map<string, PartRef>;
}

export interface EngineCatalog {
  /** Browser-safe catalog for the configurator UI. */
  catalog: ConfiguratorCatalog;
  rules: Rule[];
  internals: EngineInternals;
}

const partColumns = {
  id: components.id,
  sku: components.sku,
  revision: components.revision,
  name: components.name,
  takesFinish: components.takesFinish,
};

/**
 * Load everything needed to configure one product: published templates with
 * their starting arrangement, active modules, options, and the current
 * published rule set. Returns null when the product cannot be configured.
 */
export async function loadEngineCatalog(db: Database, productSlug: string): Promise<EngineCatalog | null> {
  const [product] = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      isSample: products.isSample,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, productSlug), eq(products.status, "published"), eq(categories.isVisible, true)))
    .limit(1);
  if (!product) return null;

  const [templateRows, moduleRows, carcassRows, accessoryRows, handleRows, finishRows, ruleSetRows] =
    await Promise.all([
      db
        .select()
        .from(designTemplates)
        .where(and(eq(designTemplates.productId, product.id), eq(designTemplates.status, "published")))
        .orderBy(asc(designTemplates.sortOrder), asc(designTemplates.code)),
      db
        .select()
        .from(modules)
        .where(and(eq(modules.productId, product.id), eq(modules.isActive, true)))
        .orderBy(asc(modules.sortOrder), asc(modules.code)),
      db
        .select({
          ...partColumns,
          quantity: productComponents.quantity,
          quantityRule: productComponents.quantityRule,
          cutTo: productComponents.cutTo,
          whenBase: productComponents.whenBase,
        })
        .from(productComponents)
        .innerJoin(components, eq(components.id, productComponents.componentId))
        .where(eq(productComponents.productId, product.id))
        .orderBy(asc(components.sku)),
      db
        .select({ ...partColumns, description: components.description, maxQuantity: productAccessories.maxQuantity })
        .from(productAccessories)
        .innerJoin(components, eq(components.id, productAccessories.componentId))
        .where(and(eq(productAccessories.productId, product.id), eq(components.isActive, true)))
        .orderBy(asc(components.name)),
      db
        .select({ ...partColumns, description: components.description })
        .from(components)
        .where(and(eq(components.type, "handle"), eq(components.isActive, true)))
        .orderBy(asc(components.name)),
      db
        .select({
          isDefault: productFinishes.isDefault,
          code: finishes.code,
          name: finishes.name,
          swatchHex: finishes.swatchHex,
          materialCode: materials.code,
          materialName: materials.name,
        })
        .from(productFinishes)
        .innerJoin(finishes, eq(finishes.id, productFinishes.finishId))
        .innerJoin(materials, eq(materials.id, finishes.materialId))
        .where(and(eq(productFinishes.productId, product.id), eq(finishes.isActive, true), eq(materials.isActive, true)))
        .orderBy(asc(materials.sortOrder), asc(finishes.sortOrder)),
      db
        .select({ id: ruleSets.id, version: ruleSets.version })
        .from(ruleSets)
        .where(eq(ruleSets.status, "published"))
        .orderBy(desc(ruleSets.version))
        .limit(1),
    ]);
  if (templateRows.length === 0 || moduleRows.length === 0 || finishRows.length === 0) return null;

  const moduleIds = moduleRows.map((m) => m.id);
  const ruleSet = ruleSetRows[0];
  const [widthRows, recipeRows, bayRows, ruleRows] = await Promise.all([
    db.select().from(moduleWidths).where(inArray(moduleWidths.moduleId, moduleIds)).orderBy(asc(moduleWidths.widthUm)),
    db
      .select({
        ...partColumns,
        moduleId: moduleComponents.moduleId,
        fixed: moduleComponents.quantityFixed,
        perCount: moduleComponents.quantityPerCount,
        cutTo: moduleComponents.cutTo,
      })
      .from(moduleComponents)
      .innerJoin(components, eq(components.id, moduleComponents.componentId))
      .where(inArray(moduleComponents.moduleId, moduleIds))
      .orderBy(asc(components.sku)),
    db
      .select()
      .from(templateBays)
      .where(
        inArray(
          templateBays.templateId,
          templateRows.map((t) => t.id),
        ),
      )
      .orderBy(asc(templateBays.templateId), asc(templateBays.position)),
    ruleSet
      ? db
          .select()
          .from(compatibilityRules)
          .where(
            and(
              eq(compatibilityRules.ruleSetId, ruleSet.id),
              eq(compatibilityRules.isActive, true),
              or(isNull(compatibilityRules.productId), eq(compatibilityRules.productId, product.id)),
            ),
          )
          .orderBy(asc(compatibilityRules.code))
      : Promise.resolve([]),
  ]);

  const moduleCodeById = new Map(moduleRows.map((m) => [m.id, m.code]));
  const widthsByModule = Map.groupBy(widthRows, (w) => w.moduleId);
  const baysByTemplate = Map.groupBy(bayRows, (b) => b.templateId);

  const materialsMap = new Map<string, ConfiguratorCatalog["materials"][number]>();
  for (const f of finishRows) {
    const entry = materialsMap.get(f.materialCode) ?? { code: f.materialCode, name: f.materialName, finishes: [] };
    entry.finishes.push({ code: f.code, name: f.name, swatchHex: f.swatchHex });
    materialsMap.set(f.materialCode, entry);
  }

  const templates = templateRows.flatMap((t) => {
    const bays = (baysByTemplate.get(t.id) ?? []).flatMap((b) => {
      const code = moduleCodeById.get(b.moduleId);
      return code ? [{ moduleCode: code, widthUm: b.widthUm, count: b.count }] : [];
    });
    if (bays.length === 0) return [];
    return [
      {
        code: t.code,
        version: t.version,
        name: t.name,
        description: t.description,
        basePriceCents: t.basePriceCents,
        currency: t.currency,
        heightUm: t.defaultHeightUm,
        depthUm: t.defaultDepthUm,
        minWidthUm: t.minWidthUm,
        maxWidthUm: t.maxWidthUm,
        widthIncrementUm: t.widthIncrementUm,
        minBays: t.minBays,
        maxBays: t.maxBays,
        defaultBase: t.defaultBase,
        allowedBases: t.allowedBases,
        defaultBays: bays,
        defaultAccessories: t.defaultAccessories,
      },
    ];
  });
  if (templates.length === 0) return null;

  const catalog: ConfiguratorCatalog = {
    product: { slug: product.slug, name: product.name, categoryName: product.categoryName, isSample: product.isSample },
    templates,
    modules: moduleRows.map((m) => ({
      code: m.code,
      name: m.name,
      description: m.description,
      type: m.type,
      widthsUm: (widthsByModule.get(m.id) ?? []).map((w) => w.widthUm),
      countLabel: m.countLabel,
      minCount: m.minCount,
      maxCount: m.maxCount,
      defaultCount: m.defaultCount,
      cellTemplate: m.cellTemplate,
    })),
    materials: [...materialsMap.values()],
    finishCodes: finishRows.map((f) => f.code),
    defaultFinishCode: (finishRows.find((f) => f.isDefault) ?? finishRows[0]).code,
    handles: handleRows.map((h) => ({ sku: h.sku, name: h.name, description: h.description })),
    accessories: accessoryRows.map((a) => ({
      sku: a.sku,
      name: a.name,
      description: a.description,
      maxQuantity: a.maxQuantity,
    })),
    ruleSetVersion: ruleSet?.version ?? 0,
  };

  const toPart = (r: PartRef): PartRef => ({
    id: r.id,
    sku: r.sku,
    revision: r.revision,
    name: r.name,
    takesFinish: r.takesFinish,
  });
  const recipesByModule = Map.groupBy(recipeRows, (r) => r.moduleId);

  return {
    catalog,
    rules: ruleRows.map((r) => ({
      code: r.code,
      productSlug: r.productId ? product.slug : null,
      definition: r.definition,
      message: r.message,
      path: r.path,
    })),
    internals: {
      productId: product.id,
      templateIds: new Map(templateRows.map((t) => [t.code, t.id])),
      carcass: carcassRows.map((c) => ({
        part: toPart(c),
        quantity: c.quantity,
        quantityRule: c.quantityRule,
        cutTo: c.cutTo,
        whenBase: c.whenBase,
      })),
      moduleRecipes: new Map(
        moduleRows.map((m) => [
          m.code,
          {
            handlesFixed: m.handlesFixed,
            handlesPerCount: m.handlesPerCount,
            parts: (recipesByModule.get(m.id) ?? []).map((r) => ({
              part: toPart(r),
              fixed: r.fixed,
              perCount: r.perCount,
              cutTo: r.cutTo,
            })),
          },
        ]),
      ),
      optionParts: new Map([...handleRows, ...accessoryRows].map((p) => [p.sku, toPart(p)])),
    },
  };
}
