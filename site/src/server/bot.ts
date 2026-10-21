/**
 * VP-SEC-004, ported from the hub's lib/bot-defence.ts: a honeypot (checked by
 * each endpoint, silent drop), a time-to-submit window, and Cloudflare
 * Turnstile verified on the server.
 */
export const MIN_FILL_MS = 3000;
export const MAX_FILL_MS = 24 * 60 * 60 * 1000;

/** ponytail: a script can forge `startedAt`; Turnstile is what stops scripts, this stops naive ones. */
export function checkTiming(startedAt: unknown, now: number = Date.now()): boolean {
  if (typeof startedAt !== "string" || !/^\d{10,15}$/.test(startedAt)) return false;
  const elapsed = now - Number(startedAt);
  return elapsed >= MIN_FILL_MS && elapsed <= MAX_FILL_MS;
}

export type TurnstileResult = { ok: true; skipped?: boolean } | { ok: false; reason: string };

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * With no secret the layer is skipped (so the site works before the owner
 * creates the widget), which means no protection until it is set. With a
 * secret it fails closed: a missing or invalid token, an error or a timeout
 * all reject.
 */
export async function verifyTurnstile(
  token: unknown,
  secret: string | undefined,
  opts: { ip?: string | null; fetchImpl?: typeof fetch } = {},
): Promise<TurnstileResult> {
  if (!secret) return { ok: true, skipped: true };
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return { ok: false, reason: "missing token" };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (opts.ip) body.set("remoteip", opts.ip);
    const res = await (opts.fetchImpl ?? fetch)(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: `siteverify HTTP ${res.status}` };
    const out = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    return out.success === true ? { ok: true } : { ok: false, reason: (out["error-codes"] ?? []).join(",") || "rejected" };
  } catch (err) {
    return { ok: false, reason: `siteverify failed: ${err instanceof Error ? err.name : "error"}` };
  }
}
