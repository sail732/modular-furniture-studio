import { relations } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ElevationLayout } from "@/lib/elevation-layout";

/**
 * Phase 1 catalog schema.
 *
 * Conventions (apply to every later phase):
 *  - Money: integer minor units (cents) + ISO 4217 currency code.
 *  - Lengths: integer micrometres (see src/lib/units.ts).
 *  - `is_sample` marks seed content that must not be presented as real.
 *  - Timestamps are timestamptz in UTC.
 */

export const publishStatus = pgEnum("publish_status", ["draft", "published", "archived"]);
export const assemblyDifficulty = pgEnum("assembly_difficulty", ["easy", "moderate", "advanced"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    isSample: boolean("is_sample").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("categories_slug_key").on(t.slug)],
);

export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isSample: boolean("is_sample").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("materials_code_key").on(t.code)],
);

export const finishes = pgTable(
  "finishes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    /** Approximate on-screen colour used for swatches and illustrations. */
    swatchHex: char("swatch_hex", { length: 7 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isSample: boolean("is_sample").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("finishes_code_key").on(t.code),
    index("finishes_material_idx").on(t.materialId),
    check("finishes_swatch_hex_format", sql`${t.swatchHex} ~ '^#[0-9A-Fa-f]{6}$'`),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    shortDescription: varchar("short_description", { length: 280 }).notNull(),
    longDescription: text("long_description").notNull().default(""),
    keyFeatures: jsonb("key_features").$type<string[]>().notNull().default([]),
    whatsIncluded: jsonb("whats_included").$type<string[]>().notNull().default([]),
    whatCanChange: jsonb("what_can_change").$type<string[]>().notNull().default([]),
    assemblyDifficulty: assemblyDifficulty("assembly_difficulty"),
    assemblyMinutes: integer("assembly_minutes"),
    /** Only shown when set; must be verified by the business before use. */
    leadTimeNote: varchar("lead_time_note", { length: 200 }),
    status: publishStatus("status").notNull().default("draft"),
    isFeatured: boolean("is_featured").notNull().default(false),
    featuredRank: integer("featured_rank").notNull().default(0),
    isSample: boolean("is_sample").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_slug_key").on(t.slug),
    index("products_category_status_idx").on(t.categoryId, t.status),
    check(
      "products_assembly_minutes_positive",
      sql`${t.assemblyMinutes} IS NULL OR ${t.assemblyMinutes} > 0`,
    ),
  ],
);

export const designTemplates = pgTable(
  "design_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 60 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull().default(""),
    basePriceCents: integer("base_price_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    defaultWidthUm: integer("default_width_um").notNull(),
    defaultHeightUm: integer("default_height_um").notNull(),
    defaultDepthUm: integer("default_depth_um").notNull(),
    minWidthUm: integer("min_width_um").notNull(),
    maxWidthUm: integer("max_width_um").notNull(),
    widthIncrementUm: integer("width_increment_um").notNull(),
    /** Phase 1 only: illustrative layout. Derived from modules from Phase 2. */
    previewLayout: jsonb("preview_layout").$type<ElevationLayout>().notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: publishStatus("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("design_templates_code_key").on(t.code),
    index("design_templates_product_idx").on(t.productId, t.status),
    check("design_templates_price_non_negative", sql`${t.basePriceCents} >= 0`),
    check(
      "design_templates_width_range",
      sql`${t.minWidthUm} > 0 AND ${t.minWidthUm} <= ${t.defaultWidthUm} AND ${t.defaultWidthUm} <= ${t.maxWidthUm}`,
    ),
    check(
      "design_templates_dimensions_positive",
      sql`${t.defaultHeightUm} > 0 AND ${t.defaultDepthUm} > 0 AND ${t.widthIncrementUm} > 0`,
    ),
  ],
);

export const productFinishes = pgTable(
  "product_finishes",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    finishId: uuid("finish_id")
      .notNull()
      .references(() => finishes.id, { onDelete: "restrict" }),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.finishId] }),
    index("product_finishes_finish_idx").on(t.finishId),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  finishes: many(finishes),
}));

export const finishesRelations = relations(finishes, ({ one, many }) => ({
  material: one(materials, { fields: [finishes.materialId], references: [materials.id] }),
  productFinishes: many(productFinishes),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  templates: many(designTemplates),
  productFinishes: many(productFinishes),
}));

export const designTemplatesRelations = relations(designTemplates, ({ one }) => ({
  product: one(products, { fields: [designTemplates.productId], references: [products.id] }),
}));

export const productFinishesRelations = relations(productFinishes, ({ one }) => ({
  product: one(products, { fields: [productFinishes.productId], references: [products.id] }),
  finish: one(finishes, { fields: [productFinishes.finishId], references: [finishes.id] }),
}));
