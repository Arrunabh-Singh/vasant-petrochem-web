"use client";

import { motion, useScroll, useTransform, Variants } from "framer-motion";
import Image from "next/image";

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

const Hero = () => {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, 100]);
    const opacity = useTransform(scrollY, [0, 500], [1, 0.5]);

    return (
        <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-[#f8fafc] pt-32 pb-20">
            {/* Brand Pattern Background */}
            <div className="absolute inset-0 bg-grid-pattern opacity-60 z-0" />

            {/* Organic Shape Decoration */}
            <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-gradient-radial from-[#246851]/10 to-transparent rounded-bl-full z-0 pointer-events-none blur-3xl opacity-60" />

            <div className="container-wide relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="lg:w-1/2"
                >
                    <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md border border-[#246851]/20 shadow-sm mb-10 w-fit">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#246851] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#246851]"></span>
                        </span>
                        <span className="text-[#1a4a3a] font-bold tracking-widest uppercase text-[10px] sm:text-[11px]">Industrial Excellence • Est. 2025</span>
                    </motion.div>

                    <motion.h1 variants={fadeInUp} className="h1-hero mb-8 leading-[1.1]">
                        Advanced <br />
                        <span className="text-gradient-brand">Petrochemical Solutions</span>
                    </motion.h1>

                    <motion.p variants={fadeInUp} className="text-slate-600 text-lg md:text-xl mb-12 leading-relaxed font-light max-w-xl">
                        Vasant Petrochem delivers premium industrial solvents and fuels engineered for performance. We combine cutting-edge refining technology with a robust supply chain to power Central India&apos;s manufacturing sector.
                    </motion.p>

                    <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-5">
                        <a href="#products" className="btn-primary px-10 shadow-xl shadow-[#246851]/10 hover:shadow-[#246851]/25">
                            VIEW CATALOG
                        </a>
                        <a href="#contact" className="btn-outline-brand px-10">
                            CONTACT SALES
                        </a>
                    </motion.div>
                </motion.div>

                {/* Hero Visual */}
                <motion.div
                    style={{ y, opacity }}
                    className="lg:w-1/2 relative w-full"
                >
                    <div className="relative w-full aspect-[4/3] max-w-[800px] mx-auto group perspective-1000">
                        {/* Backing decorative element */}
                        <div className="absolute -inset-4 border-2 border-[#246851]/10 rounded-2xl z-0 transition-transform duration-700 group-hover:rotate-1"></div>

                        <div className="relative h-full w-full rounded-xl overflow-hidden shadow-2xl z-10">
                            <Image
                                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1500&auto=format&fit=crop"
                                alt="Industrial Refinery Operations"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                priority
                            />

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#1a4a3a]/40 to-transparent mix-blend-multiply opacity-60"></div>
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
                            className="absolute -bottom-10 -left-4 sm:-left-10 bg-white/95 backdrop-blur-sm p-6 rounded-lg shadow-2xl border-l-4 border-l-[#246851] max-w-[240px] z-20 hidden md:block"
                        >
                            <p className="text-3xl font-bold text-[#1a4a3a] mb-1">99.9%</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purity Standards</p>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Exceeding ISO requirements for industrial solvents.</p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
