import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyDeviceTicket, signControlRequest } from "@/lib/device-ticket";

export const runtime = "nodejs";

/**
 * VASANT_HUB_BLUEPRINT.md F8 golden rule: the cloud never pushes to the
 * factory. This route only ever hands back rows that were already
 * approved through the 2-person flow (control.enforce_two_person) — the
 * gateway calls this on its own polling schedule, over outbound TLS.
 * There is no route anywhere in this repo that initiates a connection
 * to a device.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ticket = verifyDeviceTicket(authHeader.slice(7));
  if (!ticket) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("control_pull", { p_device_id: ticket.deviceId });
  if (error) {
    console.error("control pull failed:", error.message);
    return NextResponse.json({ error: "storage error" }, { status: 500 });
  }

  const rows = (data ?? []) as { id: string; action: string; seq: number }[];
  // The gateway verifies this signature against its own copy of
  // TELEMETRY_HMAC_SECRET before ever actuating anything — a compromised
  // component anywhere between the DB and this response still can't
  // forge a command the gateway will accept.
  const commands = rows.map((r) => ({
    requestId: r.id,
    action: r.action,
    seq: r.seq,
    signature: signControlRequest(ticket.deviceId, r.action, r.seq),
  }));

  return NextResponse.json({ commands });
}
