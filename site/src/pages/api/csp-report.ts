/**
 * Content-Security-Policy violation reports (VP-SEC-002): logged to the
 * Worker's logs during the report-only week, then reviewed before the strict
 * policy is enforced. Only the fields needed to fix a policy are kept.
 */
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const done = new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (Number(request.headers.get("content-length") ?? 0) > 16 * 1024) return done;
  const text = (await request.text()).slice(0, 16 * 1024);
  try {
    const body = JSON.parse(text);
    const reports = Array.isArray(body) ? body.map((r) => r.body ?? r) : [body["csp-report"] ?? body];
    for (const r of reports.slice(0, 10)) {
      const pick = (k: string, k2: string) => String(r?.[k] ?? r?.[k2] ?? "").slice(0, 200);
      console.log("csp-violation", {
        directive: pick("effectiveDirective", "violated-directive"),
        blocked: pick("blockedURL", "blocked-uri"),
        page: (() => {
          try {
            return new URL(pick("documentURL", "document-uri")).pathname;
          } catch {
            return "";
          }
        })(),
        source: pick("sourceFile", "source-file"),
        line: pick("lineNumber", "line-number"),
      });
    }
  } catch {
    /* not a report */
  }
  return done;
};
