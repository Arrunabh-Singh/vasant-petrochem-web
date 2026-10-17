/**
 * VP-SEC-004: three free layers in front of the public forms.
 *   1. honeypot field            (checked by each action, silent drop)
 *   2. minimum time-to-submit    (checkTiming)
 *   3. Cloudflare Turnstile      (verifyTurnstile, verified server-side)
 * All checks run on the server; the widget and hidden fields are just inputs.
 */

/** A human cannot read and fill a form faster than this. */
export const MIN_FILL_MS = 3000;
/** A form left open longer than this is stale; make the visitor start over. */
export const MAX_FILL_MS = 24 * 60 * 60 * 1000;

/**
 * `startedAt` is the page-load time (ms since epoch) the client wrote into a
 * hidden field. ponytail: a script can forge this field; the Turnstile layer
 * is what stops scripts, this layer only stops naive ones that never loaded
 * the page. Upgrade path: bind it to the server-issued Turnstile challenge_ts.
 */
export function checkTiming(startedAt: unknown, now: number = Date.now()): boolean {
  if (typeof startedAt !== "string" || !/^\d{10,15}$/.test(startedAt)) return false;
  const elapsed = now - Number(startedAt);
  return elapsed >= MIN_FILL_MS && elapsed <= MAX_FILL_MS;
}

export type TurnstileResult = { ok: true; skipped?: boolean } | { ok: false; reason: string };

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Env-gated: with no TURNSTILE_SECRET_KEY the layer is skipped (so the site
 * keeps working before the owner creates the widget) — which means it gives
 * NO protection until the secret is set. With a secret it fails closed:
 * missing/invalid token, a Cloudflare error, or a timeout all reject.
 */
export async function verifyTurnstile(
  token: unknown,
  opts: { secret?: string; fetchImpl?: typeof fetch } = {},
): Promise<TurnstileResult> {
  const secret = "secret" in opts ? opts.secret : process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: "missing token" };
  }
  try {
    const res = await (opts.fetchImpl ?? fetch)(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: `siteverify HTTP ${res.status}` };
    const body = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    return body.success === true ? { ok: true } : { ok: false, reason: (body["error-codes"] ?? []).join(",") || "rejected" };
  } catch (err) {
    return { ok: false, reason: `siteverify failed: ${err instanceof Error ? err.name : "error"}` };
  }
}

/** Layers 2 and 3 for a submitted form. Returns a visitor-safe message, or null to proceed. */
export async function botCheck(formData: FormData): Promise<string | null> {
  if (!checkTiming(formData.get("startedAt"))) {
    return "That was very quick — please check your details and submit again.";
  }
  const turnstile = await verifyTurnstile(formData.get("cf-turnstile-response"));
  if (!turnstile.ok) {
    console.warn("bot-defence: turnstile rejected a submission:", turnstile.reason);
    return "We couldn't verify you're human. Please reload the page and try again, or call us.";
  }
  return null;
}
