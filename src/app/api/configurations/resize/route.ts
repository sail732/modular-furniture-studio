import { z } from "zod";
import { selectionSchema } from "@/lib/configuration/types";
import { loadEngineCatalog } from "@/server/configuration/catalog";
import { fitBaysToWidth } from "@/server/configuration/engine";
import { getDb } from "@/server/db/client";
import { fail, json, readJson } from "@/server/http";

const bodySchema = z.object({
  selection: selectionSchema,
  targetWidthUm: z.number().int().positive().max(10_000_000),
});

/** Refit the bays to a requested overall width, or explain why that width is not possible. */
export async function POST(request: Request) {
  const body = await readJson(request, bodySchema, { bucket: "resize", perMinute: 120 });
  if (!body.ok) return body.response;
  const { selection, targetWidthUm } = body.data;
  const engine = await loadEngineCatalog(await getDb(), selection.productSlug);
  if (!engine) return fail(404, "PRODUCT_NOT_CONFIGURABLE", "This product cannot be configured.");
  return json(fitBaysToWidth(engine.catalog, selection.templateCode, selection.bays, targetWidthUm));
}
