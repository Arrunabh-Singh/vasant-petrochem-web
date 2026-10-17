import { AlertTriangle } from "lucide-react";
import { contact } from "@/app/content";

/**
 * Shown in place of the product grid when the catalog read failed, so an
 * outage reads as an outage rather than as "Vasant Petrochem sells
 * nothing" (audit.md M20). Always offers the phone/WhatsApp path, which
 * does not depend on the database being up.
 */
export default function CatalogUnavailable() {
  return (
    <div
      role="status"
      className="flex items-start gap-3.5 p-5 lg:p-6 rounded-[20px] border border-amber-300/70 bg-amber-50/80"
    >
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" aria-hidden />
      <div>
        <p className="text-[15px] font-bold text-amber-900 mb-1">
          Our product catalog is temporarily unavailable.
        </p>
        <p className="text-[14.5px] leading-[1.65] text-amber-800">
          This is a technical fault on our side, not a change to what we supply. Call{" "}
          <a href={contact.phoneHref} className="underline font-semibold">
            {contact.phone}
          </a>{" "}
          or email{" "}
          <a href={`mailto:${contact.email}`} className="underline font-semibold">
            {contact.email}
          </a>{" "}
          and we will send current specs and pricing directly.
        </p>
      </div>
    </div>
  );
}
