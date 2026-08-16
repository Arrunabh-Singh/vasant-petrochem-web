"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProductFormState = { status: "idle" | "success" | "error"; message?: string };

export async function updateProduct(
  id: string,
  slug: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
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

  const file = formData.get("tds") as File | null;
  let tdsPath: string | undefined;
  if (file && file.size > 0) {
    if (file.type !== "application/pdf") {
      return { status: "error", message: "TDS file must be a PDF." };
    }
    tdsPath = `${slug}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("tds")
      .upload(tdsPath, file, { upsert: true, contentType: "application/pdf" });
    if (uploadError) {
      return { status: "error", message: `TDS upload failed: ${uploadError.message}` };
    }
  }

  const { error } = await supabase
    .from("products")
    .update({
      name,
      description,
      packaging: packaging || null,
      specs,
      published,
      ...(tdsPath ? { tds_path: tdsPath } : {}),
    })
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/products");
  revalidatePath(`/products/${slug}`);
  revalidatePath("/");
  revalidatePath("/admin/products");
  return { status: "success" };
}
