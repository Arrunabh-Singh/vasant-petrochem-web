import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Generic signed, opaque bearer ticket: base64url(JSON payload) + "." +
 * base64url(HMAC-SHA256 of the payload). Used wherever a non-Supabase-
 * session caller (the office box, an edge gateway) needs to prove it was
 * authorized by an admin session, without a long-lived credential sitting
 * on the calling machine. lib/upload-ticket.ts and lib/device-ticket.ts
 * are thin, differently-scoped wrappers over this — same mechanism, each
 * with its own secret so a leak in one domain can't forge the other.
 */
function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Plain HMAC-SHA256 of a string, hex-encoded — for signing a value directly rather than wrapping it as a bearer ticket. */
export function hmacHex(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

export function mintHmacTicket<T extends object>(payload: T, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyHmacTicket<T extends { exp?: number }>(ticket: string, secret: string): T | null {
  const [body, sig] = ticket.split(".");
  if (!body || !sig) return null;

  const expected = b64url(createHmac("sha256", secret).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
