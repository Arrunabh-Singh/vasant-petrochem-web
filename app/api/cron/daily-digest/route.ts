import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";

/**
 * The one Vercel Cron entry (vercel.json), once a day — Hobby plan
 * allows nothing more frequent. Everything sub-daily lives in pg_cron
 * (20260816120024_cron_jobs.sql), which can only ever write DB rows;
 * this route is the bridge that turns unacked security_alerts rows into
 * an actual Telegram/email push via lib/notify.ts.
 */
export async function GET(req: NextRequest) {
  // Fail closed. The guard used to be `if (CRON_SECRET && ...)`, so an
  // unset CRON_SECRET — the default state until the owner sets it in
  // Vercel — left this route open to the internet. It reads every
  // unacked security_alerts row and pushes their contents to Telegram
  // and email, so an anonymous caller could both exfiltrate the alert
  // queue's detail text and flood the owner's channels on demand.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("daily-digest: CRON_SECRET is not set; refusing to run.");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(auth ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: alerts, error } = await admin
    .from("security_alerts")
    .select("kind, detail, severity")
    .is("acked_at", null)
    .order("severity", { ascending: true })
    .limit(50);

  if (error) {
    console.error("daily-digest fetch failed:", error.message);
    return NextResponse.json({ error: "storage error" }, { status: 500 });
  }

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ sent: false, reason: "nothing unacked" });
  }

  const critical = alerts.filter((a) => a.severity === "critical");
  const body = alerts.map((a) => `[${a.severity}] ${a.kind}: ${a.detail}`).join("\n");

  await notify(
    critical.length > 0 ? "critical" : "warning",
    `Daily digest — ${alerts.length} unacked alert${alerts.length === 1 ? "" : "s"}${critical.length ? ` (${critical.length} critical)` : ""}`,
    body
  );

  return NextResponse.json({ sent: true, count: alerts.length });
}
