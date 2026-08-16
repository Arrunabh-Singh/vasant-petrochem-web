"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

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
                <div className="flex flex-wrap gap-2 mb-10">
                    <button
                        onClick={() => setActiveIndustry(null)}
                        className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-colors ${
                            activeIndustry === null ? "bg-brand text-white" : "bg-brand/5 text-brand hover:bg-brand/10"
                        }`}
                    >
                        All Products
                    </button>
                    {industries.map((ind) => (
                        <button
                            key={ind}
                            onClick={() => setActiveIndustry(ind)}
                            className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-colors ${
                                activeIndustry === ind ? "bg-brand text-white" : "bg-brand/5 text-brand hover:bg-brand/10"
                            }`}
                        >
                            {ind}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p, idx) => (
                    <ProductCard key={p.id} product={p} index={idx} />
                ))}
            </div>

            {filtered.length === 0 && (
                <p className="text-slate-500 text-center py-16">No products in this category yet.</p>
            )}
        </div>
    );
};

export default ProductGrid;
