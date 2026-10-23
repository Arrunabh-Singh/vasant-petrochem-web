/** A KYC upload, streamed to the portal Edge Function, which checks the file's bytes, stores and records it. */
import type { APIRoute } from "astro";
import { cfg, member, refusal } from "../../../server/account-page.ts";
import { seeOther } from "../../../server/http.ts";
import { edge } from "../../../server/portal.ts";

export const prerender = false;

const MAX = 10 * 1024 * 1024 + 64 * 1024; // the file, plus the form around it

export const POST: APIRoute = async (ctx) => {
  const g = await member(ctx);
  if ("response" in g) return g.response;
  const back = "/account/company";
  const type = ctx.request.headers.get("content-type") ?? "";
  const length = Number(ctx.request.headers.get("content-length") ?? 0);
  if (!type.startsWith("multipart/form-data") || !ctx.request.body || length < 1 || length > MAX) return seeOther(`${back}?m=file-type`);

  const res = await edge(cfg(), g.acct.token, "kyc", { method: "POST", body: ctx.request.body, type });
  if (res.ok) return seeOther(`${back}?m=uploaded`);
  const body = (await res.json().catch(() => null)) as { hint?: string } | null;
  if (res.status === 400) return seeOther(`${back}?m=file-type`);
  return refusal({ status: res.status, hint: body?.hint ?? undefined }, back);
};
