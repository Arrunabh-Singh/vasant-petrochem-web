import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDocClass, uploadDocumentVersion } from "@/lib/documents";
import type { DocClass } from "@/lib/document-policy";
import { verifyTicket } from "@/lib/upload-ticket";

export const runtime = "nodejs";

type Uploader = { email: string; allowedClasses: DocClass[] | "all" };

/**
 * document-storage-hardening.md §3.1: only `admin` and `uploader` may
 * write to the vault — `approver` explicitly cannot upload directly. Two
 * ways in: a Supabase admin/uploader session (browser), or a Bearer
 * upload ticket (the office box, which has no Supabase session at all).
 */
async function resolveUploader(req: NextRequest): Promise<Uploader | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const ticket = verifyTicket(authHeader.slice(7));
    if (!ticket) return null;
    // "etl-inbox" scopes a ticket to app/api/etl/upload, not this route.
    return { email: ticket.sub, allowedClasses: ticket.classes.filter(isDocClass) };
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return null;

  const { data } = await sb
    .from("app_users")
    .select("role, groups, is_active")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  if (!data?.is_active) return null;
  if (data.role === "admin") return { email: user.email, allowedClasses: "all" };
  if (data.role === "uploader") return { email: user.email, allowedClasses: (data.groups ?? []) as DocClass[] };
  return null;
}

export async function POST(req: NextRequest) {
  const uploader = await resolveUploader(req);
  if (!uploader) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const docClassRaw = String(formData.get("docClass") ?? "");
  const logicalName = String(formData.get("logicalName") ?? "").trim();
  const existingDocId = formData.get("docId") ? String(formData.get("docId")) : null;
  const fyRaw = formData.get("fy");
  const fy = fyRaw ? Number(fyRaw) : undefined;

  if (!file || !logicalName) {
    return NextResponse.json({ error: "file and logicalName are required" }, { status: 400 });
  }
  if (!isDocClass(docClassRaw)) {
    return NextResponse.json({ error: "invalid docClass" }, { status: 400 });
  }
  if (uploader.allowedClasses !== "all" && !uploader.allowedClasses.includes(docClassRaw)) {
    return NextResponse.json({ error: "not authorized for this document class" }, { status: 403 });
  }

  const result = await uploadDocumentVersion({
    file,
    docClass: docClassRaw,
    logicalName,
    uploaderEmail: uploader.email,
    existingDocId,
    fy,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ docId: result.docId, version: result.version }, { status: 201 });
}
