import { getEntry } from "astro:content";

/**
 * The wording of a registered claim (content/claims.json, MNC VP-GOV-001).
 * Fails the build for an unknown or retired id, so a page can never state a
 * claim the register does not allow.
 */
export async function claim(id: string): Promise<string> {
  const entry = await getEntry("claims", id);
  if (!entry) throw new Error(`Unknown claim "${id}": register it in content/claims.json first.`);
  if (entry.data.status === "retired") throw new Error(`Claim "${id}" is retired and must not appear on the site.`);
  return entry.data.text;
}

/** The one disclaimer under every spec table and on every datasheet (VP-LEG-007). */
export const disclaimer = () => claim("spec-disclaimer");
