import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { categories, designTemplates, finishes, materials, productFinishes, products } from "./schema";
import { elevationLayoutSchema } from "@/lib/elevation-layout";
import { sampleCategories, sampleMaterials, sampleProducts, toTemplateRow } from "./seed-data";

/**
 * Replace all sample catalog content. Idempotent: rows flagged `is_sample`
 * are removed and re-created; non-sample rows are never touched.
 */
export async function seedSampleCatalog(db: Database, now = new Date()) {
  return db.transaction(async (tx) => {
    await tx.delete(products).where(eq(products.isSample, true));
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

    for (const product of sampleProducts) {
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
          publishedAt: new Date(now.getTime() - sampleProducts.indexOf(product) * 86_400_000),
        })
        .returning({ id: products.id });

      await tx.insert(designTemplates).values(
        product.templates.map((t, i) => ({
          ...toTemplateRow(t),
          previewLayout: elevationLayoutSchema.parse(t.previewLayout),
          productId: row.id,
          sortOrder: i,
          status: "published" as const,
        })),
      );

      await tx.insert(productFinishes).values(
        product.finishes.map((code, i) => {
          const id = finishId.get(code);
          if (!id) throw new Error(`Seed: unknown finish ${code}`);
          return { productId: row.id, finishId: id, isDefault: i === 0 };
        }),
      );
    }

    return {
      categories: sampleCategories.length,
      materials: sampleMaterials.length,
      finishes: finishId.size,
      products: sampleProducts.length,
      templates: sampleProducts.reduce((n, p) => n + p.templates.length, 0),
    };
  });
}
