import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyDeviceTicket } from "@/lib/device-ticket";

export const runtime = "nodejs";

type Reading = { periodStart: string; avg: number; min: number; max: number; last: number };

const MAX_READINGS_PER_BATCH = 500;
// THREAT_MODEL.md C5 "tampered readings": a coarse sanity bound, not a
// per-device-type calibration — reject obvious garbage (sensor fault,
// spoofed value) without needing per-type config this wave.
const SANE_MIN = -1000;
const SANE_MAX = 100_000;

function isSane(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= SANE_MIN && n <= SANE_MAX;
}

function isSaneReading(r: unknown): r is Reading {
  if (typeof r !== "object" || r === null) return false;
  const rec = r as Record<string, unknown>;
  if (typeof rec.periodStart !== "string" || Number.isNaN(Date.parse(rec.periodStart))) return false;
  return isSane(rec.avg) && isSane(rec.min) && isSane(rec.max) && isSane(rec.last);
}

/**
 * decision 7: the gateway sends 1-minute aggregates only — never raw
 * readings. HMAC-authenticated via a device ticket (lib/device-ticket.ts),
 * not a Supabase session; the gateway has no session to hold. Writes go
 * through the iot_ingest_telemetry RPC (public schema) rather than
 * .schema("iot") directly — see 20260816120021's header comment for why.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ticket = verifyDeviceTicket(authHeader.slice(7));
  if (!ticket) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const readings: unknown[] = Array.isArray(body?.readings) ? body.readings : [];
  if (readings.length === 0 || readings.length > MAX_READINGS_PER_BATCH) {
    return NextResponse.json({ error: `readings must be 1-${MAX_READINGS_PER_BATCH} items` }, { status: 400 });
  }

  const sane = readings.filter(isSaneReading);
  const rejected = readings.length - sane.length;
  const admin = createAdminClient();

  let accepted = 0;
  if (sane.length > 0) {
    const { data, error } = await admin.rpc("iot_ingest_telemetry", {
      p_device_id: ticket.deviceId,
      p_readings: sane,
    });
    if (error) {
      console.error("telemetry ingest failed:", error.message);
      return NextResponse.json({ error: error.message.includes("inactive") ? "unknown or inactive device" : "storage error" }, { status: error.message.includes("inactive") ? 403 : 500 });
    }
    accepted = (data as { accepted: number } | null)?.accepted ?? 0;
  }

  if (rejected > 0) {
    await admin.rpc("log_event", {
      p_action: "telemetry_rejected",
      p_object_type: "device",
      p_object_id: ticket.deviceId,
      p_meta: { rejected, accepted },
      p_outcome: "denied",
      p_actor_email: `device:${ticket.deviceId}`,
    });
  }

  return NextResponse.json({ accepted, rejected });
}
