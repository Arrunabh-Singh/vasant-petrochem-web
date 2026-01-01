"use client";

import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="bg-[#f8fafc] pt-24 pb-12 border-t border-slate-200">
      <div className="container-wide">
        <div className="grid md:grid-cols-12 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-5 flex flex-col items-start">
            <div className="relative w-32 h-32 mb-6">
              <Image src="/vasant_logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="font-serif font-bold text-[#1a4a3a] text-2xl mb-2">VASANT PETROCHEM</span>
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm mb-6">
              Industrial Area, Mangaliya, Indore.<br/>
              Engineered for purity. Aligned for success.
            </p>
            <div className="flex gap-4">
               {/* Social Placeholders */}
               <motion.div
                 className="w-8 h-8 rounded-full bg-[#1a4a3a] text-white flex items-center justify-center hover:bg-[#246851] transition-colors cursor-pointer"
                 whileHover={{ scale: 1.1, y: -2 }}
               >
                  <Mail size={14} />
               </motion.div>
               <motion.div
                 className="w-8 h-8 rounded-full bg-[#1a4a3a] text-white flex items-center justify-center hover:bg-[#246851] transition-colors cursor-pointer"
                 whileHover={{ scale: 1.1, y: -2 }}
               >
                  <Phone size={14} />
               </motion.div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="text-[#1a4a3a] font-bold uppercase tracking-widest text-xs mb-8">Company</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-600">
              <li><Link href="/" className="hover:text-[#246851] transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-[#246851] transition-colors">About Us</Link></li>
              <li><Link href="/about" className="hover:text-[#246851] transition-colors">Infrastructure</Link></li>
              <li><Link href="/contact" className="hover:text-[#246851] transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Products Links */}
          <div className="md:col-span-3">
             <h4 className="text-[#1a4a3a] font-bold uppercase tracking-widest text-xs mb-8">Key Products</h4>
             <ul className="space-y-4 text-sm font-medium text-slate-600">
              <li><Link href="/products" className="hover:text-[#246851] transition-colors">Industrial Fuel Oil</Link></li>
              <li><Link href="/products" className="hover:text-[#246851] transition-colors">Base Oil SN500</Link></li>
              <li><Link href="/products" className="hover:text-[#246851] transition-colors">Bitumen / Asphalt</Link></li>
              <li><Link href="/products" className="hover:text-[#246851] transition-colors">Mineral Turpentine</Link></li>
            </ul>
          </div>

          {/* Legal / Certs */}
          <div className="md:col-span-2">
            <h4 className="text-[#1a4a3a] font-bold uppercase tracking-widest text-xs mb-8">Legal</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-600">
              <li><Link href="/" className="hover:text-[#246851] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/" className="hover:text-[#246851] transition-colors">Terms of Service</Link></li>
              <li><Link href="/" className="hover:text-[#246851] transition-colors">ISO Certification</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">&copy; 2025 Vasant Petrochem. All Rights Reserved.</p>
           <p className="text-[10px] text-slate-300">Designed with Corporate Precision</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;