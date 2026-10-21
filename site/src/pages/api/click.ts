/**
 * Call, WhatsApp and email taps, counted per page and campaign (VP-LEAD-007).
 * Sent by navigator.sendBeacon; no personal data, rate-limited in the database.
 */
import type { APIRoute } from "astro";
import { IP_HASH_SECRET, RFQ_DRY_RUN, SITE_TOKEN, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "astro:env/server";
import { isLive, readText, sameOrigin } from "../../server/http.ts";
import { clientIp, hashIp } from "../../server/ip.ts";
import { rpc } from "../../server/supabase.ts";

export const prerender = false;

const KINDS = new Set(["tel", "whatsapp", "email"]);
const short = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, "").slice(0, max) : "");

export const POST: APIRoute = async ({ request, locals }) => {
  const done = new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (!sameOrigin(request)) return done;
  // sendBeacon's body is JSON whatever content type the browser labels it with.
  const text = await readText(request, 2048);
  if (text === null) return done;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    return done;
  }
  if (!raw || typeof raw !== "object" || !KINDS.has(String(raw.kind)) || RFQ_DRY_RUN === "1" || !isLive(request)) return done;
  const page = short(raw.page, 200);
  if (!page.startsWith("/")) return done;
  const ip = clientIp(request.headers);
  locals.cfContext?.waitUntil(
    (async () => {
      const r = await rpc(
        "log_click",
        {
          p: {
            kind: raw.kind,
            page,
            utm_source: short(raw.utm_source, 120),
            utm_medium: short(raw.utm_medium, 120),
            utm_campaign: short(raw.utm_campaign, 120),
            utm_content: short(raw.utm_content, 120),
            utm_term: short(raw.utm_term, 120),
            landing_page: short(raw.landing_page, 200),
            referrer: short(raw.referrer, 120),
            ip_hash: await hashIp(ip, IP_HASH_SECRET),
          },
          token: SITE_TOKEN ?? "",
        },
        { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY },
      );
      if (!r.ok && !/rate limit/i.test(r.message)) console.warn("click not logged:", r.status, r.message);
    })(),
  );
  return done;
};
