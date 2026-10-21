/**
 * The visitor's address, for rate limiting only (VP-SEC-003). On Cloudflare
 * `cf-connecting-ip` is set by the edge itself and cannot be forged by the
 * client. Only a syntactically valid address is returned, so nothing an
 * attacker types can reach the database through it.
 */
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6 = /^[0-9a-f:.]{2,45}$/i;

export function clientIp(headers: Headers): string | null {
  const v = headers.get("cf-connecting-ip")?.trim();
  if (!v) return null;
  return IPV4.test(v) || (v.includes(":") && IPV6.test(v)) ? v : null;
}

/**
 * HMAC-SHA256 of the address (VP-LEAD-001: keep a hash, never the address),
 * keyed with a server-only secret so the small IPv4 space cannot be
 * brute-forced back from the database. Null without an address or a key.
 */
export async function hashIp(ip: string | null, key: string | undefined): Promise<string | null> {
  if (!ip || !key) return null;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`vp-ip-v1:${ip}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
