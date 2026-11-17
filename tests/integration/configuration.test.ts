import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { DatabaseHandle } from "@/server/db/client";
import { compatibilityRules, components, configurations, designTemplates } from "@/server/db/schema";
import { loadEngineCatalog, type EngineCatalog } from "@/server/configuration/catalog";
import { defaultSelection, fitBaysToWidth, overallWidth, validateSelection } from "@/server/configuration/engine";
import { resolveItems } from "@/server/configuration/resolve";
import {
  duplicateConfiguration,
  getOwnedConfiguration,
  getSharedConfiguration,
  hashSession,
  listConfigurationItems,
  listOwnedConfigurations,
  revalidate,
  saveConfiguration,
} from "@/server/configuration/store";
import type { Selection } from "@/lib/configuration/types";
import { inchesToUm as inch } from "@/lib/units";
import { sampleProducts } from "@/server/db/seed-data";
import {
  finishMaterialMismatch,
  incompatibleDoor,
  invalidDimension,
  validBookshelf,
  validTvConsole,
} from "../fixtures/configurations";
import { createTestDatabase } from "./helpers";

let handle: DatabaseHandle;
let ledger: EngineCatalog;
beforeAll(async () => {
  handle = await createTestDatabase();
  ledger = (await loadEngineCatalog(handle.db, "ledger-media-console"))!;
});
afterAll(async () => {
  await handle.close();
});

const check = async (selection: Selection) => {
  const engine = (await loadEngineCatalog(handle.db, selection.productSlug))!;
  return validateSelection(engine.catalog, engine.rules, selection);
};
const codes = async (selection: Selection) => (await check(selection)).issues.map((i) => i.code);

describe("configurator catalog", () => {
  it("loads templates, modules, options and the rule set for a product", () => {
    expect(ledger.catalog.templates.map((t) => t.code)).toEqual(["TPL-LEDGER-A", "TPL-LEDGER-B", "TPL-LEDGER-C"]);
    expect(ledger.catalog.modules.map((m) => m.code)).toEqual(["LED-DOOR", "LED-DOOR-PAIR", "LED-OPEN", "LED-DRAWERS"]);
    expect(ledger.catalog.modules[0].widthsUm).toEqual([12, 18, 24].map(inch));
    expect(ledger.catalog.handles.map((h) => h.sku)).toEqual(["HDL-BAR", "HDL-EDGE", "HDL-KNOB"]);
    expect(ledger.catalog.accessories.map((a) => a.sku).sort()).toEqual(["ACC-CABLE-GROMMET", "ACC-LEVELLERS"]);
    expect(ledger.catalog.ruleSetVersion).toBe(1);
    expect(ledger.rules.map((r) => r.code)).toContain("LEDGER_MAX_DRAWER_BAYS");
    expect(ledger.rules.map((r) => r.code)).not.toContain("DESK_ONE_KNEE_SPACE");
  });

  it("never exposes cost or manufacturing data to the browser-safe catalog", async () => {
    await handle.db.update(components).set({ costCents: 12_345, manufacturing: { grain: "long" } });
    const engine = (await loadEngineCatalog(handle.db, "ledger-media-console"))!;
    const everything = JSON.stringify([engine.catalog, engine.rules, [...engine.internals.optionParts.values()]]);
    expect(everything).not.toMatch(/cost|12345|manufacturing|grain/i);
  });

  it("returns null for unknown, unpublished or unconfigurable products", async () => {
    expect(await loadEngineCatalog(handle.db, "nope")).toBeNull();
  });

  it("every sample template's starting arrangement is itself a valid configuration", async () => {
    for (const product of sampleProducts) {
      const engine = (await loadEngineCatalog(handle.db, product.slug))!;
      expect(engine, product.slug).not.toBeNull();
      for (const template of engine.catalog.templates) {
        const result = validateSelection(engine.catalog, engine.rules, defaultSelection(engine.catalog, template.code));
        expect(result.issues, template.code).toEqual([]);
        expect(resolveItems(engine.internals, defaultSelection(engine.catalog, template.code)).length).toBeGreaterThan(5);
      }
    }
  });
});

describe("validation: the specification's fixtures", () => {
  it("accepts a valid TV console", async () => {
    const result = await check(validTvConsole);
    expect(result).toMatchObject({
      valid: true,
      issues: [],
      overallWidthUm: inch(78),
      heightUm: inch(20),
      depthUm: inch(16),
      ruleSetVersion: 1,
      templateVersion: 1,
    });
  });

  it("accepts a valid bookshelf", async () => {
    expect(await check(validBookshelf)).toMatchObject({ valid: true, overallWidthUm: inch(72), heightUm: inch(78) });
  });

  it("rejects an invalid dimension with the range and the nearest valid width, without clamping", async () => {
    const result = await check(invalidDimension);
    expect(result.valid).toBe(false);
    expect(result.overallWidthUm).toBe(inch(60));
    const [issue] = result.issues;
    expect(issue).toMatchObject({ code: "WIDTH_OUT_OF_RANGE", path: "dimensions.width", nearest: [inch(66)] });
    expect(issue.message).toContain("60″");
    expect(issue.message).toContain("66″ to 90″");
    expect(issue.allowed).toEqual([66, 72, 78, 84, 90].map(inch));
  });

  it("rejects an incompatible door and module combination, pointing at the bay", async () => {
    const result = await check(incompatibleDoor);
    const issue = result.issues.find((i) => i.code === "MODULE_WIDTH_NOT_AVAILABLE")!;
    expect(issue.path).toBe("bays.0.widthUm");
    expect(issue.message).toBe("Cabinet with one door is not made 30″ wide. It comes in 12″, 18″, 24″.");
    expect(issue.nearest).toEqual([inch(24)]);
  });

  it("rejects a finish that belongs to a different material", async () => {
    const result = await check(finishMaterialMismatch);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ code: "FINISH_MATERIAL_MISMATCH", path: "finishCode" });
    expect(result.issues[0].message).toContain("Slate is a painted panel finish");
    expect(result.issues[0].message).toContain("Clear oak or Dark oak");
  });
});

describe("validation: dimensions, counts and options", () => {
  it("flags a width between steps", async () => {
    // 12 + 18 + 18 + 24 = 72 is allowed for Model B; make it 75 with an impossible bay to test the step check in isolation.
    const engine = ledger;
    const selection = { ...validTvConsole, bays: [...validTvConsole.bays] };
    selection.bays[0] = { moduleCode: "LED-DOOR", widthUm: inch(18) + inch(3), count: 1 };
    const result = validateSelection(engine.catalog, engine.rules, selection);
    const issue = result.issues.find((i) => i.code === "WIDTH_OFF_STEP")!;
    expect(issue.nearest).toEqual([inch(78), inch(84)]);
    expect(issue.message).toContain("between sizes");
  });

  it("refuses a different height or depth and explains they are fixed", async () => {
    const result = await check({ ...validTvConsole, heightUm: inch(24), depthUm: inch(18) });
    expect(result.issues.map((i) => [i.code, i.path])).toEqual([
      ["DIMENSION_FIXED", "dimensions.height"],
      ["DIMENSION_FIXED", "dimensions.depth"],
    ]);
    expect(result.issues[0].message).toContain("Height is fixed at 20″");
    // Sending the template's own height is not an error.
    expect((await check({ ...validTvConsole, heightUm: inch(20), depthUm: inch(16) })).valid).toBe(true);
  });

  it("checks bay count, unit count and unknown modules", async () => {
    expect(await codes({ ...validTvConsole, bays: [validTvConsole.bays[3]] })).toContain("BAY_COUNT_OUT_OF_RANGE");
    const tooManyDrawers = { ...validTvConsole, bays: validTvConsole.bays.map((b) => ({ ...b })) };
    tooManyDrawers.bays[3].count = 5;
    const result = await check(tooManyDrawers);
    expect(result.issues[0]).toMatchObject({ code: "MODULE_COUNT_OUT_OF_RANGE", path: "bays.3.count" });
    expect(result.issues[0].message).toBe("Drawer bay takes 1 to 2 drawers. Bay 4 has 5.");
    const foreign = { ...validTvConsole, bays: validTvConsole.bays.map((b) => ({ ...b })) };
    foreign.bays[0].moduleCode = "TAL-OPEN";
    expect((await check(foreign)).issues[0]).toMatchObject({ code: "MODULE_NOT_AVAILABLE", path: "bays.0.moduleCode" });
  });

  it("checks base, handle, finish availability and accessories", async () => {
    expect(await codes({ ...validTvConsole, base: "wall" })).toContain("BASE_NOT_AVAILABLE");
    expect(await codes({ ...validTvConsole, handleSku: "HDL-NOPE" })).toEqual(["HANDLE_NOT_AVAILABLE"]);
    expect(await codes({ ...validTvConsole, handleSku: null })).toEqual([]);
    // Smoked birch exists but Ledger is not offered in it.
    expect(await codes({ ...validTvConsole, materialCode: "MAT-BIRCH-PLY", finishCode: "FIN-BIRCH-SMOKE" })).toEqual([
      "MATERIAL_NOT_AVAILABLE",
      "FINISH_NOT_AVAILABLE",
    ]);
    expect(await codes({ ...validTvConsole, accessories: [{ sku: "ACC-CABLE-GROMMET", quantity: 5 }] })).toEqual([
      "ACCESSORY_QUANTITY_TOO_HIGH",
    ]);
    expect(
      await codes({
        ...validTvConsole,
        accessories: [
          { sku: "ACC-LEVELLERS", quantity: 1 },
          { sku: "ACC-LEVELLERS", quantity: 1 },
        ],
      }),
    ).toEqual(["ACCESSORY_DUPLICATED"]);
    // Not offered for Ledger, and a wall rail on a piece with legs also breaks a rule.
    expect(await codes({ ...validTvConsole, accessories: [{ sku: "ACC-WALL-RAIL", quantity: 1 }] })).toEqual([
      "ACCESSORY_NOT_AVAILABLE",
      "RULE_RAIL_ONLY_ON_WALL",
    ]);
  });

  it("reports several problems at once, each with its own path", async () => {
    const result = await check({ ...incompatibleDoor, finishCode: "FIN-PAINT-SLATE", base: "floor" });
    expect(new Set(result.issues.map((i) => i.path))).toEqual(new Set(["bays.0.widthUm", "finishCode", "base"]));
  });
});

describe("validation: compatibility rules stored as data", () => {
  it("limits drawer bays on a Ledger console (count rule)", async () => {
    const selection: Selection = {
      ...validTvConsole,
      templateCode: "TPL-LEDGER-B",
      bays: [
        { moduleCode: "LED-DRAWERS", widthUm: inch(24), count: 2 },
        { moduleCode: "LED-DRAWERS", widthUm: inch(24), count: 2 },
        { moduleCode: "LED-DRAWERS", widthUm: inch(24), count: 2 },
      ],
    };
    const result = await check(selection);
    expect(result.issues).toEqual([
      { code: "RULE_LEDGER_MAX_DRAWER_BAYS", path: "bays", message: "A Ledger console can have at most two drawer bays." },
    ]);
  });

  it("requires a plinth above 96 inches (excludes rule on width)", async () => {
    const engine = ledger;
    const wide = defaultSelection(engine.catalog, "TPL-LEDGER-C");
    const fitted = fitBaysToWidth(engine.catalog, wide.templateCode, wide.bays, inch(102));
    expect(fitted.ok).toBe(true);
    if (!fitted.ok) return;
    const onLegs = validateSelection(engine.catalog, engine.rules, { ...wide, bays: fitted.bays });
    expect(onLegs.issues.map((i) => [i.code, i.path])).toEqual([["RULE_NO_LEGS_OVER_96", "base"]]);
    expect(validateSelection(engine.catalog, engine.rules, { ...wide, bays: fitted.bays, base: "plinth" }).valid).toBe(true);
  });

  it("requires the wall rail on wall-hung pieces and forbids it elsewhere (requires rules)", async () => {
    const span = (await loadEngineCatalog(handle.db, "span-wall-console"))!;
    const selection = defaultSelection(span.catalog, "TPL-SPAN-A");
    expect(selection.accessories).toEqual([{ sku: "ACC-WALL-RAIL", quantity: 1 }]);
    expect(validateSelection(span.catalog, span.rules, selection).valid).toBe(true);
    const withoutRail = validateSelection(span.catalog, span.rules, { ...selection, accessories: [] });
    expect(withoutRail.issues).toEqual([
      { code: "RULE_WALL_NEEDS_RAIL", path: "accessories", message: "Wall-hung pieces need the wall rail. Add it under accessories." },
    ]);
  });

  it("applies a material and handle exclusion", async () => {
    const result = await check({ ...validBookshelf, handleSku: "HDL-EDGE" });
    expect(result.issues.map((i) => [i.code, i.path])).toEqual([["RULE_NO_EDGE_PULL_ON_BIRCH", "handleSku"]]);
  });

  it("requires exactly one knee space on a desk", async () => {
    const desk = (await loadEngineCatalog(handle.db, "brief-desk"))!;
    const selection = defaultSelection(desk.catalog, "TPL-BRIEF-B");
    const noKnee = { ...selection, bays: selection.bays.map((b) => (b.moduleCode === "BRF-KNEE" ? { moduleCode: "BRF-DOOR", widthUm: inch(18), count: 1 } : b)) };
    expect(validateSelection(desk.catalog, desk.rules, noKnee).issues.map((i) => i.code)).toContain("RULE_DESK_ONE_KNEE_SPACE");
  });

  it("stops applying a rule when it is deactivated in the database", async () => {
    await handle.db.update(compatibilityRules).set({ isActive: false }).where(eq(compatibilityRules.code, "NO_EDGE_PULL_ON_BIRCH"));
    expect((await check({ ...validBookshelf, handleSku: "HDL-EDGE" })).valid).toBe(true);
    await handle.db.update(compatibilityRules).set({ isActive: true }).where(eq(compatibilityRules.code, "NO_EDGE_PULL_ON_BIRCH"));
  });
});

describe("changing the overall width", () => {
  const start = () => defaultSelection(ledger.catalog, "TPL-LEDGER-B");

  it("widens and narrows by stepping bays to their next size", () => {
    const wider = fitBaysToWidth(ledger.catalog, "TPL-LEDGER-B", start().bays, inch(90));
    expect(wider.ok && wider.bays.map((b) => b.widthUm / inch(1))).toEqual([24, 24, 18, 24]);
    const narrower = fitBaysToWidth(ledger.catalog, "TPL-LEDGER-B", start().bays, inch(66));
    expect(narrower.ok && overallWidth(narrower.bays)).toBe(inch(66));
    // The 24″ drawer bay shrinks first; drawers stop at 18″, so the next step comes from a door bay.
    expect(narrower.ok && narrower.bays.map((b) => b.widthUm / inch(1))).toEqual([18, 18, 12, 18]);
  });

  it("produces a layout that validates at every allowed width of every template", async () => {
    for (const product of sampleProducts) {
      const engine = (await loadEngineCatalog(handle.db, product.slug))!;
      for (const template of engine.catalog.templates) {
        for (let w = template.minWidthUm; w <= template.maxWidthUm; w += template.widthIncrementUm) {
          const base = defaultSelection(engine.catalog, template.code);
          const fitted = fitBaysToWidth(engine.catalog, template.code, base.bays, w);
          expect(fitted.ok, `${template.code} at ${w / inch(1)}″`).toBe(true);
          if (!fitted.ok) continue;
          const result = validateSelection(engine.catalog, engine.rules, { ...base, bays: fitted.bays, base: w > inch(96) && template.allowedBases.includes("plinth") ? "plinth" : base.base });
          expect(result.issues, `${template.code} at ${w / inch(1)}″`).toEqual([]);
        }
      }
    }
  });

  it("explains a width that is not offered, with alternatives", () => {
    const result = fitBaysToWidth(ledger.catalog, "TPL-LEDGER-B", start().bays, inch(80));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toMatchObject({ code: "WIDTH_NOT_ALLOWED", nearest: [inch(78), inch(84)] });
    expect(result.issues[0].message).toContain("80″ is not a width this design is made in");
  });

  it("does not mutate the bays it is given", () => {
    const bays = start().bays;
    const copy = structuredClone(bays);
    fitBaysToWidth(ledger.catalog, "TPL-LEDGER-B", bays, inch(90));
    expect(bays).toEqual(copy);
  });
});

describe("resolving a configuration into components", () => {
  it("lists the right SKUs and quantities for the TV console fixture", () => {
    const items = resolveItems(ledger.internals, validTvConsole);
    const total = (sku: string) => items.filter((i) => i.sku === sku).reduce((n, i) => n + i.quantity, 0);
    expect(total("LED-TOP")).toBe(1);
    expect(total("LED-BTM")).toBe(1);
    expect(total("LED-SIDE")).toBe(2);
    expect(total("LED-DIV")).toBe(3);
    expect(total("LED-BACK")).toBe(4);
    expect(total("LEG-150")).toBe(4);
    expect(total("LED-PLINTH")).toBe(0);
    expect(total("LED-DOOR")).toBe(3);
    expect(total("HW-HINGE")).toBe(6);
    expect(total("LED-SHELF")).toBe(3);
    expect(total("LED-DRW-BOX")).toBe(2);
    expect(total("LED-DRW-FRONT")).toBe(2);
    expect(total("HW-RUNNER")).toBe(2);
    expect(total("HDL-BAR")).toBe(5);
    expect(total("ACC-CABLE-GROMMET")).toBe(2);
    expect(total("HW-PACK-BAY")).toBe(4);

    const top = items.find((i) => i.sku === "LED-TOP")!;
    expect(top).toMatchObject({ source: "carcass", cutLengthUm: inch(78), finishCode: "FIN-OAK-CLEAR" });
    const front = items.find((i) => i.sku === "LED-DRW-FRONT")!;
    expect(front).toMatchObject({ source: "bay", bayIndex: 3, moduleCode: "LED-DRAWERS", cutLengthUm: inch(24) });
    // Hardware is not finished.
    expect(items.find((i) => i.sku === "HW-HINGE")!.finishCode).toBeNull();
    // A drawer front never appears without its drawer box.
    expect(total("LED-DRW-FRONT")).toBe(total("LED-DRW-BOX"));
  });

  it("swaps legs for a plinth and omits handles when none are chosen", () => {
    const items = resolveItems(ledger.internals, { ...validTvConsole, base: "plinth", handleSku: null });
    expect(items.some((i) => i.sku === "LEG-150")).toBe(false);
    expect(items.find((i) => i.sku === "LED-PLINTH")).toMatchObject({ quantity: 1, cutLengthUm: inch(78) });
    expect(items.some((i) => i.sku.startsWith("HDL-"))).toBe(false);
  });

  it("cuts paired doors to half the bay width", async () => {
    const hold = (await loadEngineCatalog(handle.db, "hold-wardrobe"))!;
    const items = resolveItems(hold.internals, defaultSelection(hold.catalog, "TPL-HOLD-A"));
    expect(items.find((i) => i.sku === "HLD-DOOR")).toMatchObject({ quantity: 2, cutLengthUm: inch(20) });
  });
});

describe("saving, reloading, duplicating and sharing", () => {
  const alice = "session-alice-0123456789";
  const bob = "session-bob-0123456789";

  it("saves a valid configuration with its versions and component list, and reloads it unchanged", async () => {
    const saved = await saveConfiguration(handle.db, { selection: validTvConsole, sessionId: alice });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const loaded = (await getOwnedConfiguration(handle.db, saved.id, alice))!;
    expect(loaded.selection).toEqual(validTvConsole);
    expect(loaded).toMatchObject({
      name: "Ledger media console, Model B",
      productSlug: "ledger-media-console",
      templateVersion: 1,
      ruleSetVersion: 1,
      widthUm: inch(78),
      heightUm: inch(20),
      depthUm: inch(16),
    });
    const items = await listConfigurationItems(handle.db, saved.id);
    expect(items.map((i) => i.lineNo)).toEqual(items.map((_, i) => i + 1));
    expect(items.find((i) => i.sku === "LED-DOOR")).toMatchObject({ componentRevision: 1, finishCode: "FIN-OAK-CLEAR" });
    expect(items).toHaveLength(resolveItems(ledger.internals, validTvConsole).length);
  });

  it("refuses to save an invalid configuration and writes nothing", async () => {
    const before = (await handle.db.select().from(configurations)).length;
    const result = await saveConfiguration(handle.db, { selection: invalidDimension, sessionId: alice });
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(!result.ok && result.reason === "invalid" && result.validation.issues[0].code).toBe("WIDTH_OUT_OF_RANGE");
    expect((await handle.db.select().from(configurations)).length).toBe(before);
    expect(await saveConfiguration(handle.db, { selection: { ...validTvConsole, productSlug: "nope" }, sessionId: alice })).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("ignores caller-supplied height and depth when storing", async () => {
    const saved = await saveConfiguration(handle.db, { selection: { ...validTvConsole, heightUm: inch(20) }, sessionId: alice });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const loaded = (await getOwnedConfiguration(handle.db, saved.id, alice))!;
    expect(loaded.selection).not.toHaveProperty("heightUm");
    expect(loaded.heightUm).toBe(inch(20));
  });

  it("keeps configurations private to the session that saved them", async () => {
    const saved = await saveConfiguration(handle.db, { selection: validBookshelf, sessionId: alice, name: "  Hallway   shelves " });
    if (!saved.ok) throw new Error("save failed");
    expect((await getOwnedConfiguration(handle.db, saved.id, alice))!.name).toBe("Hallway shelves");
    expect(await getOwnedConfiguration(handle.db, saved.id, bob)).toBeNull();
    expect((await listOwnedConfigurations(handle.db, bob)).length).toBe(0);
    expect((await listOwnedConfigurations(handle.db, alice)).map((c) => c.id)).toContain(saved.id);
    // Another session cannot overwrite or duplicate it.
    expect(await saveConfiguration(handle.db, { selection: validBookshelf, sessionId: bob, replaceId: saved.id })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await duplicateConfiguration(handle.db, saved.id, bob)).toEqual({ ok: false, reason: "not_found" });
  });

  it("shares by token without exposing anything about the owner", async () => {
    const saved = await saveConfiguration(handle.db, { selection: validBookshelf, sessionId: alice });
    if (!saved.ok) throw new Error("save failed");
    expect(saved.shareToken.length).toBeGreaterThanOrEqual(32);
    const shared = (await getSharedConfiguration(handle.db, saved.shareToken))!;
    expect(shared.selection).toEqual(validBookshelf);
    const json = JSON.stringify(shared);
    expect(json).not.toContain(alice);
    expect(json).not.toContain(hashSession(alice));
    expect(await getSharedConfiguration(handle.db, "not-a-token")).toBeNull();
    // The raw session id is never stored.
    const [row] = await handle.db.select().from(configurations).where(eq(configurations.id, saved.id));
    expect(row.ownerSessionHash).toBe(hashSession(alice));
  });

  it("updates in place and replaces the component list", async () => {
    const saved = await saveConfiguration(handle.db, { selection: validTvConsole, sessionId: alice });
    if (!saved.ok) throw new Error("save failed");
    const changed = { ...validTvConsole, base: "plinth" as const, handleSku: null };
    const updated = await saveConfiguration(handle.db, { selection: changed, sessionId: alice, replaceId: saved.id });
    expect(updated).toMatchObject({ ok: true, id: saved.id, shareToken: saved.shareToken });
    const items = await listConfigurationItems(handle.db, saved.id);
    expect(items.some((i) => i.sku === "LED-PLINTH")).toBe(true);
    expect(items.some((i) => i.sku === "LEG-150" || i.sku === "HDL-BAR")).toBe(false);
  });

  it("duplicates as an independent copy", async () => {
    const saved = await saveConfiguration(handle.db, { selection: validTvConsole, sessionId: alice, name: "Living room" });
    if (!saved.ok) throw new Error("save failed");
    const copy = await duplicateConfiguration(handle.db, saved.id, alice);
    expect(copy.ok).toBe(true);
    if (!copy.ok) return;
    expect(copy.id).not.toBe(saved.id);
    expect(copy.shareToken).not.toBe(saved.shareToken);
    const loaded = (await getOwnedConfiguration(handle.db, copy.id, alice))!;
    expect(loaded.name).toBe("Living room (copy)");
    expect(loaded.selection).toEqual(validTvConsole);
  });

  it("detects when a saved configuration no longer fits the current catalog, without changing it", async () => {
    const saved = await saveConfiguration(handle.db, { selection: validTvConsole, sessionId: alice });
    if (!saved.ok) throw new Error("save failed");
    await handle.db.update(designTemplates).set({ maxWidthUm: inch(72), defaultWidthUm: inch(72), version: 2 }).where(eq(designTemplates.code, "TPL-LEDGER-B"));
    const loaded = (await getOwnedConfiguration(handle.db, saved.id, alice))!;
    expect(loaded.selection).toEqual(validTvConsole);
    expect(loaded.templateVersion).toBe(1);
    const now = (await revalidate(handle.db, loaded.selection))!;
    expect(now.valid).toBe(false);
    expect(now.templateVersion).toBe(2);
    expect(now.issues[0].code).toBe("WIDTH_OUT_OF_RANGE");
    await handle.db.update(designTemplates).set({ maxWidthUm: inch(90), defaultWidthUm: inch(78), version: 1 }).where(eq(designTemplates.code, "TPL-LEDGER-B"));
  });
});
