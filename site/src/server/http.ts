/** Request and response helpers for the Worker endpoints. */
import { SITE_URL } from "../lib/company.ts";
export const MAX_BODY = 64 * 1024;

const BASE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...BASE, "Content-Type": "application/json; charset=utf-8", ...headers } });

/** Browsers without JavaScript post the form itself and get a page back; the island asks for JSON. */
export const wantsJson = (request: Request) => (request.headers.get("accept") ?? "").includes("application/json");

export const seeOther = (location: string) => new Response(null, { status: 303, headers: { ...BASE, Location: location } });

/**
 * Forms may only be posted from this site: the Origin header must match the
 * host the request arrived on (production, a preview, or local dev).
 * A missing Origin is refused: every current browser sends one on POST.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

/**
 * The body as text, or null past `max` bytes. The stream is read only up to
 * the cap, so a missing or false Content-Length cannot make the Worker hold a
 * large body in memory.
 */
export async function readText(request: Request, max: number): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

/** The posted fields, from JSON or a urlencoded form; null when unreadable or too large. */
export async function readForm(request: Request, max = MAX_BODY): Promise<Record<string, unknown> | null> {
  const raw = await readText(request, max);
  if (raw === null) return null;
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      const v: unknown = JSON.parse(raw);
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (type.includes("application/x-www-form-urlencoded")) {
    const out: Record<string, string | string[]> = {};
    for (const [k, v] of new URLSearchParams(raw)) {
      const prev = out[k];
      out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
    }
    return out;
  }
  return null;
}

/** The site path a form was sent from, from the Referer of a same-origin post. */
export function sourcePage(request: Request): string {
  try {
    const ref = new URL(request.headers.get("referer") ?? "");
    const path = ref.pathname;
    return ref.origin === new URL(request.url).origin && /^\/(?:quote|source|contact|products\/[a-z0-9-]+)$/.test(path) ? path : "/quote";
  } catch {
    return "/quote";
  }
}

/**
 * Only the live site stores enquiries and sends email. Preview deployments
 * share the live Worker's settings, so a flag alone could not keep a preview
 * from writing to production: anything not served on the live host answers
 * as a dry run.
 */
export const isLive = (request: Request) => new URL(request.url).hostname === new URL(SITE_URL).hostname;
