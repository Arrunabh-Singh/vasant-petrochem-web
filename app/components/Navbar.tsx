"use client";

import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed w-full z-50 glass-panel"
    >
      <div className="container-wide">
        <div className="flex justify-between items-center h-24">
          {/* Logo Section */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-6 group cursor-pointer">
            <div className="relative w-24 h-24 transition-transform duration-500 group-hover:scale-105">
              <Image
                src="/vasant_logo.png"
                alt="Vasant Petrochem Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex flex-col border-l border-[#246851]/20 pl-6">
              <span className="font-serif text-2xl font-bold text-[#1a4a3a] tracking-wide leading-none">
                VASANT
              </span>
              <span className="text-[11px] font-bold text-[#246851] tracking-[0.3em] uppercase mt-1">Petrochem</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-12 items-center">
            <Link href="/" className="text-xs font-bold text-slate-500 hover:text-[#246851] transition-colors uppercase tracking-[0.15em]">Home</Link>
            <Link href="/about" className="text-xs font-bold text-slate-500 hover:text-[#246851] transition-colors uppercase tracking-[0.15em]">About</Link>
            <Link href="/products" className="text-xs font-bold text-slate-500 hover:text-[#246851] transition-colors uppercase tracking-[0.15em]">Products</Link>
            <Link href="/contact" className="text-xs font-bold text-slate-500 hover:text-[#246851] transition-colors uppercase tracking-[0.15em]">Contact</Link>
            <Link href="/contact" className="btn-primary text-[11px] px-8 py-3 tracking-widest rounded-full">
              GET QUOTE
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-[#246851]">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden absolute top-24 left-0 w-full bg-white border-b border-[#246851]/10 p-6 shadow-xl"
        >
          <div className="flex flex-col space-y-6">
            <Link href="/" className="text-lg font-bold text-[#1a4a3a]" onClick={() => setIsOpen(false)}>Home</Link>
            <Link href="/about" className="text-lg font-bold text-[#1a4a3a]" onClick={() => setIsOpen(false)}>About</Link>
            <Link href="/products" className="text-lg font-bold text-[#1a4a3a]" onClick={() => setIsOpen(false)}>Products</Link>
            <Link href="/contact" className="text-lg font-bold text-[#1a4a3a]" onClick={() => setIsOpen(false)}>Contact</Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;