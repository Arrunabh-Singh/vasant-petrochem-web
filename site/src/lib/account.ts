/**
 * How the buyer portal shows money, quantities, dates and statuses: the brand
 * book's international forms ("INR 66,500.00", "21 October 2026"), never
 * Indian digit grouping, which reads wrongly abroad.
 */
import { t } from "./ui.ts";

export const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "code" }).format(amount);

export const quantity = (n: number, uom: string) => `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 }).format(n)} ${uom}`;

export const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) : "";

type Kind = "quotation" | "order" | "shipment" | "request" | "kyc";

/** A status as the buyer reads it; an unknown one shows as it is. */
export const statusLabel = (kind: Kind, status: string): string =>
  (t(`account.status.${kind}.${status}` as Parameters<typeof t>[0]) as string | undefined) ?? status;

/** A sent quotation past its date shows as expired. */
export const quotationStatus = (q: { status: string; expired: boolean }) => (q.expired ? "expired" : q.status);

/** "Admin", or with `full` what the role may do: "Admin: everything, including the team". */
export function roleLabel(role: string, full = false): string {
  const text = (t(`account.role.${role}` as Parameters<typeof t>[0]) as string | undefined) ?? role;
  return full ? text : (text.split(":")[0] ?? text);
}

export const kindLabel = (kind: string) => (t(`account.kind.${kind}` as Parameters<typeof t>[0]) as string | undefined) ?? kind;
