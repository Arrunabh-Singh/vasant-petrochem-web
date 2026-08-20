import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // user session (cookies), never service role
import { createAdminClient } from "@/lib/supabase/admin"; // service role, server-only
import { decryptDoc, sha256Hex } from "@/lib/crypto";
import { bucketFor, isEncryptedClass, type DocClass } from "@/lib/document-policy";
import { fetchVaultKey } from "@/lib/vault-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * document-storage-hardening.md §2.5. Two serving modes:
 *  - encrypted classes: decrypt + stream server-side. No signed URL ever
 *    exists, so a leaked link (T2) has nothing to leak.
 *  - plaintext classes: 45s signed-URL redirect with a fresh cacheNonce,
 *    no-store — bounds the T9 "forwarded link" window.
 *
 * Authorization is the RLS policy on public.documents (read with the
 * caller's own session, not service role) — if the row comes back null,
 * either it doesn't exist or RLS decided this caller can't see it, and
 * both cases are a 403. No parallel ACL check is duplicated here: RLS is
 * the one source of truth, so it can't drift from the route handler.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ docId: string }> }) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { docId } = await ctx.params;

  const { data: doc } = await sb
    .from("documents")
    .select("id, doc_class, encrypted, logical_name")
    .eq("id", docId)
    .in("status", ["active", "superseded", "legal_hold"])
    .maybeSingle();

  if (!doc) {
    await sb.rpc("log_event", {
      p_action: "download_denied",
      p_object_type: "document",
      p_object_id: docId,
      p_outcome: "denied",
      p_meta: { reason: "no_access_or_not_found", ip: req.headers.get("x-forwarded-for") },
    });
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: ver } = await sb
    .from("document_versions")
    .select("path, checksum_sha256, version")
    .eq("doc_id", docId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ver) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Audit before issuing: this row exists before any byte/URL leaves the
  // server, so a crash mid-response still leaves a true record.
  await sb.rpc("log_event", {
    p_action: "download_ok",
    p_object_type: "document",
    p_object_id: docId,
    p_meta: {
      version: ver.version,
      ua: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for"),
    },
  });

  const admin = createAdminClient();
  const docClass = doc.doc_class as DocClass;

  if (doc.encrypted) {
    const { data: blob, error } = await admin.storage.from(bucketFor(docClass)).download(ver.path);
    if (error || !blob) return NextResponse.json({ error: "storage" }, { status: 502 });

    const key = await fetchVaultKey(docClass);
    const encrypted = Buffer.from(await blob.arrayBuffer());
    let plain: Buffer;
    try {
      plain = decryptDoc(encrypted, key, docId, ver.version, docClass);
    } catch {
      await sb.rpc("log_event", {
        p_action: "integrity_failure",
        p_object_type: "document",
        p_object_id: docId,
        p_outcome: "failed",
        p_meta: { version: ver.version, reason: "decrypt_failed" },
      });
      await admin.from("documents").update({ status: "quarantined" }).eq("id", docId);
      return NextResponse.json({ error: "integrity_mismatch" }, { status: 500 });
    }

    if (sha256Hex(plain) !== ver.checksum_sha256) {
      await sb.rpc("log_event", {
        p_action: "integrity_failure",
        p_object_type: "document",
        p_object_id: docId,
        p_outcome: "failed",
        p_meta: { version: ver.version, reason: "checksum_mismatch" },
      });
      await admin.from("documents").update({ status: "quarantined" }).eq("id", docId);
      return NextResponse.json({ error: "integrity_mismatch" }, { status: 500 });
    }

    return new Response(new Uint8Array(plain), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${doc.logical_name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const { data: su } = await admin.storage
    .from(bucketFor(docClass))
    .createSignedUrl(ver.path, 45, { download: true, cacheNonce: String(Date.now()) });
  if (!su?.signedUrl) return NextResponse.json({ error: "storage" }, { status: 502 });

  return NextResponse.redirect(su.signedUrl, {
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" },
  });
}
