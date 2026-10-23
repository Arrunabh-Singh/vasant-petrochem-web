import { getCollection, getEntry, type CollectionEntry } from "astro:content";
import { showDrafts } from "./catalog.ts";
import { claim } from "./claims.ts";
import { company } from "./company.ts";

async function entry(id: string) {
  const e = await getEntry("pages", id);
  if (!e) throw new Error(`content/pages/${id}.json is missing.`);
  return e.data;
}

/** A page's copy from content/pages/<id>.json; a missing page, or a draft outside a preview, fails the build. */
export async function page(id: string) {
  const data = await entry(id);
  if (data.status !== "published" && !showDrafts) throw new Error(`content/pages/${id}.json is a draft.`);
  return data;
}

/** The copy of an on-demand page, or null while it is a draft outside a preview: the page then answers 404. */
export async function livePage(id: string) {
  const data = await entry(id);
  return data.status === "published" || showDrafts ? data : null;
}

/** A block item's text: its registered claim's wording, else its own body. */
export async function itemText(item: { body?: string | undefined; claim?: string | undefined }): Promise<string> {
  return item.claim ? claim(item.claim) : (item.body ?? "");
}

/** Certificates still in force today; an expired one is never shown (MNC VP-CORP-004). */
export async function liveCertifications() {
  const today = new Date().toISOString().slice(0, 10);
  return (await getCollection("certifications")).filter((c) => c.data.validTo >= today);
}

/** Published articles, newest first (drafts too on a preview). */
export async function liveInsights() {
  const posts = await getCollection("insights", (i) => i.data.status === "published" || showDrafts);
  return posts.sort((a, b) => +b.data.date - +a.data.date);
}

/** Whether the facts a corporate page depends on exist yet. */
async function requirementMet(requires: CollectionEntry<"corporate">["data"]["requires"]): Promise<boolean> {
  if (requires === "people") return (await getCollection("people")).length > 0;
  if (requires === "careers-mailbox") return company.mailboxes.careers !== null;
  if (requires === "exports") return company.exports;
  return true;
}

/**
 * The policy and company pages to build: published ones (drafts too on a
 * preview), never one whose facts are missing (no leadership page without
 * people, no export page without an IEC).
 */
export async function corporatePages() {
  const all = await getCollection("corporate", (c) => c.data.status === "published" || showDrafts);
  const met = await Promise.all(all.map((c) => requirementMet(c.data.requires)));
  return all.filter((_, i) => met[i]);
}
