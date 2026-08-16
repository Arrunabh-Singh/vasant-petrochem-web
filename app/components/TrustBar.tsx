"use client";

import { motion } from "framer-motion";

const TrustBar = ({ productCount }: { productCount: number }) => {
    const stats = [
        { value: `${productCount}+`, label: "Product Lines" },
        { value: "Indore, MP", label: "Based In" },
        { value: "Mfg. + Trading", label: "Business Model" },
        { value: "B2B", label: "Bulk Supply" },
    ];

    return (
        <section className="relative bg-brand-dark py-12 overflow-hidden">
            <div className="absolute inset-0 opacity-5 bg-[linear-gradient(45deg,#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="container-wide relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="text-center"
                        >
                            <p className="text-2xl md:text-3xl font-bold text-white mb-1 font-serif">
                                {stat.value}
                            </p>
                            <p className="text-[11px] text-brand-accent font-bold uppercase tracking-[0.2em]">
                                {stat.label}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TrustBar;
