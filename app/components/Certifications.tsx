"use client";

import { motion } from "framer-motion";
import { Award, Leaf, Shield, FileCheck } from "lucide-react";

const certifications = [
    {
        icon: Award,
        title: "ISO 9001:2015",
        desc: "Quality Management System certified, ensuring consistent product quality and continuous improvement.",
    },
    {
        icon: Leaf,
        title: "ISO 14001:2015",
        desc: "Environmental Management System compliant, minimizing environmental impact across all operations.",
    },
    {
        icon: Shield,
        title: "ISO 45001:2018",
        desc: "Occupational Health & Safety standards maintained for a safe and secure working environment.",
    },
    {
        icon: FileCheck,
        title: "BIS Certified",
        desc: "Bureau of Indian Standards certified products meeting national quality benchmarks.",
    },
];

const Certifications = () => {
    return (
        <section id="certifications" className="py-24 bg-[#f8fafc] relative overflow-hidden">
            <div className="container-wide relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-[#34d399] font-bold tracking-[0.2em] uppercase text-xs"
                    >
                        Quality Assurance
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-serif font-bold text-[#1a4a3a] mt-3"
                    >
                        Certifications & Compliance
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-500 mt-4 max-w-lg mx-auto"
                    >
                        Every product meets stringent international quality, safety, and environmental standards.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {certifications.map((cert, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="text-center p-8 rounded-2xl bg-white border border-slate-100 hover:border-[#246851]/20 hover:shadow-lg transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 mx-auto bg-[#246851]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#246851] transition-all duration-300">
                                <cert.icon className="w-8 h-8 text-[#246851] group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="font-bold text-[#1a4a3a] text-lg mb-2">{cert.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{cert.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Certifications;
