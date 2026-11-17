import { z } from "zod";
import { cellKinds } from "@/lib/elevation-layout";

/**
 * Shared configuration types. Everything here is safe to send to the browser:
 * no cost, margin or manufacturing data appears in these shapes.
 */

export const baseKinds = ["legs", "plinth", "floor", "wall"] as const;
export type BaseKind = (typeof baseKinds)[number];

export const moduleTypes = [
  "open",
  "door",
  "door-pair",
  "drawers",
  "hanging",
  "open-over-door",
  "hanging-over-drawers",
  "knee",
] as const;
export type ModuleType = (typeof moduleTypes)[number];

/** How a module is drawn: cells from top to bottom. `repeat: "count"` repeats a cell per unit. */
export const cellTemplateSchema = z
  .array(
    z.object({
      kind: z.enum(cellKinds),
      heightShare: z.number().positive().default(1),
      repeat: z.literal("count").optional(),
    }),
  )
  .min(1);
export type CellTemplate = z.infer<typeof cellTemplateSchema>;

const code = z.string().regex(/^[A-Z0-9-]{1,60}$/);
const um = z.number().int().positive().max(10_000_000);

/** What a customer has chosen. This is the only thing the browser sends. */
export const selectionSchema = z.object({
  productSlug: z.string().regex(/^[a-z0-9-]{1,120}$/),
  templateCode: code,
  bays: z
    .array(z.object({ moduleCode: code, widthUm: um, count: z.number().int().min(0).max(12) }))
    .min(1)
    .max(12),
  materialCode: code,
  finishCode: code,
  base: z.enum(baseKinds),
  handleSku: code.nullable(),
  accessories: z.array(z.object({ sku: code, quantity: z.number().int().min(1).max(20) })).max(12),
  /** Optional: only present if a caller asks for a non-standard height or depth, which is always refused. */
  heightUm: um.optional(),
  depthUm: um.optional(),
});
export type Selection = z.infer<typeof selectionSchema>;
export type BaySelection = Selection["bays"][number];

export interface Issue {
  /** Stable machine code, e.g. WIDTH_NOT_ALLOWED. */
  code: string;
  /** Which part of the selection caused it, e.g. "bays.2.widthUm" or "finishCode". */
  path: string;
  /** Customer-readable explanation including what is allowed. */
  message: string;
  /** Allowed values, when there is a short list (micrometres or codes). */
  allowed?: (number | string)[];
  /** Closest valid lengths, for dimension issues (micrometres). */
  nearest?: number[];
}

export interface ValidationResult {
  valid: boolean;
  issues: Issue[];
  overallWidthUm: number;
  heightUm: number | null;
  depthUm: number | null;
  ruleSetVersion: number;
  templateVersion: number | null;
}

// ---- Compatibility rules stored as data -------------------------------------

/** A fact about a selection that a rule can test. Exactly one key is set. */
export const conditionSchema = z.union([
  z.object({ base: z.enum(baseKinds) }).strict(),
  z.object({ moduleType: z.enum(moduleTypes) }).strict(),
  z.object({ accessory: code }).strict(),
  z.object({ handle: code.nullable() }).strict(),
  z.object({ material: code }).strict(),
  z.object({ finish: code }).strict(),
  z.object({ widthOverUm: um }).strict(),
]);
export type Condition = z.infer<typeof conditionSchema>;

export const ruleDefinitionSchema = z.discriminatedUnion("kind", [
  /** If `when` holds, `forbid` must not. */
  z.object({ kind: z.literal("excludes"), when: conditionSchema, forbid: conditionSchema }),
  /** If `when` holds, `require` must too. */
  z.object({ kind: z.literal("requires"), when: conditionSchema, require: conditionSchema }),
  /** The number of bays of a module type must be within bounds. */
  z.object({
    kind: z.literal("count"),
    moduleType: z.enum(moduleTypes),
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
  }),
]);
export type RuleDefinition = z.infer<typeof ruleDefinitionSchema>;

export interface Rule {
  code: string;
  /** Null applies to every product. */
  productSlug: string | null;
  definition: RuleDefinition;
  message: string;
  /** Selection path the message is shown against. */
  path: string;
}

// ---- Catalog data the configurator needs (browser-safe) ----------------------

export interface CatalogModule {
  code: string;
  name: string;
  description: string;
  type: ModuleType;
  widthsUm: number[];
  countLabel: string | null;
  minCount: number;
  maxCount: number;
  defaultCount: number;
  cellTemplate: CellTemplate;
}

export interface CatalogTemplate {
  code: string;
  version: number;
  name: string;
  description: string;
  basePriceCents: number;
  currency: string;
  heightUm: number;
  depthUm: number;
  minWidthUm: number;
  maxWidthUm: number;
  widthIncrementUm: number;
  minBays: number;
  maxBays: number;
  defaultBase: BaseKind;
  allowedBases: BaseKind[];
  defaultBays: BaySelection[];
  defaultAccessories: { sku: string; quantity: number }[];
}

export interface CatalogOption {
  sku: string;
  name: string;
  description: string;
}

export interface ConfiguratorCatalog {
  product: { slug: string; name: string; categoryName: string; isSample: boolean };
  templates: CatalogTemplate[];
  modules: CatalogModule[];
  materials: { code: string; name: string; finishes: { code: string; name: string; swatchHex: string }[] }[];
  /** Finish codes this product can be made in. */
  finishCodes: string[];
  defaultFinishCode: string;
  handles: CatalogOption[];
  accessories: (CatalogOption & { maxQuantity: number })[];
  ruleSetVersion: number;
}

export const baseLabels: Record<BaseKind, string> = {
  legs: "Legs",
  plinth: "Plinth",
  floor: "Sits on the floor",
  wall: "Wall-hung",
};
