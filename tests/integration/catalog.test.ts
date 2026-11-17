import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { DatabaseHandle } from "@/server/db/client";
import { categories, designTemplates, finishes, products } from "@/server/db/schema";
import { seedSampleCatalog } from "@/server/db/seed";
import { parseListingParams } from "@/server/catalog/filters";
import {
  getCategoryBySlug,
  getProductBySlug,
  listCategories,
  listFeaturedProducts,
  listMaterialsWithFinishes,
  listProducts,
  listRelatedProducts,
} from "@/server/catalog/queries";
import { inchesToUm } from "@/lib/units";
import { createTestDatabase } from "./helpers";

let handle: DatabaseHandle;
beforeAll(async () => {
  handle = await createTestDatabase();
});
afterAll(async () => {
  await handle.close();
});

const list = (params: Record<string, string | string[]>, category?: string) =>
  listProducts(handle.db, parseListingParams(params, category));

describe("catalog browsing", () => {
  it("lists visible categories in order with published product counts", async () => {
    const cats = await listCategories(handle.db);
    expect(cats.map((c) => c.slug)).toEqual([
      "tv-consoles",
      "bookshelves",
      "wardrobes",
      "home-office",
      "sideboards",
    ]);
    expect(cats.find((c) => c.slug === "tv-consoles")?.productCount).toBe(2);
    expect(await getCategoryBySlug(handle.db, "nope")).toBeNull();
  });

  it("returns every published product with a starting price from its cheapest design", async () => {
    const all = await list({});
    expect(all).toHaveLength(8);
    const ledger = all.find((p) => p.slug === "ledger-media-console")!;
    expect(ledger.startingPriceCents).toBe(64_900);
    expect(ledger.templateCount).toBe(3);
    expect(ledger.primaryTemplate.code).toBe("TPL-LEDGER-A");
    expect(ledger.minWidthUm).toBe(inchesToUm(48));
    expect(ledger.maxWidthUm).toBe(inchesToUm(108));
    expect(ledger.finishes[0]).toMatchObject({ code: "FIN-OAK-CLEAR", isDefault: true });
    expect(all.every((p) => p.isSample)).toBe(true);
  });

  it("puts featured products first, in rank order", async () => {
    const all = await list({});
    expect(all.slice(0, 4).map((p) => p.slug)).toEqual([
      "ledger-media-console",
      "tally-bookshelf",
      "hold-wardrobe",
      "course-sideboard",
    ]);
    expect((await listFeaturedProducts(handle.db, 2)).map((p) => p.slug)).toEqual([
      "ledger-media-console",
      "tally-bookshelf",
    ]);
  });

  it("filters by category", async () => {
    const shelves = await list({}, "bookshelves");
    expect(shelves.map((p) => p.slug).sort()).toEqual(["rung-low-shelf", "tally-bookshelf"]);
  });

  it("sorts by price and by newest", async () => {
    const asc = await list({ sort: "price-asc" });
    const prices = asc.map((p) => p.startingPriceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(asc[0].slug).toBe("rung-low-shelf");
    const desc = await list({ sort: "price-desc" });
    expect(desc[0].slug).toBe("hold-wardrobe");
    const newest = await list({ sort: "newest" });
    expect(newest[0].slug).toBe("ledger-media-console");
  });

  it("filters by starting price band", async () => {
    const under500 = await list({ price: "0-500" });
    expect(under500.map((p) => p.slug).sort()).toEqual(["parcel-cabinet", "rung-low-shelf", "tally-bookshelf"]);
    const over = await list({ price: "900-" });
    expect(over.map((p) => p.slug)).toEqual(["hold-wardrobe"]);
  });

  it("filters by width when any design can be built inside the band", async () => {
    const narrow = (await list({ width: "0-24" })).map((p) => p.slug);
    expect(narrow).toEqual(["tally-bookshelf"]);
    const wide = (await list({ width: "110-" })).map((p) => p.slug);
    expect(wide).toEqual(["tally-bookshelf"]);
    const hundred = (await list({ width: "100-105" })).map((p) => p.slug).sort();
    expect(hundred).toEqual(["ledger-media-console", "tally-bookshelf"]);
  });

  it("filters by material and by finish", async () => {
    const birch = (await list({ material: "MAT-BIRCH-PLY" })).map((p) => p.slug).sort();
    expect(birch).toEqual(["brief-desk", "parcel-cabinet", "rung-low-shelf", "span-wall-console", "tally-bookshelf"]);
    const smoked = (await list({ finish: "FIN-BIRCH-SMOKE" })).map((p) => p.slug);
    expect(smoked).toEqual(["tally-bookshelf"]);
    const combined = (await list({ material: "MAT-BIRCH-PLY", price: "500-" })).map((p) => p.slug).sort();
    expect(combined).toEqual(["brief-desk", "span-wall-console"]);
  });

  it("searches names, descriptions and category names, case-insensitively", async () => {
    // Course's description mentions Ledger, so both match.
    expect((await list({ q: "LEDGER" })).map((p) => p.slug)).toEqual(["ledger-media-console", "course-sideboard"]);
    expect((await list({ q: "ledger media" })).map((p) => p.slug)).toEqual(["ledger-media-console"]);
    expect((await list({ q: "wardrobe" })).map((p) => p.slug)).toEqual(["hold-wardrobe"]);
    expect((await list({ q: "soundbar" })).map((p) => p.slug)).toEqual(["ledger-media-console"]);
    expect(await list({ q: "hammock" })).toEqual([]);
  });

  it("treats LIKE wildcards in a search as literal text", async () => {
    expect(await list({ q: "%" })).toEqual([]);
    expect(await list({ q: "_" })).toEqual([]);
  });

  it("returns product detail with all published designs", async () => {
    const product = await getProductBySlug(handle.db, "hold-wardrobe");
    expect(product).not.toBeNull();
    expect(product!.templates.map((t) => t.code)).toEqual(["TPL-HOLD-A", "TPL-HOLD-B", "TPL-HOLD-C"]);
    expect(product!.assemblyDifficulty).toBe("advanced");
    expect(product!.leadTimeNote).toBeNull();
    expect(await getProductBySlug(handle.db, "missing")).toBeNull();
  });

  it("suggests related products from the same category first", async () => {
    const product = (await getProductBySlug(handle.db, "course-sideboard"))!;
    const related = await listRelatedProducts(handle.db, product, 3);
    expect(related).toHaveLength(3);
    expect(related[0].slug).toBe("parcel-cabinet");
    expect(related.map((p) => p.slug)).not.toContain("course-sideboard");
  });

  it("lists materials with their finishes", async () => {
    const mats = await listMaterialsWithFinishes(handle.db);
    expect(mats.map((m) => m.code)).toEqual(["MAT-BIRCH-PLY", "MAT-OAK-VENEER", "MAT-PAINTED"]);
    expect(mats[2].finishes.map((f) => f.name)).toEqual(["Chalk", "Sage", "Slate", "Ink blue"]);
  });
});

describe("visibility and integrity", () => {
  it("hides draft products, draft designs and hidden categories from the storefront", async () => {
    const db = handle.db;
    await db.update(products).set({ status: "draft" }).where(eq(products.slug, "parcel-cabinet"));
    await db.update(designTemplates).set({ status: "draft" }).where(eq(designTemplates.code, "TPL-LEDGER-A"));
    await db.update(categories).set({ isVisible: false }).where(eq(categories.slug, "home-office"));

    const all = await listProducts(db);
    expect(all.map((p) => p.slug)).not.toContain("parcel-cabinet");
    expect(all.map((p) => p.slug)).not.toContain("brief-desk");
    expect(await getProductBySlug(db, "parcel-cabinet")).toBeNull();
    expect(await getProductBySlug(db, "brief-desk")).toBeNull();
    expect((await listCategories(db)).map((c) => c.slug)).not.toContain("home-office");

    const ledger = (await getProductBySlug(db, "ledger-media-console"))!;
    expect(ledger.templates.map((t) => t.code)).toEqual(["TPL-LEDGER-B", "TPL-LEDGER-C"]);
    expect(ledger.startingPriceCents).toBe(89_900);
  });

  it("re-seeding restores sample content without duplicating it", async () => {
    await seedSampleCatalog(handle.db);
    expect(await listProducts(handle.db)).toHaveLength(8);
    expect(await listCategories(handle.db)).toHaveLength(5);
  });

  it("rejects invalid rows at the database level", async () => {
    const db = handle.db;
    const [product] = await db.select({ id: products.id }).from(products).limit(1);
    const template = {
      productId: product.id,
      code: "TPL-BAD",
      name: "Bad",
      basePriceCents: -1,
      defaultWidthUm: 100,
      defaultHeightUm: 100,
      defaultDepthUm: 100,
      minWidthUm: 100,
      maxWidthUm: 100,
      widthIncrementUm: 1,
      previewLayout: { base: "floor" as const, columns: [] },
    };
    await expect(db.insert(designTemplates).values(template)).rejects.toThrow();
    await expect(
      db.insert(designTemplates).values({ ...template, basePriceCents: 1, minWidthUm: 200 }),
    ).rejects.toThrow();
    // Width range and standard width must sit on the step grid.
    const onGrid = { ...template, basePriceCents: 1, minWidthUm: 100, maxWidthUm: 160, defaultWidthUm: 120, widthIncrementUm: 20 };
    await expect(db.insert(designTemplates).values({ ...onGrid, maxWidthUm: 150, defaultWidthUm: 100 })).rejects.toThrow();
    await expect(db.insert(designTemplates).values({ ...onGrid, defaultWidthUm: 130 })).rejects.toThrow();
    await db.insert(designTemplates).values(onGrid);
    await db.delete(designTemplates).where(eq(designTemplates.code, "TPL-BAD"));
    const [finish] = await db.select().from(finishes).limit(1);
    await expect(
      db.insert(finishes).values({ materialId: finish.materialId, code: "FIN-BAD", name: "Bad", swatchHex: "red    " }),
    ).rejects.toThrow();
    await expect(
      db.insert(products).values({ categoryId: finish.materialId, slug: "x", name: "x", shortDescription: "x" }),
    ).rejects.toThrow();
  });
});
