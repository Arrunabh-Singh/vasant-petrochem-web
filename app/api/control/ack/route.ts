import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyDeviceTicket } from "@/lib/device-ticket";

export const runtime = "nodejs";

/** The gateway confirms it actually executed a pulled command — closes the loop for the audit trail. */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ticket = verifyDeviceTicket(authHeader.slice(7));
  if (!ticket) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const requestId = typeof body?.requestId === "string" ? body.requestId : null;
  if (!requestId) return NextResponse.json({ error: "requestId is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: ok, error } = await admin.rpc("control_ack", { p_device_id: ticket.deviceId, p_request_id: requestId });
  if (error) {
    console.error("control ack failed:", error.message);
    return NextResponse.json({ error: "storage error" }, { status: 500 });
  }
  if (!ok) return NextResponse.json({ error: "no matching pulled request" }, { status: 404 });

  await admin.rpc("log_event", {
    p_action: "control_executed",
    p_object_type: "control_request",
    p_object_id: requestId,
    p_actor_email: `device:${ticket.deviceId}`,
  });

  return NextResponse.json({ ok: true });
}
