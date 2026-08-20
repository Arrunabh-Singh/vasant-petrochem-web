import type { SupabaseClient } from "@supabase/supabase-js";

export type DocClass = "tds" | "purchase-bills" | "sales-bills" | "gst" | "contracts" | "coa" | "hr" | "bank";

type ClassConfig = {
  bucket: string;
  encrypted: boolean;
  allowedMimeTypes: readonly string[];
  maxSizeBytes: number;
};

// Mirrors supabase/migrations/20260816120006_storage_buckets_and_lockdown.sql
// and document-storage-hardening.md §2.1/§2.4 — one bucket per class, the
// five "crown jewel" classes encrypted.
const CLASS_CONFIG: Record<DocClass, ClassConfig> = {
  tds:             { bucket: "tds",             encrypted: false, allowedMimeTypes: ["application/pdf"], maxSizeBytes: 15_728_640 },
  "purchase-bills": { bucket: "purchase-bills", encrypted: true,  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/tiff"], maxSizeBytes: 26_214_400 },
  "sales-bills":    { bucket: "sales-bills",    encrypted: true,  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/tiff"], maxSizeBytes: 26_214_400 },
  gst:              { bucket: "gst",             encrypted: true,  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"], maxSizeBytes: 26_214_400 },
  contracts:        { bucket: "contracts",       encrypted: false, allowedMimeTypes: ["application/pdf"], maxSizeBytes: 26_214_400 },
  coa:              { bucket: "coa",             encrypted: false, allowedMimeTypes: ["application/pdf", "image/tiff"], maxSizeBytes: 26_214_400 },
  hr:               { bucket: "hr",              encrypted: true,  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"], maxSizeBytes: 15_728_640 },
  bank:             { bucket: "bank",            encrypted: true,  allowedMimeTypes: ["application/pdf", "image/tiff"], maxSizeBytes: 52_428_800 },
};

export function bucketFor(docClass: DocClass): string {
  return CLASS_CONFIG[docClass].bucket;
}

export function isEncryptedClass(docClass: DocClass): boolean {
  return CLASS_CONFIG[docClass].encrypted;
}

export function isAllowedMimeType(docClass: DocClass, mimeType: string): boolean {
  return CLASS_CONFIG[docClass].allowedMimeTypes.includes(mimeType);
}

export function maxSizeFor(docClass: DocClass): number {
  return CLASS_CONFIG[docClass].maxSizeBytes;
}

/** Does this email hold a class-wide grant (family-viewer/CA groups) on docClass? */
export async function isClassReader(supabase: SupabaseClient, docClass: DocClass, email: string): Promise<boolean> {
  if (!email) return false;
  const { data } = await supabase
    .from("class_acl")
    .select("doc_class")
    .eq("doc_class", docClass)
    .eq("subject_email", email.toLowerCase())
    .maybeSingle();
  return Boolean(data);
}
