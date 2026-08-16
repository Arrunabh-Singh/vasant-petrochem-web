import { Package } from "lucide-react";
import { contact } from "../content";

const TradingLines = () => (
    <section className="py-24 bg-white border-t border-slate-100">
        <div className="container-wide">
            <div className="bg-brand-dark rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
                <div className="flex gap-6 items-start">
                    <div className="w-14 h-14 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0 border border-brand-accent/20">
                        <Package size={24} className="text-brand-accent" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3">Also Trading</h2>
                        <p className="text-slate-300 leading-relaxed max-w-xl">
                            Beyond our own manufactured lines, we source and supply a wide range of branded
                            industrial lubricants and specialty oils — including Klüber Cassida-series
                            products — based on what you need. Ask us for current stock.
                        </p>
                    </div>
                </div>
                <a
                    href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Hello, I'm looking for a branded industrial lubricant / specialty oil. Can you check current stock?")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary shrink-0 whitespace-nowrap"
                >
                    Ask on WhatsApp
                </a>
            </div>
        </div>
    </section>
);

export default TradingLines;
