import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { z } from "zod";

/** Shared helpers for route handlers: sessions, origin checks, rate limits, JSON errors. */

export const SESSION_COOKIE = "mfs_sid";
const SESSION_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;

/** The anonymous session id, if this browser has one. Safe to call from pages. */
export async function readSessionId(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value && SESSION_PATTERN.test(value) ? value : null;
}

/** Read or create the anonymous session id. Route handlers only (it sets a cookie). */
export async function ensureSessionId(): Promise<string> {
  const existing = await readSessionId();
  if (existing) return existing;
  const id = randomBytes(32).toString("base64url");
  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_INSECURE !== "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** Consistent error body: { error: { code, message }, ...extra }. */
export function fail(status: number, code: string, message: string, extra: Record<string, unknown> = {}): Response {
  return json({ error: { code, message }, ...extra }, status);
}

/**
 * Reject cross-site state-changing requests. Browsers always send Origin on
 * POST/PUT; a request whose Origin does not match the Host is refused.
 */
export function crossSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

// Fixed-window counter per client and bucket. In-memory: adequate for a single
// instance; replace with a shared store before running several instances.
const windows = new Map<string, { start: number; count: number }>();
export function rateLimited(request: Request, bucket: string, limit: number, windowMs = 60_000): boolean {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${bucket}:${client}`;
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || now - entry.start >= windowMs) {
    if (windows.size > 10_000) windows.clear();
    windows.set(key, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

/** Common guard + body parsing for JSON write endpoints. */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
  limit: { bucket: string; perMinute: number },
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  if (crossSite(request)) return { ok: false, response: fail(403, "CROSS_SITE", "This request was not sent from this site.") };
  if (rateLimited(request, limit.bucket, limit.perMinute)) {
    return {
      ok: false,
      response: json({ error: { code: "RATE_LIMITED", message: "Too many requests. Wait a minute and try again." } }, 429, {
        "Retry-After": "60",
      }),
    };
  }
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    return { ok: false, response: fail(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request body as JSON.") };
  }
  const text = await request.text();
  if (text.length > 20_000) return { ok: false, response: fail(413, "TOO_LARGE", "The request is too large.") };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, response: fail(400, "INVALID_JSON", "The request body is not valid JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: fail(400, "INVALID_REQUEST", "The request is missing fields or has values of the wrong type.", {
        fields: parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message })),
      }),
    };
  }
  return { ok: true, data: parsed.data };
}

export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** The origin the visitor is using, for building links they can share. */
export async function requestOrigin(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
