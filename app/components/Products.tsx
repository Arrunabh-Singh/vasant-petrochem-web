"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";

const Products = () => {
    const products = [
        {
            name: "Industrial Fuel Oil",
            code: "IFO-380",
            specs: [
                { label: "Viscosity", value: "380 cSt @ 50°C" },
                { label: "Flash Point", value: ">66°C" },
                { label: "Sulfur", value: "<3.5%" },
            ],
            desc: "High-grade thermal energy source for boilers, furnaces, and power generation. Consistent calorific value for uninterrupted operations.",
            industries: ["Power & Energy", "Manufacturing"],
        },
        {
            name: "Base Oil SN500",
            code: "SN-500",
            specs: [
                { label: "Density", value: "0.865 g/ml" },
                { label: "Viscosity Index", value: ">95" },
                { label: "Pour Point", value: "-6°C" },
            ],
            desc: "Premium lubricant base stock for engine oils, hydraulic fluids, and industrial lubricant formulations.",
            industries: ["Automotive", "Lubricants"],
        },
        {
            name: "Paving Bitumen",
            code: "VG-30",
            specs: [
                { label: "Penetration", value: "60/70" },
                { label: "Softening Pt", value: ">47°C" },
                { label: "Ductility", value: ">75 cm" },
            ],
            desc: "Durable paving-grade bitumen for highways, bridges, and urban road construction projects. BIS IS 73:2013 compliant.",
            industries: ["Road Construction", "Infrastructure"],
        },
        {
            name: "Rubber Process Oil",
            code: "RPO-A",
            specs: [
                { label: "Aniline Point", value: "90°C" },
                { label: "Viscosity", value: "95 cSt @ 40°C" },
                { label: "Flash Point", value: ">220°C" },
            ],
            desc: "Aromatic and naphthenic process oils for rubber compounding, tire manufacturing, and polymer processing.",
            industries: ["Rubber", "Polymers"],
        },
        {
            name: "Light Diesel Oil",
            code: "LDO-IN",
            specs: [
                { label: "Flash Point", value: ">66°C" },
                { label: "Density", value: "0.85-0.87" },
                { label: "Cetane No.", value: ">45" },
            ],
            desc: "Clean-burning, efficient combustion fuel for DG sets, industrial burners, and start-up fuel applications.",
            industries: ["Power", "Manufacturing"],
        },
        {
            name: "Mineral Turpentine Oil",
            code: "MTO",
            specs: [
                { label: "Aromatics", value: "14%" },
                { label: "Distillation", value: "130-200°C" },
                { label: "Purity", value: ">99%" },
            ],
            desc: "Versatile industrial solvent for paint thinning, surface preparation, degreasing, and chemical extraction.",
            industries: ["Paint & Coatings", "Chemical"],
        },
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
                        <span className="text-[#34d399] font-bold tracking-[0.2em] uppercase text-xs">Product Catalog</span>
                        <h2 className="h2-section text-[#1a4a3a] mt-2">Technical Specifications</h2>
                        <p className="text-slate-600">Precision-engineered petrochemicals with full technical data. Contact us for detailed TDS/SDS documents.</p>
                    </motion.div>
                    <motion.a
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        href="#contact"
                        className="flex items-center gap-2 text-[#246851] font-bold hover:gap-4 transition-all group"
                    >
                        Request Full Specifications <ArrowRight size={20} className="group-hover:text-[#34d399] transition-colors" />
                    </motion.a>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((p, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.08 }}
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-xl hover:border-[#246851] transition-all duration-300 group overflow-hidden cursor-default flex flex-col"
                        >
                            {/* Technical Header */}
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center group-hover:bg-[#246851]/5 transition-colors">
                                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Grade</span>
                                <span className="font-mono text-xs font-bold text-[#246851]">{p.code}</span>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="font-bold text-xl text-[#1a4a3a] mb-2 group-hover:text-[#246851] transition-colors">{p.name}</h3>
                                <p className="text-slate-500 text-sm mb-5 leading-relaxed">{p.desc}</p>

                                {/* Specs Table */}
                                <div className="border-t border-slate-100 pt-4 mb-4 space-y-2 flex-1">
                                    {p.specs.map((spec, sidx) => (
                                        <div key={sidx} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400 font-mono uppercase tracking-wider">{spec.label}</span>
                                            <span className="font-mono font-bold text-[#1a4a3a] group-hover:text-[#246851] transition-colors">{spec.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Industries + CTA */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex flex-wrap gap-1.5">
                                        {p.industries.map((ind, iidx) => (
                                            <span key={iidx} className="text-[9px] font-bold uppercase tracking-wider text-[#246851]/70 bg-[#246851]/5 px-2 py-0.5 rounded">
                                                {ind}
                                            </span>
                                        ))}
                                    </div>
                                    <a href="#contact" className="text-[#246851] hover:text-[#34d399] transition-colors" title="Request TDS/SDS">
                                        <FileText size={18} />
                                    </a>
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
