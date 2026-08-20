import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { contact } from "../content";
import WhatsAppIcon from "./WhatsAppIcon";

const quoteMessage = encodeURIComponent("Hello, I'd like to request a quote.");

/**
 * Phone/tablet only. The three things a bulk buyer actually wants within
 * thumb reach; the desktop equivalent is the WhatsApp pill + nav CTA.
 */
const MobileActionBar = () => (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-58 action-bar grid grid-cols-[56px_56px_1fr] gap-2.5 px-4 pt-3 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.94))] backdrop-blur-[26px] backdrop-saturate-[1.7] border-t border-white/80 shadow-[0_-18px_44px_-26px_rgba(15,46,36,0.45)]">
        <a
            href={contact.phoneHref}
            aria-label="Call Vasant Petrochem"
            className="flex items-center justify-center h-14 rounded-2xl text-brand-dark bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(255,255,255,0.5))] border border-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
        >
            <Phone size={21} />
        </a>
        <a
            href={`https://wa.me/${contact.whatsapp}?text=${quoteMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp Vasant Petrochem"
            className="flex items-center justify-center h-14 rounded-2xl text-white bg-[linear-gradient(135deg,#246851,#1a4a3a)] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
        >
            <WhatsAppIcon size={21} />
        </a>
        <Link
            href="/contact"
            className="flex items-center justify-center gap-2.5 h-14 rounded-2xl text-[13px] font-bold tracking-[0.04em] text-brand-deep bg-brand-accent border border-white/45 shadow-[0_20px_40px_-20px_rgba(52,211,153,0.65),inset_0_1px_0_rgba(255,255,255,0.6)]"
        >
            GET A QUOTE
            <ArrowRight size={17} />
        </Link>
    </div>
);

export default MobileActionBar;
