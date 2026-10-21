/** /kit/items.json: what scripts/kit.mjs saves. Preview builds only. */
import type { APIRoute } from "astro";
import { kitItems } from "../../lib/kit.ts";

export const prerender = true;

export async function getStaticPaths() {
  return (await kitItems()).length ? [{ params: { file: "items" } }] : [];
}

export const GET: APIRoute = async () => Response.json(await kitItems());
