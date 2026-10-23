// The Cloudflare cutover for the public site, in steps that are safe to run
// again. docs/runbooks/cloudflare-cutover.md says when to run each one.
//
//   node scripts/cutover.mjs check      read only: zone, Worker, routes, settings, Turnstile
//   node scripts/cutover.mjs deploy     Turnstile widget, build, deploy to workers.dev, Worker secrets, smoke test
//   node scripts/cutover.mjs email      Resend sending domain: DNS records, verification, mail secrets
//   node scripts/cutover.mjs live       hub routes first, then www/* to the Worker; HTTPS, rate limit, apex 301
//   node scripts/cutover.mjs rollback   remove the www/* route: Vercel serves www again within a minute
//
// Reads CLOUDFLARE_API_TOKEN. deploy also reads SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
// and SITE_TOKEN; email reads RESEND_API_KEY. Secrets go to Cloudflare's API
// directly: never to disk, never printed.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ZONE = "vasantpetrochem.com";
const WWW = `www.${ZONE}`;
const WORKER = "vasant-site";
// What the staff hub (Vercel) keeps on www until it moves to hub.vasantpetrochem.com.
const HUB_PATHS = ["/admin*", "/auth/*", "/_next/*", "/vasant_logo*", "/api/mcp*", "/api/telemetry/*", "/api/etl/*", "/api/control/*", "/api/documents/*", "/api/cron/*"];
// Only the site's own endpoints are rate-limited at the edge: telemetry, ETL and
// the MCP connector post often from one address and must never be throttled.
// The account's sign-in steps are here too: each sends an email or checks a code.
const RATE_LIMITED = ["/api/rfq", "/api/tds", "/api/click", "/api/csp-report", "/api/account/code", "/api/account/verify", "/api/account/mfa"];
const MAIL_FROM = `Vasant Petrochem <enquiries@${ZONE}>`;

const site = new URL("..", import.meta.url).pathname;
const step = process.argv[2];
const token = process.env.CLOUDFLARE_API_TOKEN;

function fail(message) {
  console.error(`cutover: ${message}`);
  process.exit(1);
}
const say = (message) => console.log(`- ${message}`);

async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body.success !== false, status: res.status, result: body.result, errors: body.errors ?? [] };
}
async function must(path, init) {
  const r = await cf(path, init);
  if (!r.ok) fail(`${init?.method ?? "GET"} ${path}: ${r.status} ${JSON.stringify(r.errors)}`);
  return r.result;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });

async function context() {
  const [zone] = await must(`/zones?name=${ZONE}`);
  if (!zone) fail(`zone ${ZONE} not found for this token`);
  const sub = (await cf(`/accounts/${zone.account.id}/workers/subdomain`)).result?.subdomain ?? null;
  return { zone: zone.id, account: zone.account.id, status: zone.status, sub };
}

/** Runs wrangler with the account set, so it never prompts. */
function wrangler(args, ctx) {
  execFileSync("npx", ["wrangler", ...args], { cwd: site, stdio: "inherit", env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ctx.account, WRANGLER_SEND_METRICS: "false" } });
}

/** Sets Worker secrets straight through the API: nothing is written to disk or printed. */
async function putSecrets(values, ctx) {
  const names = Object.keys(values).filter((k) => values[k]);
  for (const name of names) {
    await must(`/accounts/${ctx.account}/workers/scripts/${WORKER}/secrets`, json("PUT", { name, text: values[name], type: "secret_text" }));
  }
  if (names.length) say(`secrets set: ${names.join(", ")}`);
}

async function secretNames(ctx) {
  const r = await cf(`/accounts/${ctx.account}/workers/scripts/${WORKER}/secrets`);
  return new Set((r.result ?? []).map((s) => s.name));
}

async function turnstile(ctx) {
  const list = await must(`/accounts/${ctx.account}/challenges/widgets`);
  const found = list.find((w) => w.name === WORKER);
  if (found) return must(`/accounts/${ctx.account}/challenges/widgets/${found.sitekey}`);
  const domains = [ZONE, WWW, ...(ctx.sub ? [`${ctx.sub}.workers.dev`] : [])];
  say(`creating the Turnstile widget for ${domains.join(", ")}`);
  return must(`/accounts/${ctx.account}/challenges/widgets`, json("POST", { name: WORKER, domains, mode: "managed" }));
}

async function check() {
  const ctx = await context();
  say(`zone ${ZONE}: ${ctx.status}; account ${ctx.account}; workers.dev subdomain: ${ctx.sub ?? "none"}`);
  for (const s of ["ssl", "always_use_https", "min_tls_version"]) say(`${s}: ${(await cf(`/zones/${ctx.zone}/settings/${s}`)).result?.value ?? "?"}`);
  const routes = (await cf(`/zones/${ctx.zone}/workers/routes`)).result ?? [];
  say(`routes: ${routes.length ? routes.map((r) => `${r.pattern} -> ${r.script ?? "none"}`).join("; ") : "none"}`);
  const worker = await cf(`/accounts/${ctx.account}/workers/scripts/${WORKER}/settings`);
  say(`worker ${WORKER}: ${worker.ok ? "exists" : "not deployed"}${worker.ok ? `; secrets: ${[...(await secretNames(ctx))].join(", ") || "none"}` : ""}`);
  const widgets = (await cf(`/accounts/${ctx.account}/challenges/widgets`)).result ?? [];
  say(`turnstile: ${widgets.find((w) => w.name === WORKER) ? "widget exists" : "no widget yet"}`);
  for (const phase of ["http_ratelimit", "http_request_dynamic_redirect"]) {
    const r = await cf(`/zones/${ctx.zone}/rulesets/phases/${phase}/entrypoint`);
    say(`${phase}: ${r.ok ? (r.result.rules ?? []).map((x) => x.description).join("; ") || "no rules" : `none (${r.status})`}`);
  }
  for (const name of [ZONE, WWW]) {
    const recs = (await cf(`/zones/${ctx.zone}/dns_records?name=${name}`)).result ?? [];
    say(`dns ${name}: ${recs.map((r) => `${r.type} ${r.content}${r.proxied ? " (proxied)" : ""}`).join("; ") || "none"}`);
  }
}

async function deploy() {
  for (const v of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SITE_TOKEN"]) if (!process.env[v]) fail(`${v} is not set`);
  const ctx = await context();
  if (!ctx.sub) {
    say("registering a workers.dev subdomain");
    ctx.sub = (await must(`/accounts/${ctx.account}/workers/subdomain`, json("PUT", { subdomain: "vasantpetrochem" }))).subdomain;
  }
  const widget = await turnstile(ctx);
  // The site key is public (it is in every page); builds read it from here.
  writeFileSync(join(site, ".env.production"), `# Cloudflare Turnstile site key: public, every form page carries it. Set by scripts/cutover.mjs.\nPUBLIC_TURNSTILE_SITE_KEY=${widget.sitekey} # gitleaks:allow\n`);
  say("site/.env.production written with the Turnstile site key; commit it");

  execFileSync("npm", ["run", "build"], { cwd: site, stdio: "inherit" });
  wrangler(["deploy"], ctx);

  const have = await secretNames(ctx);
  await putSecrets(
    {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
      SITE_TOKEN: process.env.SITE_TOKEN,
      TURNSTILE_SECRET_KEY: widget.secret,
      // Kept once set: changing it would reset every visitor's rate-limit bucket.
      IP_HASH_SECRET: have.has("IP_HASH_SECRET") ? undefined : randomBytes(32).toString("hex"),
    },
    ctx,
  );
  await smoke(`https://${WORKER}.${ctx.sub}.workers.dev`);
}

async function smoke(base) {
  for (const path of ["/", "/marketplace", "/products/base-oil-sn500", "/quote"]) {
    const res = await fetch(base + path);
    const csp = res.headers.get("content-security-policy-report-only");
    if (res.status !== 200 || !csp) fail(`${base}${path}: ${res.status}${csp ? "" : ", no strict CSP header"}`);
  }
  const offers = await (await fetch(`${base}/api/offers`)).json();
  if (!Array.isArray(offers.offers)) fail(`${base}/api/offers did not answer with a list`);
  say(`smoke test passed on ${base} (${offers.offers.length} live offers)`);
}

async function email() {
  const key = process.env.RESEND_API_KEY;
  if (!key) fail("RESEND_API_KEY is not set");
  const resend = async (path, init = {}) => {
    const res = await fetch(`https://api.resend.com${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) fail(`Resend ${init.method ?? "GET"} ${path}: ${res.status} ${JSON.stringify(body)}`);
    return body;
  };
  const ctx = await context();
  let domain = ((await resend("/domains")).data ?? []).find((d) => d.name === ZONE);
  if (!domain) {
    say(`adding ${ZONE} to Resend`);
    domain = await resend("/domains", json("POST", { name: ZONE, region: "ap-northeast-1" }));
  }
  const detail = await resend(`/domains/${domain.id}`);
  const existing = (await must(`/zones/${ctx.zone}/dns_records?per_page=500`)) ?? [];
  const fqdn = (name) => (name === "@" || name === ZONE ? ZONE : name.endsWith(`.${ZONE}`) ? name : `${name}.${ZONE}`);
  for (const r of detail.records ?? []) {
    const name = fqdn(r.name);
    if (existing.some((e) => e.type === r.type && e.name === name && e.content.replace(/"/g, "") === r.value.replace(/"/g, ""))) continue;
    await must(`/zones/${ctx.zone}/dns_records`, json("POST", { type: r.type, name, content: r.value, ttl: 1, proxied: false, ...(r.priority !== undefined ? { priority: r.priority } : {}) }));
    say(`dns: added ${r.type} ${name}`);
  }
  if (!existing.some((e) => e.type === "TXT" && e.name === `_dmarc.${ZONE}`)) {
    await must(`/zones/${ctx.zone}/dns_records`, json("POST", { type: "TXT", name: `_dmarc.${ZONE}`, content: "v=DMARC1; p=none;", ttl: 1 }));
    say("dns: added a DMARC record (p=none)");
  }
  await resend(`/domains/${domain.id}/verify`, { method: "POST" });
  let status = "pending";
  for (let i = 0; i < 24 && status !== "verified"; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    status = (await resend(`/domains/${domain.id}`)).status;
  }
  say(`Resend domain status: ${status}${status === "verified" ? "" : " (DNS can take a few minutes; run email again later)"}`);
  await putSecrets({ RESEND_API_KEY: key, MAIL_FROM }, ctx);
}

async function live() {
  const ctx = await context();
  const routes = (await must(`/zones/${ctx.zone}/workers/routes`)) ?? [];
  const has = (pattern) => routes.find((r) => r.pattern === pattern);
  // The hub's paths first, so there is no moment when they reach the new site.
  for (const path of HUB_PATHS) {
    const pattern = `${WWW}${path}`;
    if (has(pattern)) continue;
    await must(`/zones/${ctx.zone}/workers/routes`, json("POST", { pattern }));
    say(`route ${pattern} -> hub (no Worker)`);
  }
  if (!has(`${WWW}/*`)) {
    await must(`/zones/${ctx.zone}/workers/routes`, json("POST", { pattern: `${WWW}/*`, script: WORKER }));
    say(`route ${WWW}/* -> ${WORKER}`);
  }

  await must(`/zones/${ctx.zone}/settings/always_use_https`, json("PATCH", { value: "on" }));
  const tls = (await must(`/zones/${ctx.zone}/settings/min_tls_version`)).value;
  if (Number(tls) < 1.2) await must(`/zones/${ctx.zone}/settings/min_tls_version`, json("PATCH", { value: "1.2" }));
  const ssl = (await must(`/zones/${ctx.zone}/settings/ssl`)).value;
  say(`always HTTPS on; minimum TLS ${Number(tls) < 1.2 ? "1.2" : tls}; SSL mode ${ssl}${ssl === "strict" || ssl === "full" ? "" : " (expected full or strict)"}`);

  await rule(ctx, "http_ratelimit", "site endpoints: 20 requests per 10 s per address", {
    // The free plan matches on the path only.
    expression: `(http.request.uri.path in {${RATE_LIMITED.map((p) => `"${p}"`).join(" ")}})`,
    action: "block",
    ratelimit: { characteristics: ["cf.colo.id", "ip.src"], period: 10, requests_per_period: 20, mitigation_timeout: 10 },
  });
  await rule(ctx, "http_request_dynamic_redirect", "apex to www (301)", {
    expression: `(http.host eq "${ZONE}")`,
    action: "redirect",
    action_parameters: { from_value: { status_code: 301, target_url: { expression: `concat("https://${WWW}", http.request.uri.path)` }, preserve_query_string: true } },
  });

  const home = await fetch(`https://${WWW}/`);
  const admin = await fetch(`https://${WWW}/admin`, { redirect: "manual" });
  say(`www/ served by ${home.headers.get("content-security-policy-report-only") ? "the new site" : "something else"}; /admin by ${admin.headers.get("x-vercel-id") ? "the hub (Vercel)" : "something else"}`);
}

/** Adds one rule to a zone phase unless a rule with the same description is there. */
async function rule(ctx, phase, description, body) {
  const entry = await cf(`/zones/${ctx.zone}/rulesets/phases/${phase}/entrypoint`);
  if (entry.ok && (entry.result.rules ?? []).some((r) => r.description === description)) return;
  const r = entry.ok
    ? await cf(`/zones/${ctx.zone}/rulesets/${entry.result.id}/rules`, json("POST", { description, ...body }))
    : await cf(`/zones/${ctx.zone}/rulesets/phases/${phase}/entrypoint`, json("PUT", { rules: [{ description, ...body }] }));
  say(r.ok ? `${phase}: added "${description}"` : `${phase}: could not add "${description}" (${r.status} ${JSON.stringify(r.errors)}); add it in the dashboard`);
}

async function rollback() {
  const ctx = await context();
  const route = ((await must(`/zones/${ctx.zone}/workers/routes`)) ?? []).find((r) => r.pattern === `${WWW}/*`);
  if (!route) return say("no www route: www is already served by Vercel");
  await must(`/zones/${ctx.zone}/workers/routes/${route.id}`, { method: "DELETE" });
  say(`removed ${WWW}/*; Vercel serves www again within a minute`);
}

const steps = { check, deploy, email, live, rollback };
if (!steps[step]) fail(`usage: node scripts/cutover.mjs ${Object.keys(steps).join("|")}`);
if (!token) fail("CLOUDFLARE_API_TOKEN is not set");
await steps[step]();
