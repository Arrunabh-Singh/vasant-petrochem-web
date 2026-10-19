import { getEntry } from "astro:content";
import { claim } from "./claims.ts";

/** A page's copy from content/pages/<id>.json; a missing or unpublished page fails the build in production. */
export async function page(id: string) {
  const entry = await getEntry("pages", id);
  if (!entry) throw new Error(`content/pages/${id}.json is missing.`);
  return entry.data;
}

/** A block item's text: its registered claim's wording, else its own body. */
export async function itemText(item: { body?: string | undefined; claim?: string | undefined }): Promise<string> {
  return item.claim ? claim(item.claim) : (item.body ?? "");
}
