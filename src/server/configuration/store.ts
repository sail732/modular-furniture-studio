import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { configurationItems, configurations, designTemplates, products } from "@/server/db/schema";
import type { Issue, Selection, ValidationResult } from "@/lib/configuration/types";
import { loadEngineCatalog } from "./catalog";
import { validateSelection } from "./engine";
import { resolveItems } from "./resolve";

/** Only a hash of the anonymous session id is stored, so a database leak does not grant access. */
export function hashSession(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

export type SaveResult =
  | { ok: true; id: string; shareToken: string; validation: ValidationResult }
  | { ok: false; reason: "invalid"; validation: ValidationResult }
  | { ok: false; reason: "not_found" };

const cleanName = (name: string | undefined, fallback: string) => {
  const trimmed = (name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  return trimmed === "" ? fallback : trimmed;
};

/** Height and depth are never taken from the caller; they come from the template. */
function stored(selection: Selection): Selection {
  const { heightUm: _h, depthUm: _d, ...rest } = selection;
  void _h;
  void _d;
  return rest;
}

/**
 * Validate and save. Only valid configurations are stored; an invalid one is
 * returned with its issues and nothing is written.
 */
export async function saveConfiguration(
  db: Database,
  input: { selection: Selection; name?: string; sessionId: string; replaceId?: string },
): Promise<SaveResult> {
  const engine = await loadEngineCatalog(db, input.selection.productSlug);
  if (!engine) return { ok: false, reason: "not_found" };
  const validation = validateSelection(engine.catalog, engine.rules, input.selection);
  if (!validation.valid) return { ok: false, reason: "invalid", validation };

  const template = engine.catalog.templates.find((t) => t.code === input.selection.templateCode)!;
  const items = resolveItems(engine.internals, input.selection);
  const values = {
    name: cleanName(input.name, `${engine.catalog.product.name}, ${template.name.split(":")[0]}`),
    productId: engine.internals.productId,
    templateId: engine.internals.templateIds.get(template.code)!,
    templateVersion: template.version,
    ruleSetVersion: validation.ruleSetVersion,
    selection: stored(input.selection),
    widthUm: validation.overallWidthUm,
    heightUm: template.heightUm,
    depthUm: template.depthUm,
    validationIssues: [] as Issue[],
    validatedAt: new Date(),
    updatedAt: new Date(),
  };
  const ownerSessionHash = hashSession(input.sessionId);

  return db.transaction(async (tx) => {
    let id: string;
    let shareToken: string;
    if (input.replaceId) {
      const [row] = await tx
        .update(configurations)
        .set(values)
        .where(and(eq(configurations.id, input.replaceId), eq(configurations.ownerSessionHash, ownerSessionHash)))
        .returning({ id: configurations.id, shareToken: configurations.shareToken });
      if (!row) return { ok: false, reason: "not_found" } as const;
      ({ id, shareToken } = row);
      await tx.delete(configurationItems).where(eq(configurationItems.configurationId, id));
    } else {
      [{ id, shareToken }] = await tx
        .insert(configurations)
        .values({ ...values, ownerSessionHash, shareToken: randomBytes(24).toString("base64url") })
        .returning({ id: configurations.id, shareToken: configurations.shareToken });
    }
    await tx.insert(configurationItems).values(items.map((item, i) => ({ ...item, configurationId: id, lineNo: i + 1 })));
    return { ok: true, id, shareToken, validation } as const;
  });
}

export interface SavedConfiguration {
  id: string;
  shareToken: string;
  name: string;
  productSlug: string;
  productName: string;
  templateName: string;
  templateVersion: number;
  ruleSetVersion: number;
  selection: Selection;
  widthUm: number;
  heightUm: number;
  depthUm: number;
  updatedAt: Date;
}

const savedColumns = {
  id: configurations.id,
  shareToken: configurations.shareToken,
  name: configurations.name,
  productSlug: products.slug,
  productName: products.name,
  templateName: designTemplates.name,
  templateVersion: configurations.templateVersion,
  ruleSetVersion: configurations.ruleSetVersion,
  selection: configurations.selection,
  widthUm: configurations.widthUm,
  heightUm: configurations.heightUm,
  depthUm: configurations.depthUm,
  updatedAt: configurations.updatedAt,
};

const savedQuery = (db: Database) =>
  db
    .select(savedColumns)
    .from(configurations)
    .innerJoin(products, eq(products.id, configurations.productId))
    .innerJoin(designTemplates, eq(designTemplates.id, configurations.templateId));

/** A configuration, only for the session that owns it. */
export async function getOwnedConfiguration(db: Database, id: string, sessionId: string): Promise<SavedConfiguration | null> {
  const [row] = await savedQuery(db)
    .where(and(eq(configurations.id, id), eq(configurations.ownerSessionHash, hashSession(sessionId))))
    .limit(1);
  return row ?? null;
}

/** Read-only view by share token. The result contains nothing about the owner. */
export async function getSharedConfiguration(db: Database, shareToken: string): Promise<SavedConfiguration | null> {
  const [row] = await savedQuery(db).where(eq(configurations.shareToken, shareToken)).limit(1);
  return row ?? null;
}

export async function listOwnedConfigurations(db: Database, sessionId: string): Promise<SavedConfiguration[]> {
  return savedQuery(db)
    .where(eq(configurations.ownerSessionHash, hashSession(sessionId)))
    .orderBy(desc(configurations.updatedAt))
    .limit(100);
}

export async function listConfigurationItems(db: Database, configurationId: string) {
  return db
    .select()
    .from(configurationItems)
    .where(eq(configurationItems.configurationId, configurationId))
    .orderBy(asc(configurationItems.lineNo));
}

/** Copy an owned configuration. The copy is revalidated against the current catalog. */
export async function duplicateConfiguration(db: Database, id: string, sessionId: string): Promise<SaveResult> {
  const original = await getOwnedConfiguration(db, id, sessionId);
  if (!original) return { ok: false, reason: "not_found" };
  return saveConfiguration(db, {
    selection: original.selection,
    name: `${original.name} (copy)`.slice(0, 120),
    sessionId,
  });
}

/** Check a saved selection against today's catalog and rules. */
export async function revalidate(db: Database, selection: Selection): Promise<ValidationResult | null> {
  const engine = await loadEngineCatalog(db, selection.productSlug);
  return engine ? validateSelection(engine.catalog, engine.rules, selection) : null;
}
