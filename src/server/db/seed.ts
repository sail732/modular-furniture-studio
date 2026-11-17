import { eq } from "drizzle-orm";
import type { Database } from "./client";
import {
  categories,
  compatibilityRules,
  components,
  configurations,
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
} from "./schema";
import { ruleDefinitionSchema } from "@/lib/configuration/types";
import { inchesToUm } from "@/lib/units";
import {
  sampleAccessories,
  sampleCategories,
  sampleHandles,
  sampleMaterials,
  sampleProducts,
  sampleRules,
  sampleSharedComponents,
  toTemplateRow,
} from "./seed-data";
import { moduleBlueprints, moduleCode } from "./seed-modules";

type ComponentInsert = typeof components.$inferInsert;

/** Product-specific parts every sample product gets, keyed by SKU suffix. */
const productParts: { suffix: string; name: string; type: ComponentInsert["type"]; cut: boolean; finish: boolean }[] = [
  { suffix: "TOP", name: "top panel", type: "top_panel", cut: true, finish: true },
  { suffix: "BTM", name: "bottom panel", type: "bottom_panel", cut: true, finish: true },
  { suffix: "SIDE", name: "side panel", type: "side_panel", cut: false, finish: true },
  { suffix: "DIV", name: "vertical divider", type: "divider", cut: false, finish: true },
  { suffix: "BACK", name: "back panel", type: "back_panel", cut: true, finish: false },
  { suffix: "PLINTH", name: "plinth", type: "plinth", cut: true, finish: true },
  { suffix: "SHELF", name: "shelf", type: "shelf", cut: true, finish: true },
  { suffix: "DOOR", name: "door", type: "door", cut: true, finish: true },
  { suffix: "DRW-BOX", name: "drawer box", type: "drawer_box", cut: false, finish: false },
  { suffix: "DRW-FRONT", name: "drawer front", type: "drawer_front", cut: true, finish: true },
];

/**
 * Replace all sample catalog content. Idempotent: rows flagged `is_sample`
 * are removed and re-created; non-sample rows are never touched.
 *
 * Saved configurations reference sample products, so they are cleared too.
 */
export async function seedSampleCatalog(db: Database, now = new Date()) {
  return db.transaction(async (tx) => {
    await tx.delete(configurations);
    await tx.delete(ruleSets);
    await tx.delete(products).where(eq(products.isSample, true));
    await tx.delete(components).where(eq(components.isSample, true));
    await tx.delete(finishes).where(eq(finishes.isSample, true));
    await tx.delete(materials).where(eq(materials.isSample, true));
    await tx.delete(categories).where(eq(categories.isSample, true));

    const categoryRows = await tx
      .insert(categories)
      .values(sampleCategories.map((c, i) => ({ ...c, sortOrder: i, isSample: true })))
      .returning({ id: categories.id, slug: categories.slug });
    const categoryId = new Map(categoryRows.map((c) => [c.slug, c.id]));

    const finishId = new Map<string, string>();
    for (const [mi, material] of sampleMaterials.entries()) {
      const [row] = await tx
        .insert(materials)
        .values({
          code: material.code,
          name: material.name,
          description: material.description,
          sortOrder: mi,
          isSample: true,
        })
        .returning({ id: materials.id });
      const inserted = await tx
        .insert(finishes)
        .values(material.finishes.map((f, fi) => ({ ...f, materialId: row.id, sortOrder: fi, isSample: true })))
        .returning({ id: finishes.id, code: finishes.code });
      for (const f of inserted) finishId.set(f.code, f.id);
    }

    // ---- Components: shared hardware, handles, accessories, then per-product parts
    const componentRows: ComponentInsert[] = [
      ...sampleSharedComponents.map((c) => ({ sku: c.sku, name: c.name, type: c.type })),
      { sku: "HW-HANG-RAIL", name: "Hanging rail", type: "hanging_rail" as const, isCutToSize: true },
      ...sampleHandles.map((h) => ({ sku: h.sku, name: h.name, description: h.description, type: "handle" as const })),
      ...sampleAccessories.map((a) => ({
        sku: a.sku,
        name: a.name,
        description: a.description,
        type: "accessory" as const,
      })),
    ];
    for (const product of sampleProducts) {
      const height = inchesToUm(product.templates[0].heightIn);
      const depth = inchesToUm(product.templates[0].depthIn);
      for (const part of productParts) {
        componentRows.push({
          sku: `${product.prefix}-${part.suffix}`,
          name: `${product.name.split(" ")[0]} ${part.name}`,
          type: part.type,
          depthUm: ["BACK", "DOOR", "DRW-FRONT", "PLINTH"].includes(part.suffix) ? null : depth,
          heightUm: ["SIDE", "DIV"].includes(part.suffix) ? height : null,
          isCutToSize: part.cut,
          takesFinish: part.finish,
        });
      }
    }
    const insertedComponents = await tx
      .insert(components)
      .values(componentRows.map((c) => ({ ...c, isSample: true })))
      .returning({ id: components.id, sku: components.sku });
    const componentId = new Map(insertedComponents.map((c) => [c.sku, c.id]));
    const component = (sku: string) => {
      const id = componentId.get(sku);
      if (!id) throw new Error(`Seed: unknown component ${sku}`);
      return id;
    };

    // ---- Products, modules, templates
    const productId = new Map<string, string>();
    for (const [pi, product] of sampleProducts.entries()) {
      const catId = categoryId.get(product.category);
      if (!catId) throw new Error(`Seed: unknown category ${product.category}`);
      const [row] = await tx
        .insert(products)
        .values({
          categoryId: catId,
          slug: product.slug,
          name: product.name,
          shortDescription: product.shortDescription,
          longDescription: product.longDescription,
          keyFeatures: product.keyFeatures,
          whatsIncluded: product.whatsIncluded,
          whatCanChange: product.whatCanChange,
          assemblyDifficulty: product.assemblyDifficulty,
          assemblyMinutes: product.assemblyMinutes,
          status: "published",
          isFeatured: product.featuredRank !== undefined,
          featuredRank: product.featuredRank ?? 0,
          isSample: true,
          // Stagger so "newest" sorting is deterministic.
          publishedAt: new Date(now.getTime() - pi * 86_400_000),
        })
        .returning({ id: products.id });
      productId.set(product.slug, row.id);
      const P = product.prefix;

      // Carcass recipe
      await tx.insert(productComponents).values([
        { productId: row.id, componentId: component(`${P}-TOP`), cutTo: "overall_width" },
        { productId: row.id, componentId: component(`${P}-BTM`), cutTo: "overall_width" },
        { productId: row.id, componentId: component(`${P}-SIDE`), quantity: 2 },
        { productId: row.id, componentId: component(`${P}-DIV`), quantityRule: "per_divider" },
        { productId: row.id, componentId: component(`${P}-BACK`), quantityRule: "per_bay", cutTo: "bay_width" },
        { productId: row.id, componentId: component(`${P}-PLINTH`), cutTo: "overall_width", whenBase: "plinth" },
        { productId: row.id, componentId: component("LEG-150"), quantity: 4, whenBase: "legs" },
        { productId: row.id, componentId: component("HW-PACK-CARCASS") },
        { productId: row.id, componentId: component("HW-PACK-BAY"), quantityRule: "per_bay" },
      ]);

      const accessories = sampleAccessories.filter((a) => product.accessories.includes(a.sku));
      if (accessories.length > 0) {
        await tx.insert(productAccessories).values(
          accessories.map((a) => ({ productId: row.id, componentId: component(a.sku), maxQuantity: a.maxQuantity })),
        );
      }

      // Modules
      const moduleId = new Map<string, string>();
      for (const [mi, m] of product.modules.entries()) {
        const blueprint = moduleBlueprints[m.type];
        const [moduleRow] = await tx
          .insert(modules)
          .values({
            productId: row.id,
            code: moduleCode(P, m.type),
            name: blueprint.name,
            description: blueprint.description,
            type: m.type,
            countLabel: m.count[0] === m.count[1] ? null : blueprint.countLabel,
            minCount: m.count[0],
            maxCount: m.count[1],
            defaultCount: m.count[2],
            cellTemplate: blueprint.cellTemplate,
            handlesFixed: blueprint.handles.fixed,
            handlesPerCount: blueprint.handles.perCount,
            sortOrder: mi,
          })
          .returning({ id: modules.id });
        moduleId.set(m.type, moduleRow.id);
        await tx
          .insert(moduleWidths)
          .values(m.widthsIn.map((w) => ({ moduleId: moduleRow.id, widthUm: inchesToUm(w) })));
        if (blueprint.recipe.length > 0) {
          await tx.insert(moduleComponents).values(
            blueprint.recipe.map((r) => ({
              moduleId: moduleRow.id,
              componentId: component(r.part.startsWith("HW-") ? r.part : `${P}-${r.part}`),
              quantityFixed: r.fixed,
              quantityPerCount: r.perCount,
              cutTo: r.cutTo,
            })),
          );
        }
      }

      // Templates and their starting arrangement
      for (const [ti, t] of product.templates.entries()) {
        const [templateRow] = await tx
          .insert(designTemplates)
          .values({ ...toTemplateRow(t, product), productId: row.id, sortOrder: ti, status: "published" })
          .returning({ id: designTemplates.id });
        await tx.insert(templateBays).values(
          t.bays.map(([type, widthIn, count], position) => {
            const id = moduleId.get(type);
            if (!id) throw new Error(`Seed: ${t.code} uses module ${type} that ${product.slug} does not offer`);
            return { templateId: templateRow.id, position, moduleId: id, widthUm: inchesToUm(widthIn), count };
          }),
        );
      }

      await tx.insert(productFinishes).values(
        product.finishes.map((code, i) => {
          const id = finishId.get(code);
          if (!id) throw new Error(`Seed: unknown finish ${code}`);
          return { productId: row.id, finishId: id, isDefault: i === 0 };
        }),
      );
    }

    // ---- Rules
    const [ruleSet] = await tx
      .insert(ruleSets)
      .values({ version: 1, status: "published", notes: "Sample rule set", publishedAt: now })
      .returning({ id: ruleSets.id });
    await tx.insert(compatibilityRules).values(
      sampleRules.map((r) => {
        const pid = r.productSlug ? productId.get(r.productSlug) : null;
        if (r.productSlug && !pid) throw new Error(`Seed: rule ${r.code} references unknown product`);
        return {
          ruleSetId: ruleSet.id,
          code: r.code,
          productId: pid ?? null,
          definition: ruleDefinitionSchema.parse(r.definition),
          message: r.message,
          path: r.path,
        };
      }),
    );

    return {
      categories: sampleCategories.length,
      materials: sampleMaterials.length,
      finishes: finishId.size,
      products: sampleProducts.length,
      templates: sampleProducts.reduce((n, p) => n + p.templates.length, 0),
      modules: sampleProducts.reduce((n, p) => n + p.modules.length, 0),
      components: componentRows.length,
      rules: sampleRules.length,
    };
  });
}
