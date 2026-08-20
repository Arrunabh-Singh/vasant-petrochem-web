import { hmacHex, mintHmacTicket, verifyHmacTicket } from "./hmac-ticket";

/**
 * The edge gateway's credential. Same mechanism as lib/upload-ticket.ts,
 * a separate secret (TELEMETRY_HMAC_SECRET) so a leaked telemetry ticket
 * can't be replayed as a document upload ticket or vice versa. Minted by
 * an admin for a specific device_id; the gateway holds this instead of a
 * raw shared secret, so revocation is "mint a new one, the old one still
 * works until its TTL — keep TTLs short and re-mint on a schedule."
 */
export type DeviceTicketPayload = {
  deviceId: string;
  exp: number; // epoch seconds
};

function secret(): string {
  const key = process.env.TELEMETRY_HMAC_SECRET;
  if (!key) throw new Error("TELEMETRY_HMAC_SECRET is not set.");
  return key;
}

export function mintDeviceTicket(payload: DeviceTicketPayload): string {
  return mintHmacTicket(payload, secret());
}

export function verifyDeviceTicket(ticket: string): DeviceTicketPayload | null {
  // Same reasoning as verifyTicket in lib/upload-ticket.ts: a
  // misconfigured secret must fail closed to "unauthorized," not crash
  // the route or hint at why to the caller.
  let payload: DeviceTicketPayload | null;
  try {
    payload = verifyHmacTicket<DeviceTicketPayload>(ticket, secret());
  } catch (err) {
    console.error("verifyDeviceTicket: TELEMETRY_HMAC_SECRET is not set", err);
    return null;
  }
  if (!payload || typeof payload.deviceId !== "string") return null;
  return payload;
}

/** control_request.signature — a second, independent check the gateway can verify without a DB round-trip. */
export function signControlRequest(deviceId: string, action: string, seq: number): string {
  return hmacHex(`${deviceId}|${action}|${seq}`, secret());
}

export function verifyControlSignature(deviceId: string, action: string, seq: number, signature: string): boolean {
  return signControlRequest(deviceId, action, seq) === signature;
}
