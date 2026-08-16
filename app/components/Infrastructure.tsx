"use client";

import { motion } from "framer-motion";
import { Factory, ShieldCheck } from "lucide-react";
import StorageTanksVisual from "./StorageTanksVisual";

const Infrastructure = () => {
    return (
        <section id="infrastructure" className="py-32 bg-brand-dark text-white relative overflow-hidden">
            {/* Abstract Geometry */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-[linear-gradient(45deg,#ffffff_1px,transparent_1px)] [background-size:30px_30px]" />

            <div className="container-wide relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-24">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="lg:w-1/2"
                    >
                        <div className="inline-block px-4 py-1 border border-white/20 rounded-full bg-white/5 mb-8">
                            <span className="text-brand-accent text-[10px] font-bold tracking-[0.3em] uppercase">Our Facility</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight">
                            Manufacturing <br /><span className="text-brand-accent">Infrastructure</span>
                        </h2>
                        <p className="text-slate-300 text-lg leading-relaxed mb-10 font-light max-w-lg">
                            Our Mangaliya facility handles blending and storage for our manufactured product lines, giving us direct control over consistency and supply for our partners.
                        </p>

                        <div className="space-y-8">
                            <div className="flex items-start gap-6 border-b border-white/10 pb-6 group">
                                <div className="w-14 h-14 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0 border border-brand-accent/20 group-hover:bg-brand-accent/20 transition-colors">
                                    <Factory size={24} className="text-brand-accent" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg mb-1">Automated Processing</h4>
                                    <p className="text-slate-400 text-sm leading-relaxed">Computer-controlled blending ensures consistent viscosity and chemical composition across every batch.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-6 group">
                                <div className="w-14 h-14 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0 border border-brand-accent/20 group-hover:bg-brand-accent/20 transition-colors">
                                    <ShieldCheck size={24} className="text-brand-accent" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg mb-1">Quality Checks</h4>
                                    <p className="text-slate-400 text-sm leading-relaxed">In-house testing on manufactured batches before they leave the facility.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="lg:w-1/2 relative h-[600px] w-full"
                    >
                        {/* Architectural Diagram Vibe */}
                        <div className="absolute top-10 -right-10 w-2/3 h-2/3 border-2 border-brand-accent/20 rounded-2xl z-0 hidden lg:block" />

                        <div className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl z-10">
                            <StorageTanksVisual />
                        </div>

                        {/* Facility caption */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 bg-black/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-white/10 z-20 w-[90%] sm:w-full max-w-[280px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                        >
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em]">Mangaliya, Indore</span>
                            <p className="text-white font-bold text-lg mt-2">Blending &amp; Storage</p>
                            <p className="text-slate-400 text-sm mt-2 leading-relaxed">Manufacturing facility for our own product lines.</p>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default Infrastructure;
