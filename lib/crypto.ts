import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * document-storage-hardening.md §2.4: envelope encryption for the five
 * crown-jewel document classes. Format: nonce(12) ‖ authTag(16) ‖
 * ciphertext. AAD binds the ciphertext to its row (docId:version:class) so
 * it can't be replayed across documents even by an attacker with raw DB
 * access — the T5-relevant property from the threat model.
 */
const ALGORITHM = "aes-256-gcm";
const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function aad(docId: string, version: number, docClass: string): Buffer {
  return Buffer.from(`${docId}:${version}:${docClass}`, "utf8");
}

export function encryptDoc(plaintext: Buffer, keyBase64: string, docId: string, version: number, docClass: string): Buffer {
  const key = Buffer.from(keyBase64, "base64");
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  cipher.setAAD(aad(docId, version, docClass));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([nonce, authTag, ciphertext]);
}

export function decryptDoc(blob: Buffer, keyBase64: string, docId: string, version: number, docClass: string): Buffer {
  const key = Buffer.from(keyBase64, "base64");
  const nonce = blob.subarray(0, NONCE_LENGTH);
  const authTag = blob.subarray(NONCE_LENGTH, NONCE_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = blob.subarray(NONCE_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAAD(aad(docId, version, docClass));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
