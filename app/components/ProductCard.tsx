"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/lib/products";

const ProductCard = ({ product, index = 0 }: { product: Product; index?: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (index % 6) * 0.08 }}
            whileHover={{ y: -5 }}
        >
            <Link
                href={`/products/${product.slug}`}
                className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-xl hover:border-brand transition-all duration-300 group overflow-hidden cursor-pointer flex flex-col h-full"
            >
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center group-hover:bg-brand/5 transition-colors">
                    <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Grade</span>
                    <span className="font-mono text-xs font-bold text-brand">{product.code}</span>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-xl text-brand-dark mb-2 group-hover:text-brand transition-colors">{product.name}</h3>
                    <p className="text-slate-500 text-sm mb-5 leading-relaxed">{product.description}</p>

                    <div className="border-t border-slate-100 pt-4 mb-4 space-y-2 flex-1">
                        {product.specs.length > 0 ? (
                            product.specs.map((spec) => (
                                <div key={spec.label} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-mono uppercase tracking-wider">{spec.label}</span>
                                    <span className="font-mono font-bold text-brand-dark group-hover:text-brand transition-colors">{spec.value}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 text-xs">Specifications available on request</p>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1.5">
                            {product.industries.map((ind) => (
                                <span key={ind} className="text-[9px] font-bold uppercase tracking-wider text-brand/70 bg-brand/5 px-2 py-0.5 rounded">
                                    {ind}
                                </span>
                            ))}
                        </div>
                        <span className="text-brand group-hover:text-brand-accent transition-colors" title="View spec sheet">
                            <FileText size={18} />
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};

export default ProductCard;
