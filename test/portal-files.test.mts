import { test } from "node:test";
import assert from "node:assert/strict";
import { encryptDoc, sha256Hex as nodeSha256 } from "../lib/crypto.ts";
import { decryptDoc, httpStatus, safeName, sha256Hex, sniff } from "../supabase/functions/portal/files.ts";

const KEY = Buffer.alloc(32, 7).toString("base64");

test("the portal function decrypts what the hub's vault encrypts", async () => {
  const plain = Buffer.from("%PDF-1.7 a sales bill", "utf8");
  const blob = encryptDoc(plain, KEY, "doc-1", 2, "sales-bills");
  const out = await decryptDoc(new Uint8Array(blob), KEY, "doc-1", 2, "sales-bills");
  assert.deepEqual(Buffer.from(out), plain);
  assert.equal(await sha256Hex(out), nodeSha256(plain));
});

test("a different document, version, class or key does not decrypt", async () => {
  const blob = new Uint8Array(encryptDoc(Buffer.from("x"), KEY, "doc-1", 1, "gst"));
  await assert.rejects(decryptDoc(blob, KEY, "doc-2", 1, "gst"));
  await assert.rejects(decryptDoc(blob, KEY, "doc-1", 2, "gst"));
  await assert.rejects(decryptDoc(blob, KEY, "doc-1", 1, "bank"));
  await assert.rejects(decryptDoc(blob, Buffer.alloc(32, 9).toString("base64"), "doc-1", 1, "gst"));
});

test("a file's type comes from its first bytes", () => {
  assert.equal(sniff(new TextEncoder().encode("%PDF-1.4"))?.ext, "pdf");
  assert.equal(sniff(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime, "image/png");
  assert.equal(sniff(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.ext, "jpg");
  assert.equal(sniff(new TextEncoder().encode("<html><script>")), null);
  assert.equal(sniff(new TextEncoder().encode("%PDF")), null);
});

test("database errors become the right HTTP status", () => {
  assert.equal(httpStatus("28000"), 401);
  assert.equal(httpStatus("42501"), 403);
  assert.equal(httpStatus("P0002"), 404);
  assert.equal(httpStatus("23514"), 400);
  assert.equal(httpStatus("53400"), 429);
  assert.equal(httpStatus(undefined), 502);
});

test("download names cannot break the header", () => {
  assert.equal(safeName('Test "report".pdf\r\nX: y'), "Test__report_.pdf__X__y");
  assert.equal(safeName(""), "file");
});
