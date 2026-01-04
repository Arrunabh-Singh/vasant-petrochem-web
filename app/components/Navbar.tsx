"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    // Smooth scroll handler
    const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        setIsOpen(false);
        const element = document.querySelector(href);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    const navLinks = [
        { name: "Home", href: "#home" },
        { name: "About", href: "#about" },
        { name: "Products", href: "#products" },
        { name: "Contact", href: "#contact" },
    ];

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#246851]/10 supports-[backdrop-filter]:bg-white/60"
        >
            <div className="container-wide">
                <div className="flex justify-between items-center h-24">
                    {/* Logo Section */}
                    <Link href="/" className="flex-shrink-0 flex items-center gap-6 group cursor-pointer">
                        <div className="relative w-20 h-20 transition-transform duration-500 group-hover:scale-105">
                            <Image
                                src="/vasant_logo.png"
                                alt="Vasant Petrochem Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="flex flex-col border-l border-[#246851]/20 pl-6 h-12 justify-center">
                            <span className="font-serif text-2xl font-bold text-[#1a4a3a] tracking-wide leading-none">
                                VASANT
                            </span>
                            <span className="text-[10px] font-bold text-[#246851] tracking-[0.3em] uppercase mt-1">
                                Petrochem
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-10 items-center">
                        {navLinks.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                onClick={(e) => handleScroll(e, item.href)}
                                className="text-xs font-bold text-slate-500 hover:text-[#246851] transition-colors uppercase tracking-[0.15em] relative group"
                            >
                                {item.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#246851] transition-all duration-300 group-hover:w-full" />
                            </a>
                        ))}
                        <a
                            href="#contact"
                            onClick={(e) => handleScroll(e, "#contact")}
                            className="btn-primary text-[11px] px-8 py-3 tracking-widest rounded-sm shadow-lg shadow-[#246851]/10 hover:shadow-[#246851]/20"
                        >
                            GET QUOTE
                        </a>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-[#246851] p-2 hover:bg-[#246851]/5 rounded-lg transition-colors"
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
                        className="md:hidden absolute top-24 left-0 w-full bg-white border-b border-[#246851]/10 shadow-xl overflow-hidden"
                    >
                        <div className="flex flex-col p-6 space-y-2">
                            {navLinks.map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    onClick={(e) => handleScroll(e, item.href)}
                                    className="text-lg font-bold text-[#1a4a3a] py-3 border-b border-slate-50 hover:text-[#246851] pl-2 hover:bg-slate-50 transition-colors"
                                >
                                    {item.name}
                                </a>
                            ))}
                            <a
                                href="#contact"
                                onClick={(e) => handleScroll(e, "#contact")}
                                className="btn-primary text-center mt-6 w-full py-4 text-xs tracking-widest"
                            >
                                GET QUOTE
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default Navbar;
