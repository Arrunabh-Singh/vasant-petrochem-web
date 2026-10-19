/** Open lots on the live offers board, for the home page teaser. Cached at the edge for a minute. */
import type { APIRoute } from "astro";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "astro:env/server";
import { json } from "../../server/http.ts";
import { rpc } from "../../server/supabase.ts";

export const prerender = false;

export const GET: APIRoute = async () => {
  const r = await rpc<unknown[]>("list_offers", {}, { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY });
  const offers = r.ok && Array.isArray(r.data) ? r.data : [];
  return json(200, { offers }, { "Cache-Control": "public, max-age=0, s-maxage=60" });
};
