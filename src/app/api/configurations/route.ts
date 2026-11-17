import { z } from "zod";
import { selectionSchema } from "@/lib/configuration/types";
import { saveConfiguration } from "@/server/configuration/store";
import { getDb } from "@/server/db/client";
import { ensureSessionId, fail, json, readJson } from "@/server/http";

const saveBodySchema = z.object({ selection: selectionSchema, name: z.string().max(200).optional() });

/** Save a new configuration for this browser session. Only valid configurations are stored. */
export async function POST(request: Request) {
  const body = await readJson(request, saveBodySchema, { bucket: "save", perMinute: 30 });
  if (!body.ok) return body.response;
  const sessionId = await ensureSessionId();
  const result = await saveConfiguration(await getDb(), { ...body.data, sessionId });
  if (result.ok) return json({ id: result.id, shareToken: result.shareToken, validation: result.validation }, 201);
  if (result.reason === "not_found") return fail(404, "PRODUCT_NOT_CONFIGURABLE", "This product cannot be configured.");
  return fail(422, "CONFIGURATION_INVALID", "This configuration cannot be built as it stands, so it was not saved.", {
    validation: result.validation,
  });
}
