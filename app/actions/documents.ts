"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/rbac";
import { isDocClass, uploadDocumentVersion } from "@/lib/documents";

export type DocumentFormState = { status: "idle" | "success" | "error"; message?: string; docId?: string };

export async function uploadDocument(
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const admin = await requireAdmin();

  const file = formData.get("file") as File | null;
  const docClassRaw = String(formData.get("docClass") ?? "");
  const logicalName = String(formData.get("logicalName") ?? "").trim();
  const existingDocId = formData.get("docId") ? String(formData.get("docId")) : null;
  const fyRaw = formData.get("fy");
  const fy = fyRaw ? Number(fyRaw) : undefined;

  if (!file || file.size === 0 || !logicalName) {
    return { status: "error", message: "A file and a name are required." };
  }
  if (!isDocClass(docClassRaw)) {
    return { status: "error", message: "Invalid document class." };
  }

  const result = await uploadDocumentVersion({
    file,
    docClass: docClassRaw,
    logicalName,
    uploaderEmail: admin.email,
    existingDocId,
    fy,
  });

  if (!result.ok) return { status: "error", message: result.error };

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${result.docId}`);
  return { status: "success", docId: result.docId };
}

export async function grantAccess(docId: string, email: string, level: "view" | "approve" | "upload" = "view") {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("acl_grant", { p_doc_id: docId, p_subject_email: email, p_level: level });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/documents/${docId}`);
}

export async function revokeAccess(docId: string, email: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("acl_revoke", { p_doc_id: docId, p_subject_email: email });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/documents/${docId}`);
}

export async function setLegalHold(docId: string, hold: boolean, reason?: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ legal_hold: hold }).eq("id", docId);
  if (error) throw new Error(error.message);
  await supabase.rpc("log_event", {
    p_action: hold ? "legal_hold_set" : "legal_hold_clear",
    p_object_type: "document",
    p_object_id: docId,
    p_meta: { reason: reason ?? null },
    p_actor_email: admin.email,
  });
  revalidatePath(`/admin/documents/${docId}`);
}

export async function softDelete(docId: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ status: "soft_deleted" }).eq("id", docId);
  if (error) throw new Error(error.message);
  await supabase.rpc("log_event", {
    p_action: "soft_delete",
    p_object_type: "document",
    p_object_id: docId,
    p_actor_email: admin.email,
  });
  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${docId}`);
}

/** A different document replaces this one outright (not a new version of itself). */
export async function supersedeDocument(oldDocId: string, newDocId: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ status: "superseded" }).eq("id", oldDocId);
  if (error) throw new Error(error.message);
  await supabase.rpc("log_event", {
    p_action: "supersede",
    p_object_type: "document",
    p_object_id: oldDocId,
    p_meta: { superseded_by: newDocId },
    p_actor_email: admin.email,
  });
  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${oldDocId}`);
}
