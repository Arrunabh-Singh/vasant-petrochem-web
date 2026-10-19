import type { APIRoute } from "astro";
import { searchGroups } from "../lib/search.ts";

export const GET: APIRoute = async () => {
  const hits = (await searchGroups()).flatMap((g) => g.hits);
  return new Response(JSON.stringify(hits), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
