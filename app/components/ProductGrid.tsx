"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";
import Reveal from "./Reveal";

const onChip =
    "text-white border-white/30 bg-[linear-gradient(135deg,#246851,#1a4a3a)] shadow-[0_18px_34px_-18px_rgba(15,46,36,0.75),inset_0_1px_0_rgba(255,255,255,0.3)]";
const offChip =
    "text-brand-dark border-white/85 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(255,255,255,0.42))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_26px_-20px_rgba(15,46,36,0.5)]";

const ProductGrid = ({ products, showFilter = false }: { products: Product[]; showFilter?: boolean }) => {
    const [activeIndustry, setActiveIndustry] = useState<string | null>(null);

    const industries = useMemo(
        () => Array.from(new Set(products.flatMap((p) => p.industries))).sort(),
        [products]
    );

    const filtered = activeIndustry
        ? products.filter((p) => p.industries.includes(activeIndustry))
        : products;

    return (
        <div>
            {showFilter && industries.length > 0 && (
                // Phone: a single-row scroller. Desktop: wraps.
                <div className="flex lg:flex-wrap gap-2.5 lg:gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-5 lg:pb-0 mb-2 lg:mb-10 -mx-[18px] px-[18px] lg:mx-0 lg:px-0">
                    {[null, ...industries].map((ind) => (
                        <button
                            key={ind ?? "all"}
                            type="button"
                            onClick={() => setActiveIndustry(ind)}
                            className={`shrink-0 h-11 lg:h-auto flex items-center px-[18px] lg:py-2.5 rounded-full border text-xs font-bold tracking-[0.04em] lg:uppercase lg:tracking-wider whitespace-nowrap transition-all duration-300 lg:hover:-translate-y-0.5 ${
                                activeIndustry === ind ? onChip : offChip
                            }`}
                        >
                            {ind ?? "All products"}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 lg:gap-6">
                {filtered.map((p, idx) => (
                    <Reveal key={p.id} delay={(idx % 6) * 0.06} className="h-full">
                        <ProductCard product={p} />
                    </Reveal>
                ))}
            </div>

            {filtered.length === 0 && (
                <p className="text-slate-500 text-center py-16">No products in this category yet.</p>
            )}
        </div>
    );
};

export default ProductGrid;
