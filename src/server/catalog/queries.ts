import { and, asc, desc, eq, exists, gte, ilike, inArray, isNotNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import {
  categories,
  designTemplates,
  finishes,
  materials,
  modules,
  productFinishes,
  products,
  templateBays,
} from "@/server/db/schema";
import { buildLayout } from "@/lib/configuration/layout";
import type { ElevationLayout } from "@/lib/elevation-layout";
import type { ListingFilters } from "./filters";

export interface FinishSummary {
  code: string;
  name: string;
  swatchHex: string;
  materialCode: string;
  materialName: string;
  isDefault: boolean;
}

export interface TemplateSummary {
  code: string;
  name: string;
  description: string;
  basePriceCents: number;
  currency: string;
  widthUm: number;
  heightUm: number;
  depthUm: number;
  minWidthUm: number;
  maxWidthUm: number;
  widthIncrementUm: number;
  layout: ElevationLayout;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: { slug: string; name: string };
  startingPriceCents: number;
  currency: string;
  minWidthUm: number;
  maxWidthUm: number;
  templateCount: number;
  primaryTemplate: TemplateSummary;
  finishes: FinishSummary[];
  isSample: boolean;
}

export interface ProductDetail extends ProductSummary {
  longDescription: string;
  keyFeatures: string[];
  whatsIncluded: string[];
  whatCanChange: string[];
  assemblyDifficulty: "easy" | "moderate" | "advanced" | null;
  assemblyMinutes: number | null;
  leadTimeNote: string | null;
  templates: TemplateSummary[];
}

export interface CategorySummary {
  slug: string;
  name: string;
  description: string;
  productCount: number;
}

/** Escape LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

// Correlated aggregates over a product's published templates.
const publishedTemplateAgg = (expr: SQL) =>
  sql<number>`(select ${expr} from ${designTemplates} where ${designTemplates.productId} = ${products.id} and ${designTemplates.status} = 'published')`.mapWith(
    Number,
  );
const startingPrice = publishedTemplateAgg(sql`min(${designTemplates.basePriceCents})`);
const minWidth = publishedTemplateAgg(sql`min(${designTemplates.minWidthUm})`);
const maxWidth = publishedTemplateAgg(sql`max(${designTemplates.maxWidthUm})`);
const templateCount = publishedTemplateAgg(sql`count(*)`);

function listingConditions(db: Database, f: Partial<ListingFilters>): SQL[] {
  const where: SQL[] = [
    eq(products.status, "published"),
    eq(categories.isVisible, true),
    sql`${templateCount} > 0`,
  ];
  if (f.categorySlug) where.push(eq(categories.slug, f.categorySlug));
  if (f.q) {
    const pattern = `%${escapeLike(f.q)}%`;
    where.push(
      or(
        ilike(products.name, pattern),
        ilike(products.shortDescription, pattern),
        ilike(products.longDescription, pattern),
        ilike(categories.name, pattern),
      )!,
    );
  }
  if (f.materialCodes?.length) {
    where.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(productFinishes)
          .innerJoin(finishes, eq(finishes.id, productFinishes.finishId))
          .innerJoin(materials, eq(materials.id, finishes.materialId))
          .where(and(eq(productFinishes.productId, products.id), inArray(materials.code, f.materialCodes))),
      ),
    );
  }
  if (f.finishCodes?.length) {
    where.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(productFinishes)
          .innerJoin(finishes, eq(finishes.id, productFinishes.finishId))
          .where(and(eq(productFinishes.productId, products.id), inArray(finishes.code, f.finishCodes))),
      ),
    );
  }
  if (f.price?.minCents != null) where.push(sql`${startingPrice} >= ${f.price.minCents}`);
  if (f.price?.maxCents != null) where.push(sql`${startingPrice} <= ${f.price.maxCents}`);
  if (f.width) {
    // A product matches when any published design can be made at a width inside the band.
    const overlap: SQL[] = [
      eq(designTemplates.productId, products.id),
      eq(designTemplates.status, "published"),
    ];
    if (f.width.minUm != null) overlap.push(gte(designTemplates.maxWidthUm, f.width.minUm));
    if (f.width.maxUm != null) overlap.push(lte(designTemplates.minWidthUm, f.width.maxUm));
    where.push(exists(db.select({ one: sql`1` }).from(designTemplates).where(and(...overlap))));
  }
  return where;
}

function orderBy(sort: ListingFilters["sort"] | undefined): SQL[] {
  switch (sort) {
    case "price-asc":
      return [asc(startingPrice), asc(products.name)];
    case "price-desc":
      return [desc(startingPrice), asc(products.name)];
    case "newest":
      return [sql`${products.publishedAt} desc nulls last`, asc(products.name)];
    default:
      return [desc(products.isFeatured), asc(products.featuredRank), asc(products.name)];
  }
}

const productColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  shortDescription: products.shortDescription,
  longDescription: products.longDescription,
  keyFeatures: products.keyFeatures,
  whatsIncluded: products.whatsIncluded,
  whatCanChange: products.whatCanChange,
  assemblyDifficulty: products.assemblyDifficulty,
  assemblyMinutes: products.assemblyMinutes,
  leadTimeNote: products.leadTimeNote,
  isSample: products.isSample,
  categorySlug: categories.slug,
  categoryName: categories.name,
  startingPriceCents: startingPrice,
  minWidthUm: minWidth,
  maxWidthUm: maxWidth,
  templateCount,
};

async function loadTemplates(db: Database, productIds: string[]) {
  const byProduct = new Map<string, TemplateSummary[]>();
  if (productIds.length === 0) return byProduct;
  const rows = await db
    .select()
    .from(designTemplates)
    .where(and(inArray(designTemplates.productId, productIds), eq(designTemplates.status, "published")))
    .orderBy(asc(designTemplates.sortOrder), asc(designTemplates.code));
  if (rows.length === 0) return byProduct;
  // The 2D illustration is derived from each template's starting arrangement of modules.
  const bayRows = await db
    .select({
      templateId: templateBays.templateId,
      widthUm: templateBays.widthUm,
      count: templateBays.count,
      cellTemplate: modules.cellTemplate,
    })
    .from(templateBays)
    .innerJoin(modules, eq(modules.id, templateBays.moduleId))
    .where(
      inArray(
        templateBays.templateId,
        rows.map((t) => t.id),
      ),
    )
    .orderBy(asc(templateBays.templateId), asc(templateBays.position));
  const baysByTemplate = Map.groupBy(bayRows, (b) => b.templateId);

  for (const t of rows) {
    const bays = baysByTemplate.get(t.id) ?? [];
    // A template with no arrangement cannot be shown or configured.
    if (bays.length === 0) continue;
    const list = byProduct.get(t.productId) ?? [];
    list.push({
      code: t.code,
      name: t.name,
      description: t.description,
      basePriceCents: t.basePriceCents,
      currency: t.currency,
      widthUm: t.defaultWidthUm,
      heightUm: t.defaultHeightUm,
      depthUm: t.defaultDepthUm,
      minWidthUm: t.minWidthUm,
      maxWidthUm: t.maxWidthUm,
      widthIncrementUm: t.widthIncrementUm,
      layout: buildLayout(bays, t.defaultBase),
    });
    byProduct.set(t.productId, list);
  }
  return byProduct;
}

async function loadFinishes(db: Database, productIds: string[]) {
  const byProduct = new Map<string, FinishSummary[]>();
  if (productIds.length === 0) return byProduct;
  const rows = await db
    .select({
      productId: productFinishes.productId,
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
    .where(
      and(inArray(productFinishes.productId, productIds), eq(finishes.isActive, true), eq(materials.isActive, true)),
    )
    .orderBy(desc(productFinishes.isDefault), asc(materials.sortOrder), asc(finishes.sortOrder));
  for (const { productId, ...finish } of rows) {
    const list = byProduct.get(productId) ?? [];
    list.push(finish);
    byProduct.set(productId, list);
  }
  return byProduct;
}

type ProductRow = Awaited<ReturnType<typeof selectProducts>>[number];

function selectProducts(db: Database, where: SQL[], order: SQL[], limit?: number) {
  const query = db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...where))
    .orderBy(...order);
  return limit ? query.limit(limit) : query;
}

async function hydrate(db: Database, rows: ProductRow[]) {
  const ids = rows.map((r) => r.id);
  const [templates, finishesByProduct] = await Promise.all([loadTemplates(db, ids), loadFinishes(db, ids)]);
  return rows.flatMap((r) => {
    const productTemplates = templates.get(r.id) ?? [];
    if (productTemplates.length === 0) return [];
    const summary: ProductSummary = {
      id: r.id,
      slug: r.slug,
      name: r.name,
      shortDescription: r.shortDescription,
      category: { slug: r.categorySlug, name: r.categoryName },
      startingPriceCents: r.startingPriceCents,
      currency: productTemplates[0].currency,
      minWidthUm: r.minWidthUm,
      maxWidthUm: r.maxWidthUm,
      templateCount: r.templateCount,
      primaryTemplate: productTemplates[0],
      finishes: finishesByProduct.get(r.id) ?? [],
      isSample: r.isSample,
    };
    return [{ row: r, summary, templates: productTemplates }];
  });
}

export async function listProducts(
  db: Database,
  filters: Partial<ListingFilters> = {},
  options: { limit?: number } = {},
): Promise<ProductSummary[]> {
  const rows = await selectProducts(db, listingConditions(db, filters), orderBy(filters.sort), options.limit);
  return (await hydrate(db, rows)).map((h) => h.summary);
}

export async function listFeaturedProducts(db: Database, limit = 4): Promise<ProductSummary[]> {
  const where = [...listingConditions(db, {}), eq(products.isFeatured, true)];
  const rows = await selectProducts(db, where, orderBy("featured"), limit);
  return (await hydrate(db, rows)).map((h) => h.summary);
}

export async function getProductBySlug(db: Database, slug: string): Promise<ProductDetail | null> {
  const rows = await selectProducts(db, [...listingConditions(db, {}), eq(products.slug, slug)], [], 1);
  const [hit] = await hydrate(db, rows);
  if (!hit) return null;
  return {
    ...hit.summary,
    longDescription: hit.row.longDescription,
    keyFeatures: hit.row.keyFeatures,
    whatsIncluded: hit.row.whatsIncluded,
    whatCanChange: hit.row.whatCanChange,
    assemblyDifficulty: hit.row.assemblyDifficulty,
    assemblyMinutes: hit.row.assemblyMinutes,
    leadTimeNote: hit.row.leadTimeNote,
    templates: hit.templates,
  };
}

/** Other products in the same category, topped up with featured products. */
export async function listRelatedProducts(db: Database, product: ProductSummary, limit = 3) {
  const base = [...listingConditions(db, {}), ne(products.id, product.id)];
  const sameCategory = await selectProducts(
    db,
    [...base, eq(categories.slug, product.category.slug)],
    orderBy("featured"),
    limit,
  );
  let rows = sameCategory;
  if (rows.length < limit) {
    const exclude = [product.id, ...rows.map((r) => r.id)];
    const more = await selectProducts(
      db,
      [...listingConditions(db, {}), sql`${products.id} not in ${exclude}`],
      orderBy("featured"),
      limit - rows.length,
    );
    rows = [...rows, ...more];
  }
  return (await hydrate(db, rows)).map((h) => h.summary);
}

export async function listCategories(db: Database): Promise<CategorySummary[]> {
  // Written with explicit table names: Drizzle omits table qualifiers in
  // single-table selects, which would make the correlation ambiguous.
  const productCount = sql<number>`(
    select count(*) from "products" p
    where p."category_id" = "categories"."id"
      and p."status" = 'published'
      and exists (
        select 1 from "design_templates" dt
        where dt."product_id" = p."id" and dt."status" = 'published'
      )
  )`.mapWith(Number);
  return db
    .select({
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      productCount,
    })
    .from(categories)
    .where(eq(categories.isVisible, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategoryBySlug(db: Database, slug: string): Promise<CategorySummary | null> {
  return (await listCategories(db)).find((c) => c.slug === slug) ?? null;
}

export interface MaterialWithFinishes {
  code: string;
  name: string;
  description: string;
  isSample: boolean;
  finishes: { code: string; name: string; swatchHex: string }[];
}

/** Active materials and finishes that at least one published product offers. */
export async function listMaterialsWithFinishes(db: Database): Promise<MaterialWithFinishes[]> {
  const rows = await db
    .select({
      materialCode: materials.code,
      materialName: materials.name,
      materialDescription: materials.description,
      isSample: materials.isSample,
      code: finishes.code,
      name: finishes.name,
      swatchHex: finishes.swatchHex,
    })
    .from(finishes)
    .innerJoin(materials, eq(materials.id, finishes.materialId))
    .where(
      and(
        eq(finishes.isActive, true),
        eq(materials.isActive, true),
        isNotNull(finishes.id),
        exists(
          db
            .select({ one: sql`1` })
            .from(productFinishes)
            .innerJoin(products, eq(products.id, productFinishes.productId))
            .where(and(eq(productFinishes.finishId, finishes.id), eq(products.status, "published"))),
        ),
      ),
    )
    .orderBy(asc(materials.sortOrder), asc(finishes.sortOrder));

  const result = new Map<string, MaterialWithFinishes>();
  for (const r of rows) {
    const entry =
      result.get(r.materialCode) ??
      ({
        code: r.materialCode,
        name: r.materialName,
        description: r.materialDescription,
        isSample: r.isSample,
        finishes: [],
      } satisfies MaterialWithFinishes);
    entry.finishes.push({ code: r.code, name: r.name, swatchHex: r.swatchHex });
    result.set(r.materialCode, entry);
  }
  return [...result.values()];
}
