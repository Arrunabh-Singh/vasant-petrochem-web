import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { mintTicket, type UploadTicketPayload } from "@/lib/upload-ticket";
import { isDocClass } from "@/lib/documents";

function isTicketClass(value: unknown): value is UploadTicketPayload["classes"][number] {
  return value === "etl-inbox" || isDocClass(value);
}

/**
 * document-storage-hardening.md §5.7: admin-only. Mints a short-lived,
 * scoped ticket for a non-Supabase-session uploader (the office box) —
 * "uploader on these classes, for N minutes, one batch." Never a
 * long-lived service key sitting on the office PC. "etl-inbox" scopes a
 * ticket to raw Tally XML staging (app/api/etl/upload) instead of the
 * document vault.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const sub = typeof body?.sub === "string" ? body.sub.trim().toLowerCase() : "";
  const classes = Array.isArray(body?.classes) ? body.classes.filter(isTicketClass) : [];
  // Most tickets are short-lived, one-batch admin uploads (§5.7's "N
  // minutes / one batch"). The office box's nightly ETL pull is the
  // exception — nobody's awake to re-mint a ticket at 2am — so the cap
  // stretches to 90 days for that unattended, lower-sensitivity staging
  // path; the admin still chooses the actual value per mint.
  const ttlMinutes = Math.min(Math.max(Number(body?.ttlMinutes) || 30, 1), 90 * 24 * 60);

  if (!sub || classes.length === 0) {
    return NextResponse.json({ error: "sub and at least one valid class are required" }, { status: 400 });
  }

  const exp = Math.floor(Date.now() / 1000) + ttlMinutes * 60;
  const ticket = mintTicket({ sub, classes, exp });

  return NextResponse.json({ ticket, expiresAt: exp });
}
