"use client";

import { motion } from "framer-motion";
import { Truck, Paintbrush, HardHat, Pill, Factory, Fuel } from "lucide-react";

const industries = [
    {
        icon: HardHat,
        name: "Road Construction",
        desc: "Paving-grade bitumen for highways, bridges, and urban infrastructure projects across India.",
        products: ["VG-30 Bitumen", "VG-40 Bitumen"],
    },
    {
        icon: Paintbrush,
        name: "Paint & Coatings",
        desc: "High-purity mineral turpentine and solvents for paint, varnish, and industrial coating formulations.",
        products: ["Mineral Turpentine", "Industrial Solvents"],
    },
    {
        icon: Factory,
        name: "Rubber & Polymers",
        desc: "Process oils engineered for rubber compounding, tire manufacturing, and polymer processing.",
        products: ["Rubber Process Oil", "Base Oil SN500"],
    },
    {
        icon: Fuel,
        name: "Power & Energy",
        desc: "Industrial fuel oils and light diesel for boilers, furnaces, and power generation plants.",
        products: ["Industrial Fuel Oil", "Light Diesel Oil"],
    },
    {
        icon: Truck,
        name: "Automotive & Lubricants",
        desc: "Premium base oils serving as feedstock for engine oils, gear oils, and industrial lubricants.",
        products: ["Base Oil SN150", "Base Oil SN500"],
    },
    {
        icon: Pill,
        name: "Pharmaceutical",
        desc: "Ultra-refined petroleum jelly and white oils meeting pharmacopoeia-grade standards.",
        products: ["Petroleum Jelly", "White Mineral Oil"],
    },
];

const Industries = () => {
    return (
        <section id="industries" className="py-24 bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-gradient-radial from-[#246851]/5 to-transparent rounded-bl-full pointer-events-none blur-3xl" />

            <div className="container-wide relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-[#34d399] font-bold tracking-[0.2em] uppercase text-xs"
                    >
                        Markets We Serve
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-serif font-bold text-[#1a4a3a] mt-3"
                    >
                        Industries & Applications
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-500 mt-4 max-w-lg mx-auto"
                    >
                        From road infrastructure to pharmaceutical manufacturing, our products power diverse sectors across Central India.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {industries.map((ind, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.08 }}
                            className="group p-8 rounded-2xl bg-[#f8fafc] hover:bg-white border border-transparent hover:border-[#246851]/10 hover:shadow-xl transition-all duration-300 cursor-default"
                        >
                            <div className="w-14 h-14 bg-[#246851]/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#246851] transition-all duration-300">
                                <ind.icon className="w-7 h-7 text-[#246851] group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="text-lg font-bold text-[#1a4a3a] mb-2">{ind.name}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-4">{ind.desc}</p>
                            <div className="flex flex-wrap gap-2">
                                {ind.products.map((product, pidx) => (
                                    <span
                                        key={pidx}
                                        className="text-[10px] font-bold uppercase tracking-wider text-[#246851] bg-[#246851]/5 px-3 py-1 rounded-full"
                                    >
                                        {product}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Industries;
