import { contact } from "../content";
import WhatsAppIcon from "./WhatsAppIcon";

const message = encodeURIComponent("Hello, I'd like to request a quote.");

/** Desktop-only pill. Below lg the bottom action bar carries WhatsApp instead. */
const WhatsAppButton = () => (
    <a
        href={`https://wa.me/${contact.whatsapp}?text=${message}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="hidden lg:flex fixed right-6 bottom-6 z-40 items-center gap-3 px-6 py-[15px] rounded-full text-[13px] font-bold text-white whitespace-nowrap bg-[linear-gradient(135deg,rgba(36,104,81,0.94),rgba(26,74,58,0.9))] backdrop-blur-[16px] backdrop-saturate-[1.5] border border-white/30 shadow-[0_26px_50px_-20px_rgba(15,46,36,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-300 hover:-translate-y-[3px] hover:bg-brand-dark"
    >
        <WhatsAppIcon size={20} />
        Chat on WhatsApp
    </a>
);

export default WhatsAppButton;
