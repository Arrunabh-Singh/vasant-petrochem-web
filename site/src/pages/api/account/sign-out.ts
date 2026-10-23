/** Signs out here, or on every device. */
import type { APIRoute } from "astro";
import { cfg } from "../../../server/account-page.ts";
import { readForm, sameOrigin, seeOther } from "../../../server/http.ts";
import { readSession, signOut, writeSession } from "../../../server/portal.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const form = await readForm(request);
  const s = readSession(cookies);
  if (s) await signOut(cfg(), s.a, form?.scope === "global" ? "global" : "local");
  writeSession(cookies, null);
  return seeOther("/account?m=signed-out");
};
