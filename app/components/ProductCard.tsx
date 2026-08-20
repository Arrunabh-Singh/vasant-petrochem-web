import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/lib/products";

/**
 * One catalog card. The phone artboard closes it with a full-width
 * "spec sheet" bar; the desktop artboard closes it with industry chips
 * and a document glyph.
 */
const ProductCard = ({ product }: { product: Product }) => {
    const specs = product.specs.slice(0, 3);

    return (
        <Link
            href={`/products/${product.slug}`}
            className="group flex flex-col h-full rounded-3xl lg:rounded-[20px] overflow-hidden glass glass-hover"
        >
            <div className="flex justify-between items-center px-[22px] lg:px-6 py-[15px] lg:py-[13px] bg-[linear-gradient(90deg,rgba(255,255,255,0.6),rgba(230,240,237,0.32))] border-b border-white/75">
                <span className="font-mono text-[9.5px] lg:text-[10px] uppercase tracking-[0.16em] lg:tracking-[0.1em] text-slate-400">Grade</span>
                <span className="font-mono text-xs font-bold text-brand">{product.code}</span>
            </div>

            <div className="flex flex-col flex-1 px-[22px] lg:px-6 py-6">
                <h3 className="font-serif lg:font-sans text-2xl lg:text-xl font-bold leading-[1.15] text-brand-dark mb-2.5 lg:mb-2 transition-colors group-hover:text-brand">
                    {product.name}
                </h3>
                <p className="text-[14.5px] lg:text-sm leading-[1.7] text-slate-500 mb-5">{product.description}</p>

                <div className="flex-1 flex flex-col gap-3 lg:gap-2 pt-[18px] lg:pt-4 mb-5 lg:mb-4 border-t border-brand/10">
                    {specs.length > 0 ? (
                        specs.map((spec) => (
                            <div key={spec.label} className="flex items-baseline justify-between gap-3">
                                <span className="spec-key">{spec.label}</span>
                                <span className="spec-val">{spec.value}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-400">Specifications available on request</p>
                    )}
                </div>

                {/* Phone close */}
                <div className="lg:hidden flex items-center justify-between gap-3 h-12 px-[18px] rounded-[14px] bg-[linear-gradient(135deg,rgba(36,104,81,0.1),rgba(52,211,153,0.12))] border border-white/70">
                    <span className="text-[11.5px] font-bold tracking-[0.1em] text-brand-dark">SPEC SHEET</span>
                    <ArrowRight size={18} className="text-brand" />
                </div>

                {/* Desktop close */}
                <div className="hidden lg:flex items-center justify-between gap-3 pt-4 border-t border-brand/10">
                    <div className="flex flex-wrap gap-1.5">
                        {product.industries.map((ind) => (
                            <span key={ind} className="text-[9px] font-bold uppercase tracking-wider text-brand/70 bg-brand/5 px-2 py-0.5 rounded">
                                {ind}
                            </span>
                        ))}
                    </div>
                    <span className="text-brand shrink-0 transition-colors group-hover:text-brand-accent" title="View spec sheet">
                        <FileText size={18} />
                    </span>
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
