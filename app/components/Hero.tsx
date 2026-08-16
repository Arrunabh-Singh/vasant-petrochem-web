"use client";

import { motion, useScroll, useTransform, Variants } from "framer-motion";
import Link from "next/link";
import RefineryVisual from "./RefineryVisual";

// Animation Variants
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: "easeOut"
        }
    }
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2
        }
    }
};

const Hero = ({ productCount }: { productCount: number }) => {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, 100]);
    const opacity = useTransform(scrollY, [0, 500], [1, 0.5]);

    return (
        <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-surface pt-32 pb-20">
            {/* Brand Pattern Background */}
            <div className="absolute inset-0 bg-grid-pattern opacity-60 z-0" />

            {/* Organic Shape Decoration */}
            <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-radial from-brand/10 to-transparent rounded-bl-full z-0 pointer-events-none blur-3xl opacity-60" />

            <div className="container-wide relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="lg:w-1/2"
                >
                    <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md border border-brand/20 shadow-sm mb-10 w-fit">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                        </span>
                        <span className="text-brand-dark font-bold tracking-widest uppercase text-[10px] sm:text-[11px]">Industrial Excellence • Est. 2025</span>
                    </motion.div>

                    <motion.h1 variants={fadeInUp} className="h1-hero mb-8 leading-[1.1]">
                        Advanced <br />
                        <span className="text-gradient-brand">Petrochemical Solutions</span>
                    </motion.h1>

                    <motion.p variants={fadeInUp} className="text-slate-600 text-lg md:text-xl mb-12 leading-relaxed font-light max-w-xl">
                        Vasant Petrochem manufactures and trades industrial oils, fuels, and lubricants from Indore, serving Central India&apos;s manufacturing sector with a reliable supply chain.
                    </motion.p>

                    <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-5">
                        <Link href="/contact" className="btn-primary px-10 shadow-xl shadow-brand/10 hover:shadow-brand/25">
                            GET A FREE QUOTE
                        </Link>
                        <Link href="/products" className="btn-outline-brand px-10">
                            VIEW CATALOG
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Hero Visual */}
                <motion.div
                    style={{ y, opacity }}
                    className="lg:w-1/2 relative w-full"
                >
                    <div className="relative w-full aspect-[4/3] max-w-[800px] mx-auto group perspective-1000">
                        {/* Backing decorative element */}
                        <div className="absolute -inset-4 border-2 border-brand/10 rounded-2xl z-0 transition-transform duration-700 group-hover:rotate-1"></div>

                        <div className="relative h-full w-full rounded-xl overflow-hidden shadow-2xl z-10">
                            <RefineryVisual />
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark/40 to-transparent mix-blend-multiply opacity-60"></div>
                        </div>

                        {/* Floating Stat Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0, y: [0, -10, 0] }}
                            transition={{
                                opacity: { delay: 1, duration: 0.5 },
                                x: { delay: 1, duration: 0.5 },
                                y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                            }}
                            className="absolute -bottom-10 -left-4 sm:-left-10 bg-white/95 backdrop-blur-sm p-6 rounded-lg shadow-2xl border-l-4 border-l-brand max-w-[240px] z-20 hidden md:block"
                        >
                            <p className="text-3xl font-bold text-brand-dark mb-1">{productCount}+</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Lines</p>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Manufactured and traded industrial oils, fuels &amp; lubricants.</p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
