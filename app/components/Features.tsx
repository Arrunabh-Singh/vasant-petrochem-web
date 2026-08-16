"use client";

import { motion } from "framer-motion";
import { Droplets, Globe, ShieldCheck } from "lucide-react";

const Features = () => {
    const features = [
        {
            icon: Droplets,
            title: "Manufacturing & Trading",
            desc: "We manufacture our own product lines and source branded lubricants from trusted suppliers to cover what we don't make ourselves.",
            delay: 0
        },
        {
            icon: Globe,
            title: "Central India Coverage",
            desc: "Based in Indore, serving industrial buyers across Madhya Pradesh and neighboring states.",
            delay: 0.2
        },
        {
            icon: ShieldCheck,
            title: "Careful Handling",
            desc: "Attentive storage and handling practices across our facility and supply chain.",
            delay: 0.4
        }
    ];

    return (
        <section id="about" className="py-24 bg-white relative overflow-hidden">
            {/* Subtle Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none bg-[radial-gradient(var(--color-brand)_1px,transparent_1px)] [background-size:20px_20px]" />

            <div className="container-wide relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-brand-accent font-bold tracking-[0.2em] uppercase text-xs"
                    >
                        Why Choose Vasant
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-serif font-bold text-brand-dark mt-3"
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
                            className="group p-8 rounded-2xl bg-surface hover:bg-white border border-transparent hover:border-brand/10 hover:shadow-2xl transition-all duration-300 cursor-default relative overflow-hidden"
                        >
                            {/* Hover Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-brand/0 to-brand-accent/0 group-hover:from-brand/5 group-hover:to-brand-accent/10 transition-colors duration-500" />

                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-brand/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-brand transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-brand/30">
                                    <f.icon className="w-8 h-8 text-brand group-hover:text-white transition-colors duration-300" />
                                </div>
                                <h3 className="text-xl font-bold text-brand-dark mb-4">{f.title}</h3>
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
