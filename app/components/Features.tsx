"use client";

import { motion } from "framer-motion";
import { Droplets, Globe, ShieldCheck } from "lucide-react";

const Features = () => {
    const features = [
        {
            icon: Droplets,
            title: "Molecular Purity",
            desc: "Our fractional distillation achieves 99.9% purity, ensuring stability in your formulations.",
            delay: 0
        },
        {
            icon: Globe,
            title: "Sustainable Chain",
            desc: "Committed to green chemistry principles and reduced carbon footprint logistics.",
            delay: 0.2
        },
        {
            icon: ShieldCheck,
            title: "Industrial Safety",
            desc: "State-of-the-art facility designed with automated fail-safes and rigorous protocols.",
            delay: 0.4
        }
    ];

    return (
        <section id="about" className="py-24 bg-white relative overflow-hidden">
            {/* Subtle Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none bg-[radial-gradient(#246851_1px,transparent_1px)] [background-size:20px_20px]" />

            <div className="container-wide relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-[#34d399] font-bold tracking-[0.2em] uppercase text-xs"
                    >
                        Why Choose Vasant
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-serif font-bold text-[#1a4a3a] mt-3"
                    >
                        Engineering Excellence
                    </motion.h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((f, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: f.delay, duration: 0.5 }}
                            whileHover={{ y: -5 }}
                            className="group p-8 rounded-2xl bg-[#f8fafc] hover:bg-white border border-transparent hover:border-[#246851]/10 hover:shadow-2xl transition-all duration-300 cursor-default relative overflow-hidden"
                        >
                            {/* Hover Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#246851]/0 to-[#34d399]/0 group-hover:from-[#246851]/5 group-hover:to-[#34d399]/10 transition-colors duration-500" />

                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-[#246851]/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#246851] transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-[#246851]/30">
                                    <f.icon className="w-8 h-8 text-[#246851] group-hover:text-white transition-colors duration-300" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1a4a3a] mb-4">{f.title}</h3>
                                <p className="text-slate-500 leading-relaxed text-sm group-hover:text-slate-600">{f.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
