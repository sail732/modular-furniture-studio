import { z } from "zod";
import { selectionSchema } from "@/lib/configuration/types";
import { saveConfiguration } from "@/server/configuration/store";
import { getDb } from "@/server/db/client";
import { fail, isUuid, json, readJson, readSessionId } from "@/server/http";

const bodySchema = z.object({ selection: selectionSchema, name: z.string().max(200).optional() });
const notFound = () => fail(404, "CONFIGURATION_NOT_FOUND", "This saved design was not found for this browser.");

/** Update a configuration owned by this browser session. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await readJson(request, bodySchema, { bucket: "save", perMinute: 30 });
  if (!body.ok) return body.response;
  const { id } = await params;
  const sessionId = await readSessionId();
  // Same response whether the id is malformed, unknown or owned by someone else.
  if (!isUuid(id) || !sessionId) return notFound();
  const result = await saveConfiguration(await getDb(), { ...body.data, sessionId, replaceId: id });
  if (result.ok) return json({ id: result.id, shareToken: result.shareToken, validation: result.validation });
  if (result.reason === "not_found") return notFound();
  return fail(422, "CONFIGURATION_INVALID", "This configuration cannot be built as it stands, so it was not saved.", {
    validation: result.validation,
  });
}
