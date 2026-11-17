import { z } from "zod";
import { selectionSchema } from "@/lib/configuration/types";
import { loadEngineCatalog } from "@/server/configuration/catalog";
import { validateSelection } from "@/server/configuration/engine";
import { getDb } from "@/server/db/client";
import { fail, json, readJson } from "@/server/http";

const bodySchema = z.object({ selection: selectionSchema });

/** Validate a selection. Always 200 with { valid, issues, ... } when the product exists. */
export async function POST(request: Request) {
  const body = await readJson(request, bodySchema, { bucket: "validate", perMinute: 240 });
  if (!body.ok) return body.response;
  const engine = await loadEngineCatalog(await getDb(), body.data.selection.productSlug);
  if (!engine) return fail(404, "PRODUCT_NOT_CONFIGURABLE", "This product cannot be configured.");
  return json(validateSelection(engine.catalog, engine.rules, body.data.selection));
}
