import type { BaySelection, Issue, Selection, ValidationResult } from "@/lib/configuration/types";

/** Thin client for the configuration API. The server is the authority for every answer. */

async function send<T>(method: "POST" | "PUT", path: string, body: unknown, signal?: AbortSignal) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // fall through with null
  }
  return { status: response.status, data: data as T };
}

export async function validate(selection: Selection, signal: AbortSignal): Promise<ValidationResult | null> {
  const { status, data } = await send<ValidationResult>("POST", "/api/configurations/validate", { selection }, signal);
  return status === 200 ? data : null;
}

export type ResizeResponse = { ok: true; bays: BaySelection[] } | { ok: false; issues: Issue[] };
export async function resize(selection: Selection, targetWidthUm: number): Promise<ResizeResponse | null> {
  const { status, data } = await send<ResizeResponse>("POST", "/api/configurations/resize", { selection, targetWidthUm });
  return status === 200 ? data : null;
}

export type SaveResponse =
  | { kind: "saved"; id: string; shareToken: string }
  | { kind: "invalid"; validation: ValidationResult }
  | { kind: "error"; message: string };

export async function save(selection: Selection, name: string, existingId: string | null): Promise<SaveResponse> {
  type Body = {
    id?: string;
    shareToken?: string;
    validation?: ValidationResult;
    error?: { message: string };
  };
  const { status, data } = existingId
    ? await send<Body>("PUT", `/api/configurations/${existingId}`, { selection, name })
    : await send<Body>("POST", "/api/configurations", { selection, name });
  if ((status === 200 || status === 201) && data?.id && data.shareToken) {
    return { kind: "saved", id: data.id, shareToken: data.shareToken };
  }
  if (status === 422 && data?.validation) return { kind: "invalid", validation: data.validation };
  return { kind: "error", message: data?.error?.message ?? "The design could not be saved. Try again." };
}

export async function duplicate(id: string): Promise<{ id: string } | { message: string }> {
  const { status, data } = await send<{ id?: string; error?: { message: string } }>(
    "POST",
    `/api/configurations/${id}/duplicate`,
    {},
  );
  return status === 201 && data?.id
    ? { id: data.id }
    : { message: data?.error?.message ?? "The design could not be copied. Try again." };
}
