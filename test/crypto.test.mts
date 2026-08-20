import { test } from "node:test";
import assert from "node:assert/strict";
import { encryptDoc, decryptDoc, sha256Hex } from "../lib/crypto.ts";

const KEY = Buffer.alloc(32, 7).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 9).toString("base64");

test("encryptDoc/decryptDoc round-trips", () => {
  const plaintext = Buffer.from("a purchase bill, pretend PDF bytes", "utf8");
  const blob = encryptDoc(plaintext, KEY, "doc-1", 1, "purchase-bills");
  const decrypted = decryptDoc(blob, KEY, "doc-1", 1, "purchase-bills");
  assert.deepEqual(decrypted, plaintext);
});

test("decryptDoc throws when the AAD (docId/version/class) doesn't match", () => {
  const plaintext = Buffer.from("hello", "utf8");
  const blob = encryptDoc(plaintext, KEY, "doc-1", 1, "purchase-bills");
  assert.throws(() => decryptDoc(blob, KEY, "doc-1", 2, "purchase-bills")); // wrong version
  assert.throws(() => decryptDoc(blob, KEY, "doc-2", 1, "purchase-bills")); // wrong docId
  assert.throws(() => decryptDoc(blob, KEY, "doc-1", 1, "sales-bills")); // wrong class
});

test("decryptDoc throws when the key is wrong", () => {
  const plaintext = Buffer.from("hello", "utf8");
  const blob = encryptDoc(plaintext, KEY, "doc-1", 1, "purchase-bills");
  assert.throws(() => decryptDoc(blob, OTHER_KEY, "doc-1", 1, "purchase-bills"));
});

test("decryptDoc throws when ciphertext is tampered", () => {
  const plaintext = Buffer.from("hello world", "utf8");
  const blob = encryptDoc(plaintext, KEY, "doc-1", 1, "purchase-bills");
  const tampered = Buffer.from(blob);
  tampered[tampered.length - 1] ^= 0xff; // flip a byte in the ciphertext
  assert.throws(() => decryptDoc(tampered, KEY, "doc-1", 1, "purchase-bills"));
});

test("sha256Hex is deterministic and content-sensitive", () => {
  const a = sha256Hex(Buffer.from("same"));
  const b = sha256Hex(Buffer.from("same"));
  const c = sha256Hex(Buffer.from("different"));
  assert.equal(a, b);
  assert.notEqual(a, c);
});
