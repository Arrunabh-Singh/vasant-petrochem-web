"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "../content";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname.startsWith(href);

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-brand/10 supports-[backdrop-filter]:bg-white/60"
        >
            <div className="container-wide">
                <div className="flex justify-between items-center h-24">
                    {/* Logo */}
                    <Link href="/" className="flex-shrink-0 flex items-center gap-6 group cursor-pointer">
                        <div className="relative w-20 h-20 transition-transform duration-500 group-hover:scale-105">
                            <Image src="/vasant_logo.png" alt="Vasant Petrochem Logo" fill className="object-contain" priority />
                        </div>
                        <div className="flex flex-col border-l border-brand/20 pl-6 h-12 justify-center">
                            <span className="font-serif text-2xl font-bold text-brand-dark tracking-wide leading-none">VASANT</span>
                            <span className="text-[10px] font-bold text-brand tracking-[0.3em] uppercase mt-1">Petrochem</span>
                        </div>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-10 items-center">
                        {nav.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`text-xs font-bold transition-colors uppercase tracking-[0.15em] relative group ${
                                    isActive(item.href) ? "text-brand" : "text-slate-500 hover:text-brand"
                                }`}
                            >
                                {item.name}
                                <span className={`absolute -bottom-1 left-0 h-0.5 bg-brand transition-all duration-300 ${
                                    isActive(item.href) ? "w-full" : "w-0 group-hover:w-full"
                                }`} />
                            </Link>
                        ))}
                        <Link href="/contact" className="btn-primary text-[11px] px-8 py-3 tracking-widest rounded-sm shadow-lg shadow-brand/10 hover:shadow-brand/20">
                            GET A FREE QUOTE
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-brand p-2 hover:bg-brand/5 rounded-lg transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden absolute top-24 left-0 w-full bg-white border-b border-brand/10 shadow-xl overflow-hidden"
                    >
                        <div className="flex flex-col p-6 space-y-2">
                            {nav.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`text-lg font-bold py-3 border-b border-slate-50 pl-2 hover:bg-slate-50 transition-colors ${
                                        isActive(item.href) ? "text-brand" : "text-brand-dark hover:text-brand"
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <Link
                                href="/contact"
                                onClick={() => setIsOpen(false)}
                                className="btn-primary text-center mt-6 w-full py-4 text-xs tracking-widest"
                            >
                                GET A FREE QUOTE
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default Navbar;
