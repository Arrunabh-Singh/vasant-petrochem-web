import { Package } from "lucide-react";
import { contact } from "../content";
import Reveal from "./Reveal";

const waHref = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
    "Hello, I'm looking for a branded industrial lubricant / specialty oil. Can you check current stock?"
)}`;

const body =
    "Beyond our own manufactured lines, we source and supply a wide range of branded industrial lubricants and specialty oils — including Klüber Cassida-series products — based on what you need. Ask us for current stock.";

const TradingLines = () => (
    <section className="wash-top pb-14 lg:py-[clamp(56px,9vw,96px)]">
        <div className="container-wide">
            {/* Phone: light glass card, stacked. */}
            <div className="lg:hidden p-6 rounded-[26px] glass">
                <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center mb-5 bg-[linear-gradient(150deg,rgba(52,211,153,0.24),rgba(36,104,81,0.08))] border border-white/75">
                    <Package size={24} className="text-brand" strokeWidth={1.9} />
                </div>
                <h2 className="font-serif text-[26px] font-bold leading-[1.2] text-brand-dark mb-3">Also trading</h2>
                <p className="text-[15px] leading-[1.7] text-slate-500 mb-6 text-pretty">{body}</p>
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-solid w-full">
                    ASK ON WHATSAPP
                </a>
            </div>

            {/* Desktop: dark slab, side-by-side. */}
            <Reveal className="hidden lg:block">
                <div className="relative overflow-hidden rounded-[28px] p-[clamp(40px,5vw,64px)] flex flex-wrap items-center justify-between gap-8 panel-deep">
                    <div className="flex gap-6 items-start min-w-[300px] flex-1">
                        <div className="w-14 h-14 shrink-0 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                            <Package size={24} className="text-brand-accent" />
                        </div>
                        <div>
                            <h2 className="font-serif text-[clamp(22px,2.4vw,30px)] font-bold text-white mb-3">Also Trading</h2>
                            <p className="max-w-xl text-base leading-[1.7] text-slate-300">{body}</p>
                        </div>
                    </div>
                    <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-solid shrink-0 whitespace-nowrap">
                        Ask on WhatsApp
                    </a>
                </div>
            </Reveal>
        </div>
    </section>
);

export default TradingLines;
