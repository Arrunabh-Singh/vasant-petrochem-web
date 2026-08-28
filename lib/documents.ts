import { randomUUID } from "node:crypto";
import { createAdminClient } from "./supabase/admin";
import { encryptDoc, sha256Hex } from "./crypto";
import { detectMimeType, readHead } from "./magic-bytes";
import { bucketFor, isAllowedMimeType, isEncryptedClass, maxSizeFor, type DocClass } from "./document-policy";
import { fetchVaultKey } from "./vault-key";

export const DOC_CLASSES: DocClass[] = ["tds", "purchase-bills", "sales-bills", "gst", "contracts", "coa", "hr", "bank"];
export function isDocClass(value: unknown): value is DocClass {
  return typeof value === "string" && (DOC_CLASSES as string[]).includes(value);
}

export type UploadDocumentParams = {
  file: File;
  docClass: DocClass;
  logicalName: string;
  uploaderEmail: string;
  existingDocId?: string | null;
  fy?: number;
};

export type UploadDocumentResult =
  | { ok: true; docId: string; version: number }
  | { ok: false; status: number; error: string };

/**
 * Shared by app/api/documents/upload/route.ts (browser session + office-box
 * ticket callers) and app/actions/documents.ts (admin UI server action) —
 * one implementation of document-storage-hardening.md §2.5's upload
 * mirror, so the two entry points can't drift apart.
 */
export async function uploadDocumentVersion(params: UploadDocumentParams): Promise<UploadDocumentResult> {
  const { file, docClass, logicalName, uploaderEmail, existingDocId, fy } = params;

  if (!file || file.size === 0 || !logicalName.trim()) {
    return { ok: false, status: 400, error: "file and logicalName are required" };
  }
  if (file.size > maxSizeFor(docClass)) {
    return { ok: false, status: 413, error: "file exceeds the size limit for this class" };
  }

  const detectedType = detectMimeType(await readHead(file, 8));
  if (!detectedType || !isAllowedMimeType(docClass, detectedType)) {
    return { ok: false, status: 400, error: "file signature doesn't match an allowed type for this class" };
  }

  const plaintext = Buffer.from(await file.arrayBuffer());
  const checksum = sha256Hex(plaintext);
  const admin = createAdminClient();

  // Feature 3: best-effort OCR of PDFs for in-app full-text search.
  // Never blocks the upload — a failure just leaves extracted_text null.
  let extractedText: string | null = null;
  if (detectedType === "application/pdf") {
    try {
      const { extractText } = await import("unpdf");
      const out = await extractText(new Uint8Array(plaintext));
      const text = Array.isArray(out.text) ? out.text.join("\n") : String(out.text ?? "");
      extractedText = text.trim() || null;
    } catch (ocrErr) {
      console.error("document OCR (pdf) failed:", (ocrErr as Error).message);
    }
  }

  let docId: string;
  let version: number;
  let isNewDoc: boolean;

  if (existingDocId) {
    const { data: existing } = await admin
      .from("documents")
      .select("id, doc_class, version")
      .eq("id", existingDocId)
      .maybeSingle();
    if (!existing || existing.doc_class !== docClass) {
      return { ok: false, status: 404, error: "document not found for this class" };
    }
    docId = existing.id;
    version = existing.version + 1;
    isNewDoc = false;
  } else {
    docId = randomUUID();
    version = 1;
    isNewDoc = true;
  }

  const fySegment = fy ?? new Date().getFullYear();
  const safeName = logicalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Copy-on-write: this path is written exactly once, even across
  // versions (doc-hardening §4.2 — Supabase Storage has no object
  // versioning, so immutability is enforced here, not by the storage API).
  const path = `${docClass}/FY${fySegment}/${docId}/v${version}/${safeName}`;

  if (isNewDoc) {
    const { data: retention } = await admin.rpc("retention_for", { p_class: docClass, p_fy: fy ?? null });
    const { error: docErr } = await admin.from("documents").insert({
      id: docId,
      doc_class: docClass,
      path,
      logical_name: logicalName,
      status: "pending",
      encrypted: isEncryptedClass(docClass),
      checksum_sha256: checksum,
      size_bytes: plaintext.byteLength,
      version,
      retention_until: retention,
      created_by: uploaderEmail,
      extracted_text: extractedText,
    });
    if (docErr) {
      console.error("document insert failed:", docErr.message);
      return { ok: false, status: 500, error: "could not create document record" };
    }
  }

  // documents + document_versions land before the storage write — a
  // storage failure after this point leaves a 'pending' row, not a
  // phantom file with no record.
  const { error: verErr } = await admin.from("document_versions").insert({
    doc_id: docId,
    version,
    path,
    checksum_sha256: checksum,
    size_bytes: plaintext.byteLength,
    uploaded_by: uploaderEmail,
  });
  if (verErr) {
    if (isNewDoc) await admin.from("documents").delete().eq("id", docId);
    console.error("document_versions insert failed:", verErr.message);
    return { ok: false, status: 500, error: "could not create version record" };
  }

  let bytesToStore: Buffer = plaintext;
  let contentType = detectedType;
  if (isEncryptedClass(docClass)) {
    const key = await fetchVaultKey(docClass);
    bytesToStore = encryptDoc(plaintext, key, docId, version, docClass);
    contentType = "application/octet-stream";
  }

  const { error: uploadErr } = await admin.storage
    .from(bucketFor(docClass))
    .upload(path, bytesToStore, { contentType, upsert: false });

  if (uploadErr) {
    await admin.from("document_versions").delete().eq("doc_id", docId).eq("version", version);
    if (isNewDoc) await admin.from("documents").delete().eq("id", docId);
    console.error("storage upload failed:", uploadErr.message);
    return { ok: false, status: 502, error: "storage upload failed" };
  }

  await admin.from("documents").update({ status: "active", version, extracted_text: extractedText }).eq("id", docId);

  await admin.rpc("log_event", {
    p_action: "upload",
    p_object_type: "document",
    p_object_id: docId,
    p_meta: { version, doc_class: docClass },
    p_actor_email: uploaderEmail,
  });

  return { ok: true, docId, version };
}
