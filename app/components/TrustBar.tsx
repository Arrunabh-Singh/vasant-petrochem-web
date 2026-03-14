"use client";

import { motion } from "framer-motion";

const stats = [
    { value: "50,000+", label: "KL Capacity", suffix: "" },
    { value: "99.9%", label: "Purity Standards", suffix: "" },
    { value: "6+", label: "Product Lines", suffix: "" },
    { value: "24/7", label: "Operations", suffix: "" },
];

const TrustBar = () => {
    return (
        <section className="relative bg-[#1a4a3a] py-12 overflow-hidden">
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
                            <p className="text-3xl md:text-4xl font-bold text-white mb-1 font-serif">
                                {stat.value}
                            </p>
                            <p className="text-[11px] text-[#34d399] font-bold uppercase tracking-[0.2em]">
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
