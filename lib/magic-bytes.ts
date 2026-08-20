/**
 * audit.md M8: client-declared MIME type is spoofable. Verify the actual
 * file signature before trusting it — used by both the product TDS
 * upload (PDF only) and the document vault (PDF/JPEG/PNG/TIFF).
 */
const SIGNATURES: { mimeType: string; bytes: number[] }[] = [
  { mimeType: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mimeType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mimeType: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: "image/tiff", bytes: [0x49, 0x49, 0x2a, 0x00] }, // little-endian
  { mimeType: "image/tiff", bytes: [0x4d, 0x4d, 0x00, 0x2a] }, // big-endian
];

function matches(head: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, i) => head[i] === byte);
}

/** Returns the detected MIME type from magic bytes, or null if none match. */
export function detectMimeType(head: Uint8Array): string | null {
  return SIGNATURES.find((sig) => matches(head, sig.bytes))?.mimeType ?? null;
}

export async function readHead(file: File, length = 8): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, length).arrayBuffer());
}
