"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const Products = () => {
    const products = [
        { name: "Industrial Fuel Oil", code: "IFO-380", spec: "Viscosity: 380 cSt", desc: "High-grade thermal energy source." },
        { name: "Base Oil SN500", code: "SN-500", spec: "Density: 0.865", desc: "Premium lubricant base stock." },
        { name: "Paving Bitumen", code: "VG-30", spec: "Penetration: 60/70", desc: "Durable asphalt for infrastructure." },
        { name: "Rubber Process Oil", code: "RPO-A", spec: "Aniline Point: 90°C", desc: "Essential for polymer industries." },
        { name: "Light Diesel Oil", code: "LDO-IN", spec: "Flash Point: >66°C", desc: "Efficient combustion fuel." },
        { name: "Mineral Turpentine", code: "MTO", spec: "Aromatics: 14%", desc: "Versatile industrial solvent." },
    ];

    return (
        <section id="products" className="py-24 bg-[#f8fafc]">
            <div className="container-wide">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="max-w-xl"
                    >
                        <h2 className="h2-section text-[#1a4a3a]">Technical Catalog</h2>
                        <p className="text-slate-600">Precision-engineered petrochemicals. Hover over any product for specification details.</p>
                    </motion.div>
                    <motion.a
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        href="#contact"
                        className="flex items-center gap-2 text-[#246851] font-bold hover:gap-4 transition-all group"
                    >
                        View Full Specifications <ArrowRight size={20} className="group-hover:text-[#34d399] transition-colors" />
                    </motion.a>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((p, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-xl hover:border-[#246851] transition-all duration-300 group overflow-hidden cursor-default"
                        >
                            {/* Technical Header */}
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center group-hover:bg-[#246851]/5 transition-colors">
                                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Grade</span>
                                <span className="font-mono text-xs font-bold text-[#246851]">{p.code}</span>
                            </div>

                            <div className="p-8">
                                <h3 className="font-bold text-xl text-[#1a4a3a] mb-2 group-hover:text-[#246851] transition-colors">{p.name}</h3>
                                <p className="text-slate-500 text-sm mb-4 leading-relaxed">{p.desc}</p>

                                {/* Tech Spec Line */}
                                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 border-t border-slate-100 pt-4 group-hover:border-[#246851]/10">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full group-hover:scale-125 transition-transform" />
                                    <span className="group-hover:text-[#1a4a3a] transition-colors">{p.spec}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Products;
