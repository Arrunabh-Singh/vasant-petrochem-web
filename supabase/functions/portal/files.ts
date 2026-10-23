// The portal function's pure parts: no Deno or Node APIs, so the hub's tests
// can check them against lib/crypto.ts (test/portal-files.test.mts).

export const MAX_KYC_BYTES = 10 * 1024 * 1024;

export type FileType = { mime: "application/pdf" | "image/png" | "image/jpeg"; ext: "pdf" | "png" | "jpg" };

const starts = (bytes: Uint8Array, prefix: number[]) => prefix.every((b, i) => bytes[i] === b);

/** What a file really is, from its first bytes; the browser's claim is never used. */
export function sniff(bytes: Uint8Array): FileType | null {
  if (starts(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", ext: "pdf" }; // %PDF-
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (starts(bytes, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  return null;
}

/**
 * The vault's envelope, as lib/crypto.ts writes it: nonce(12) ‖ tag(16) ‖
 * ciphertext, AES-256-GCM, with "docId:version:class" as additional data.
 * Web Crypto wants the tag after the ciphertext. Throws if anything is off.
 */
export async function decryptDoc(blob: Uint8Array, keyBase64: string, docId: string, version: number, docClass: string): Promise<Uint8Array<ArrayBuffer>> {
  const raw = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const sealed = new Uint8Array(blob.length - 12);
  sealed.set(blob.subarray(28));
  sealed.set(blob.subarray(12, 28), blob.length - 28);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: blob.slice(0, 12), additionalData: new TextEncoder().encode(`${docId}:${version}:${docClass}`), tagLength: 128 },
    key,
    sealed,
  );
  return new Uint8Array(plain);
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data.slice()));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The HTTP status for an error a portal function raised, by its SQLSTATE. */
export function httpStatus(code: string | undefined): number {
  switch (code) {
    case "28000": return 401; // sign in again, or confirm with the authenticator app (see the hint)
    case "42501": return 403;
    case "P0002": return 404;
    case "23505": return 409;
    case "53400": return 429;
    case "22023": case "23514": case "22P02": case "22007": case "22008": return 400;
    default: return 502;
  }
}

/** A file name safe for Content-Disposition. */
export const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
