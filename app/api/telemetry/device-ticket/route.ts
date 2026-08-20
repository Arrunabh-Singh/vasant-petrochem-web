import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { mintDeviceTicket } from "@/lib/device-ticket";

/** Admin-only. Mints a long(er)-lived bearer ticket for one device — see lib/device-ticket.ts. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  const ttlDays = Math.min(Math.max(Number(body?.ttlDays) || 90, 1), 365);

  if (!deviceId) return NextResponse.json({ error: "deviceId is required" }, { status: 400 });

  const exp = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;
  const ticket = mintDeviceTicket({ deviceId, exp });

  return NextResponse.json({ ticket, expiresAt: exp });
}
