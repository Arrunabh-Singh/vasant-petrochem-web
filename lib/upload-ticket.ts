import { mintHmacTicket, verifyHmacTicket } from "./hmac-ticket";
import type { DocClass } from "./document-policy";

/**
 * document-storage-hardening.md §5.7: the office box holds a short-lived
 * upload ticket, never a service key. Scoped to exactly "uploader on
 * these classes, until this time" — minted by an admin session
 * (upload-ticket route), verified by the upload route as an alternative
 * to a Supabase session cookie.
 */
export type UploadTicketPayload = {
  sub: string; // the uploader identity's app_users email
  // "etl-inbox" is not a vault doc_class — it scopes a ticket to the raw
  // ETL staging route (app/api/etl/upload) instead of the document vault.
  classes: (DocClass | "etl-inbox")[];
  exp: number; // epoch seconds
};

function secret(): string {
  const key = process.env.DOC_UPLOAD_TICKET_SECRET;
  if (!key) throw new Error("DOC_UPLOAD_TICKET_SECRET is not set.");
  return key;
}

export function mintTicket(payload: UploadTicketPayload): string {
  return mintHmacTicket(payload, secret());
}

export function verifyTicket(ticket: string): UploadTicketPayload | null {
  // A misconfigured secret and an invalid ticket must look identical to
  // the caller — fail closed to a clean "unauthorized," never a 500 that
  // could hint at *why* (and never crash the route entirely).
  let payload: UploadTicketPayload | null;
  try {
    payload = verifyHmacTicket<UploadTicketPayload>(ticket, secret());
  } catch (err) {
    console.error("verifyTicket: DOC_UPLOAD_TICKET_SECRET is not set", err);
    return null;
  }
  if (!payload || !Array.isArray(payload.classes) || typeof payload.sub !== "string") return null;
  return payload;
}
