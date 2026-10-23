// portal: the buyer portal's invitations and files (Release 2, ADR-0003).
//
// It holds the service role so that neither the public site's Worker nor a
// browser ever does. Every request carries the caller's own access token, and
// the database decides first (the portal_* and sales_* functions, the
// documents read policy). Only then does this touch storage or create a
// sign-in.
//
//   POST /portal/invite  {"org_id", "email", "role"}
//        Adds the member. A new person gets a confirmed, password-free sign-in:
//        they sign in at /account with an emailed code. With RESEND_API_KEY and
//        MAIL_FROM set, they are also emailed the invitation.
//   POST /portal/kyc     multipart: kind, file (PDF, JPEG or PNG, 10 MB at most)
//   GET  /portal/file?kind=document|kyc&id=<uuid>
//        The file itself, decrypted when the vault encrypts its class. No
//        signed link ever exists, so there is none to forward.
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by
// Supabase. PORTAL_URL (default https://www.vasantpetrochem.com/account) is
// where invitations point.
import { MAX_KYC_BYTES, decryptDoc, httpStatus, safeName, sha256Hex, sniff } from "./files.ts";

const URL_BASE = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://www.vasantpetrochem.com/account";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const as = (token: string, extra: Record<string, string> = {}) => ({
  apikey: token === SERVICE ? SERVICE : ANON,
  Authorization: `Bearer ${token}`,
  ...extra,
});

/** A database function, called as the caller (their token) or as the service role. */
async function rpc(token: string, fn: string, args: Record<string, unknown>): Promise<{ ok: true; data: unknown } | { ok: false; res: Response }> {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: as(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(args),
  });
  const body = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: body };
  const err = (body ?? {}) as { code?: string; message?: string; hint?: string };
  return { ok: false, res: json({ error: err.message ?? "request failed", hint: err.hint ?? null }, httpStatus(err.code)) };
}

/** Who the token belongs to, as Supabase Auth says; null if it is not valid. */
async function caller(token: string): Promise<string | null> {
  const res = await fetch(`${URL_BASE}/auth/v1/user`, { headers: as(token) });
  if (!res.ok) return null;
  const user = (await res.json()) as { email?: string };
  return user.email ? user.email.toLowerCase() : null;
}

const audit = (actor: string, action: string, objectType: string, objectId: string, outcome = "ok", meta: Record<string, unknown> = {}) =>
  rpc(SERVICE, "log_event", { p_action: action, p_object_type: objectType, p_object_id: objectId, p_outcome: outcome, p_meta: meta, p_actor_email: actor });

async function invite(token: string, req: Request, inviter: string): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { org_id?: string; email?: string; role?: string } | null;
  const added = await rpc(token, "portal_invite", { p_org: body?.org_id, p_email: body?.email, p_role: body?.role });
  if (!added.ok) return added.res;
  const { email, org_name, repeat, by_staff } = added.data as { email: string; org_name: string; repeat: boolean; by_staff: boolean };

  const created = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: as(SERVICE, { "Content-Type": "application/json" }),
    body: JSON.stringify({ email, email_confirm: true }),
  });
  // 422 means they already have a sign-in: nothing to create.
  if (!created.ok && created.status !== 422) return json({ error: "the sign-in could not be created" }, 502);

  const emailed = await mailInvitation(email, by_staff ? "The Vasant Petrochem sales desk" : inviter, org_name);
  return json({ email, repeat, account: created.ok ? "created" : "existing", emailed });
}

async function mailInvitation(to: string, inviter: string, org: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM");
  if (!key || !from) return false;
  const text = [
    `${inviter} has added you to ${org}'s account on the Vasant Petrochem buyer portal.`,
    "",
    `Sign in at ${PORTAL_URL} with this email address. We will email you a 6-digit code each time; there is no password.`,
    "",
    "In the portal you can follow your enquiries, accept quotations, track orders and dispatches, and download your documents.",
    "",
    "If you did not expect this email, you can ignore it.",
  ].join("\n");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: "Your Vasant Petrochem buyer portal account", text }),
  });
  return res.ok;
}

async function uploadKyc(token: string, req: Request, actor: string): Promise<Response> {
  // Admins and finance only, with their authenticator app: portal_kyc says no otherwise.
  const allowed = await rpc(token, "portal_kyc", {});
  if (!allowed.ok) return allowed.res;
  const me = await rpc(token, "portal_me", {});
  if (!me.ok) return me.res;
  const orgId = (me.data as { org: { id: string } }).org.id;

  const form = await req.formData().catch(() => null);
  const kind = form?.get("kind");
  const file = form?.get("file");
  if (typeof kind !== "string" || !(file instanceof File)) return json({ error: "send a kind and a file" }, 400);
  if (file.size < 1 || file.size > MAX_KYC_BYTES) return json({ error: "the file must be 10 MB or smaller" }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return json({ error: "send a PDF, JPEG or PNG" }, 400);

  const path = `${orgId}/${crypto.randomUUID()}.${type.ext}`;
  const stored = await fetch(`${URL_BASE}/storage/v1/object/kyc/${path}`, {
    method: "POST",
    headers: as(SERVICE, { "Content-Type": type.mime, "x-upsert": "false" }),
    body: bytes,
  });
  if (!stored.ok) return json({ error: "the file could not be stored" }, 502);

  const recorded = await rpc(SERVICE, "portal_svc_kyc_record", {
    p_actor: actor, p_kind: kind, p_path: path, p_name: file.name || `document.${type.ext}`,
    p_mime: type.mime, p_size: bytes.length, p_sha256: await sha256Hex(bytes),
  });
  if (!recorded.ok) {
    await fetch(`${URL_BASE}/storage/v1/object/kyc/${path}`, { method: "DELETE", headers: as(SERVICE) });
    return recorded.res;
  }
  return json({ id: recorded.data });
}

const download = (bytes: Uint8Array<ArrayBuffer>, name: string) =>
  new Response(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName(name)}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });

async function stored(bucket: string, path: string): Promise<Uint8Array<ArrayBuffer> | null> {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${path}`, { headers: as(SERVICE) });
  return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
}

async function file(token: string, url: URL, actor: string): Promise<Response> {
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return json({ error: "not found" }, 404);

  if (kind === "kyc") {
    const where = await rpc(token, "portal_kyc_file", { p_id: id });
    if (!where.ok) return where.res;
    const k = where.data as { bucket: string; path: string; name: string };
    const bytes = await stored(k.bucket, k.path);
    return bytes ? download(bytes, k.name) : json({ error: "the file could not be read" }, 502);
  }
  if (kind !== "document") return json({ error: "not found" }, 404);

  // The documents read policy decides, read with the caller's own token, as
  // the hub's download route does (app/api/documents/[docId]/download).
  const docRes = await fetch(
    `${URL_BASE}/rest/v1/documents?id=eq.${id}&status=in.(active,superseded,legal_hold)&select=id,doc_class,encrypted,logical_name`,
    { headers: as(token) },
  );
  const doc = docRes.ok ? ((await docRes.json()) as { doc_class: string; encrypted: boolean; logical_name: string }[])[0] : undefined;
  if (!doc) {
    await audit(actor, "download_denied", "document", id, "denied", { reason: "no_access_or_not_found", via: "portal" });
    return json({ error: "not found" }, 404);
  }
  const verRes = await fetch(
    `${URL_BASE}/rest/v1/document_versions?doc_id=eq.${id}&select=path,checksum_sha256,version&order=version.desc&limit=1`,
    { headers: as(token) },
  );
  const ver = verRes.ok ? ((await verRes.json()) as { path: string; checksum_sha256: string; version: number }[])[0] : undefined;
  if (!ver) return json({ error: "not found" }, 404);

  // Audited before any byte leaves.
  await audit(actor, "download_ok", "document", id, "ok", { version: ver.version, via: "portal" });
  const blob = await stored(doc.doc_class, ver.path);
  if (!blob) return json({ error: "the file could not be read" }, 502);
  if (!doc.encrypted) return download(blob, doc.logical_name);

  const key = await rpc(SERVICE, "vault_key_for", { p_class: doc.doc_class });
  if (!key.ok) return json({ error: "the file could not be read" }, 502);
  let plain: Uint8Array<ArrayBuffer> | null = null;
  try {
    plain = await decryptDoc(blob, key.data as string, id, ver.version, doc.doc_class);
  } catch {
    plain = null;
  }
  if (!plain || (await sha256Hex(plain)) !== ver.checksum_sha256) {
    await audit(actor, "integrity_failure", "document", id, "failed", { version: ver.version, via: "portal" });
    await fetch(`${URL_BASE}/rest/v1/documents?id=eq.${id}`, {
      method: "PATCH",
      headers: as(SERVICE, { "Content-Type": "application/json" }),
      body: JSON.stringify({ status: "quarantined" }),
    });
    return json({ error: "this document failed its integrity check and has been set aside" }, 500);
  }
  return download(plain, doc.logical_name);
}

Deno.serve(async (req) => {
  if (!URL_BASE || !ANON || !SERVICE) return json({ error: "not configured" }, 500);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const actor = token && token !== ANON && token !== SERVICE ? await caller(token) : null;
  if (!actor) return json({ error: "sign in first" }, 401);

  const url = new URL(req.url);
  const route = url.pathname.replace(/\/+$/, "").split("/").pop();
  if (req.method === "POST" && route === "invite") return invite(token, req, actor);
  if (req.method === "POST" && route === "kyc") return uploadKyc(token, req, actor);
  if (req.method === "GET" && route === "file") return file(token, url, actor);
  return json({ error: "not found" }, 404);
});
