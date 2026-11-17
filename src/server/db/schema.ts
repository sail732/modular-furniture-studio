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
import type { BaseKind, CellTemplate, Issue, RuleDefinition, Selection } from "@/lib/configuration/types";

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
    /** Incremented whenever a published template changes; stored on configurations. */
    version: integer("version").notNull().default(1),
    minBays: integer("min_bays").notNull().default(1),
    maxBays: integer("max_bays").notNull().default(6),
    defaultBase: varchar("default_base", { length: 12 }).$type<BaseKind>().notNull().default("plinth"),
    allowedBases: jsonb("allowed_bases").$type<BaseKind[]>().notNull().default([]),
    defaultAccessories: jsonb("default_accessories")
      .$type<{ sku: string; quantity: number }[]>()
      .notNull()
      .default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    status: publishStatus("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("design_templates_code_key").on(t.code),
    index("design_templates_product_idx").on(t.productId, t.status),
    check("design_templates_bay_range", sql`${t.minBays} >= 1 AND ${t.minBays} <= ${t.maxBays}`),
    check("design_templates_price_non_negative", sql`${t.basePriceCents} >= 0`),
    check(
      "design_templates_width_range",
      sql`${t.minWidthUm} > 0 AND ${t.minWidthUm} <= ${t.defaultWidthUm} AND ${t.defaultWidthUm} <= ${t.maxWidthUm}`,
    ),
    // Widths are offered only in fixed steps, so the range and the standard
    // size must sit exactly on the step grid (business decision 10).
    check(
      "design_templates_width_on_step",
      sql`(${t.maxWidthUm} - ${t.minWidthUm}) % ${t.widthIncrementUm} = 0 AND (${t.defaultWidthUm} - ${t.minWidthUm}) % ${t.widthIncrementUm} = 0`,
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


// ---------------------------------------------------------------------------
// Phase 2: components, modules, rules and saved configurations
//
// Three levels, kept separate:
//   component  a manufactured or purchased part with a SKU
//   module     a customer-selectable bay, assembled from components
//   template   a valid starting arrangement of modules (design_templates + template_bays)
// ---------------------------------------------------------------------------

export const componentType = pgEnum("component_type", [
  "top_panel",
  "bottom_panel",
  "side_panel",
  "divider",
  "back_panel",
  "shelf",
  "door",
  "drawer_box",
  "drawer_front",
  "leg",
  "plinth",
  "handle",
  "hinge",
  "drawer_runner",
  "hanging_rail",
  "hardware_pack",
  "accessory",
]);

export const components = pgTable(
  "components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stable SKU. Never reused for a different part. */
    sku: varchar("sku", { length: 60 }).notNull(),
    /** Bumped when the part's specification changes; recorded on configuration items. */
    revision: integer("revision").notNull().default(1),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull().default(""),
    type: componentType("type").notNull(),
    /** Fixed dimensions where the part has them. Cut-to-size parts leave the cut dimension null. */
    widthUm: integer("width_um"),
    heightUm: integer("height_um"),
    depthUm: integer("depth_um"),
    /** True when one dimension is cut to the configuration (e.g. a top panel cut to overall width). */
    isCutToSize: boolean("is_cut_to_size").notNull().default(false),
    /** True when the part is made in the chosen finish. */
    takesFinish: boolean("takes_finish").notNull().default(false),
    /** PRIVATE: never selected by storefront or configurator queries. */
    costCents: integer("cost_cents"),
    weightGrams: integer("weight_grams"),
    /** PRIVATE: manufacturing attributes (edge banding, grain, etc.). Empty until reviewed. */
    manufacturing: jsonb("manufacturing").$type<Record<string, unknown>>().notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    isSample: boolean("is_sample").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("components_sku_key").on(t.sku),
    index("components_type_idx").on(t.type, t.isActive),
    check("components_cost_non_negative", sql`${t.costCents} IS NULL OR ${t.costCents} >= 0`),
  ],
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 60 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull().default(""),
    type: varchar("type", { length: 30 }).$type<import("@/lib/configuration/types").ModuleType>().notNull(),
    /** What the adjustable unit count means, e.g. "Drawers". Null when the count is fixed. */
    countLabel: varchar("count_label", { length: 60 }),
    minCount: integer("min_count").notNull().default(1),
    maxCount: integer("max_count").notNull().default(1),
    defaultCount: integer("default_count").notNull().default(1),
    /** How the bay is drawn in the 2D preview. Presentation only. */
    cellTemplate: jsonb("cell_template").$type<CellTemplate>().notNull(),
    /** Handles this bay needs: fixed + perCount x count. */
    handlesFixed: integer("handles_fixed").notNull().default(0),
    handlesPerCount: integer("handles_per_count").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("modules_code_key").on(t.code),
    index("modules_product_idx").on(t.productId, t.isActive),
    check(
      "modules_count_range",
      sql`${t.minCount} >= 0 AND ${t.minCount} <= ${t.defaultCount} AND ${t.defaultCount} <= ${t.maxCount}`,
    ),
  ],
);

/** The fixed set of widths a module is made in. */
export const moduleWidths = pgTable(
  "module_widths",
  {
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    widthUm: integer("width_um").notNull(),
  },
  (t) => [primaryKey({ columns: [t.moduleId, t.widthUm] }), check("module_widths_positive", sql`${t.widthUm} > 0`)],
);

/** Components that make up one bay of a module: quantity = fixed + perCount x count. */
export const moduleComponents = pgTable(
  "module_components",
  {
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "restrict" }),
    quantityFixed: integer("quantity_fixed").notNull().default(0),
    quantityPerCount: integer("quantity_per_count").notNull().default(0),
    /** Which bay dimension a cut-to-size part is cut to. */
    cutTo: varchar("cut_to", { length: 20 }).$type<"none" | "bay_width" | "half_bay_width">().notNull().default("none"),
  },
  (t) => [primaryKey({ columns: [t.moduleId, t.componentId] })],
);

/** Carcass parts every configuration of a product needs. */
export const productComponents = pgTable(
  "product_components",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    /** fixed: quantity; per_bay: quantity x bays; per_divider: quantity x (bays - 1). */
    quantityRule: varchar("quantity_rule", { length: 20 })
      .$type<"fixed" | "per_bay" | "per_divider">()
      .notNull()
      .default("fixed"),
    cutTo: varchar("cut_to", { length: 20 }).$type<"none" | "overall_width" | "bay_width">().notNull().default("none"),
    /** Only included when this base is chosen. Null means always. */
    whenBase: varchar("when_base", { length: 12 }).$type<BaseKind>(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.componentId] }),
    check("product_components_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

/** Optional accessories a customer can add to a product. */
export const productAccessories = pgTable(
  "product_accessories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "restrict" }),
    maxQuantity: integer("max_quantity").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.componentId] }),
    check("product_accessories_max_positive", sql`${t.maxQuantity} > 0`),
  ],
);

/** A template's starting arrangement of modules, left to right. */
export const templateBays = pgTable(
  "template_bays",
  {
    templateId: uuid("template_id")
      .notNull()
      .references(() => designTemplates.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "restrict" }),
    widthUm: integer("width_um").notNull(),
    count: integer("count").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.templateId, t.position] })],
);

/** A published, immutable set of compatibility rules. Configurations record which version validated them. */
export const ruleSets = pgTable(
  "rule_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: integer("version").notNull(),
    status: publishStatus("status").notNull().default("draft"),
    notes: text("notes").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("rule_sets_version_key").on(t.version)],
);

export const compatibilityRules = pgTable(
  "compatibility_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleSetId: uuid("rule_set_id")
      .notNull()
      .references(() => ruleSets.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 60 }).notNull(),
    /** Null applies to every product. */
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    definition: jsonb("definition").$type<RuleDefinition>().notNull(),
    /** Customer-facing message shown when the rule is broken. */
    message: text("message").notNull(),
    /** Selection path the message is attached to. */
    path: varchar("path", { length: 60 }).notNull().default("bays"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("compatibility_rules_set_code_key").on(t.ruleSetId, t.code)],
);

/** A saved, validated configuration. Only valid configurations are stored. */
export const configurations = pgTable(
  "configurations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Unguessable token for read-only sharing. Carries no owner information. */
    shareToken: varchar("share_token", { length: 64 }).notNull(),
    /** SHA-256 of the anonymous session id that owns this configuration. Accounts arrive in Phase 4. */
    ownerSessionHash: char("owner_session_hash", { length: 64 }),
    name: varchar("name", { length: 120 }).notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => designTemplates.id, { onDelete: "restrict" }),
    templateVersion: integer("template_version").notNull(),
    ruleSetVersion: integer("rule_set_version").notNull(),
    /** Exactly what the customer chose (validated Selection). */
    selection: jsonb("selection").$type<Selection>().notNull(),
    widthUm: integer("width_um").notNull(),
    heightUm: integer("height_um").notNull(),
    depthUm: integer("depth_um").notNull(),
    unit: varchar("unit", { length: 4 }).notNull().default("in"),
    /** Issues from the validation that accepted it (always empty today; kept for traceability). */
    validationIssues: jsonb("validation_issues").$type<Issue[]>().notNull().default([]),
    validatedAt: timestamp("validated_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("configurations_share_token_key").on(t.shareToken),
    index("configurations_owner_idx").on(t.ownerSessionHash, t.updatedAt),
  ],
);

/** Resolved component list for a saved configuration. */
export const configurationItems = pgTable(
  "configuration_items",
  {
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => configurations.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    /** carcass, bay (with bayIndex) or option (handles, accessories). */
    source: varchar("source", { length: 12 }).$type<"carcass" | "bay" | "option">().notNull(),
    bayIndex: integer("bay_index"),
    moduleCode: varchar("module_code", { length: 60 }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "restrict" }),
    sku: varchar("sku", { length: 60 }).notNull(),
    componentRevision: integer("component_revision").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    quantity: integer("quantity").notNull(),
    /** Length a cut-to-size part is cut to. */
    cutLengthUm: integer("cut_length_um"),
    finishCode: varchar("finish_code", { length: 40 }),
  },
  (t) => [
    primaryKey({ columns: [t.configurationId, t.lineNo] }),
    check("configuration_items_quantity_positive", sql`${t.quantity} > 0`),
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
