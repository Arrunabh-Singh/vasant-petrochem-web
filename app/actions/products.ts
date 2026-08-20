"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/rbac";
import { uploadDocumentVersion } from "@/lib/documents";

export type ProductFormState = { status: "idle" | "success" | "error"; message?: string };

export async function updateProduct(
  id: string,
  slug: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { status: "error", message: "Unauthorized." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const packaging = String(formData.get("packaging") ?? "").trim();
  const specsRaw = String(formData.get("specs") ?? "[]");
  const published = formData.get("published") === "on";

  if (!name || !description) {
    return { status: "error", message: "Name and description are required." };
  }

  let specs;
  try {
    specs = JSON.parse(specsRaw);
    if (!Array.isArray(specs)) throw new Error();
  } catch {
    return { status: "error", message: 'Specs must be valid JSON: [{"label":"...","value":"..."}]' };
  }

  const supabase = await createClient();

  // decision 3 + Phase 4: TDS is a vault document class (`tds`), not a
  // bespoke session-client storage upload — storage.objects is deny-all
  // for every role but service_role now, and this route gets the audit
  // trail, magic-byte check, and versioning the vault already provides.
  const file = formData.get("tds") as File | null;
  let tdsDocumentId: string | undefined;
  if (file && file.size > 0) {
    const { data: current } = await supabase.from("products").select("tds_document_id").eq("id", id).maybeSingle();
    const result = await uploadDocumentVersion({
      file,
      docClass: "tds",
      logicalName: `${slug}.pdf`,
      uploaderEmail: admin.email,
      existingDocId: current?.tds_document_id ?? null,
    });
    if (!result.ok) return { status: "error", message: `TDS upload failed: ${result.error}` };
    tdsDocumentId = result.docId;
  }

  const { error } = await supabase
    .from("products")
    .update({
      name,
      description,
      packaging: packaging || null,
      specs,
      published,
      ...(tdsDocumentId ? { tds_document_id: tdsDocumentId } : {}),
    })
    .eq("id", id);

  if (error) {
    console.error("updateProduct failed:", error.message);
    return { status: "error", message: "Could not save the product. Please try again." };
  }

  // audit.md M10: opengraph-image and the pages that surface the catalog
  // outside /products weren't revalidated on publish/unpublish, so stale
  // previews and links persisted until the next deploy.
  revalidatePath("/products");
  revalidatePath(`/products/${slug}`);
  revalidatePath(`/products/${slug}/opengraph-image`);
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/industries");
  revalidatePath("/admin/products");
  return { status: "success" };
}
