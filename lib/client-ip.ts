import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/**
 * The visitor's address for rate limiting (VP-SEC-003).
 *
 * Production traffic is Cloudflare -> Vercel, so `x-forwarded-for` /
 * `x-real-ip` carry a Cloudflare edge address, shared by unrelated visitors.
 * `cf-connecting-ip` is the real client, set by Cloudflare itself.
 *
 * ponytail: a request that reaches the Vercel origin directly (bypassing
 * Cloudflare) can forge `cf-connecting-ip`, so this is a soft per-IP key.
 * The per-email cap and the Cloudflare rate-limit rule do not depend on it.
 * Only syntactically valid addresses are returned, so the `ip` column can
 * never be filled with arbitrary attacker text.
 */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v && isIP(v)) return v;
  }
  return null;
}

/**
 * HMAC-SHA256 of the visitor address (VP-LEAD-001: we keep a hash, not the
 * address). Keyed with a server-only secret so the small IPv4 space cannot be
 * brute-forced back from the database. Returns null when there is no address
 * or no key; callers then fall back to the raw address, so rate limiting keeps
 * working before the key exists.
 */
export function hashIp(ip: string | null, key: string | undefined): string | null {
  if (!ip || !key) return null;
  return createHmac("sha256", key).update(`vp-ip-v1:${ip}`).digest("hex");
}
