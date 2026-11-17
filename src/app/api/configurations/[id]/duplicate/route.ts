import { z } from "zod";
import { duplicateConfiguration } from "@/server/configuration/store";
import { getDb } from "@/server/db/client";
import { fail, isUuid, json, readJson, readSessionId } from "@/server/http";

/** Copy a configuration owned by this browser session. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await readJson(request, z.object({}).passthrough(), { bucket: "save", perMinute: 30 });
  if (!body.ok) return body.response;
  const { id } = await params;
  const sessionId = await readSessionId();
  const notFound = () => fail(404, "CONFIGURATION_NOT_FOUND", "This saved design was not found for this browser.");
  if (!isUuid(id) || !sessionId) return notFound();
  const result = await duplicateConfiguration(await getDb(), id, sessionId);
  if (result.ok) return json({ id: result.id, shareToken: result.shareToken }, 201);
  if (result.reason === "not_found") return notFound();
  return fail(422, "CONFIGURATION_INVALID", "This design no longer fits the current catalog, so it was not copied. Open it to fix it.", {
    validation: result.validation,
  });
}
