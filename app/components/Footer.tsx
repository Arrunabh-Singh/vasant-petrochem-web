"use client";

import { Mail, Phone } from "lucide-react";
import Image from "next/image";

const Footer = () => {
    return (
        <footer className="bg-[#f8fafc] pt-24 pb-12 border-t border-slate-200">
            <div className="container-wide">
                <div className="grid md:grid-cols-12 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="md:col-span-12 lg:col-span-5 flex flex-col items-start">
                        <div className="relative w-28 h-28 mb-6">
                            <Image src="/vasant_logo.png" alt="Logo" fill className="object-contain" />
                        </div>
                        <span className="font-serif font-bold text-[#1a4a3a] text-2xl mb-2">VASANT PETROCHEM</span>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-sm mb-6">
                            Industrial Area, Mangaliya, Indore.<br />
                            Engineered for purity. Aligned for success.
                        </p>
                        <div className="flex gap-4">
                            <a href="mailto:vasantpetrochem@gmail.com" className="w-10 h-10 rounded-full bg-[#1a4a3a] text-white flex items-center justify-center hover:bg-[#246851] transition-colors cursor-pointer" aria-label="Email Us">
                                <Mail size={16} />
                            </a>
                            <a href="tel:+919425058496" className="w-10 h-10 rounded-full bg-[#1a4a3a] text-white flex items-center justify-center hover:bg-[#246851] transition-colors cursor-pointer" aria-label="Call Us">
                                <Phone size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="md:col-span-4 lg:col-span-2">
                        <h4 className="text-[#1a4a3a] font-bold uppercase tracking-widest text-xs mb-8">Company</h4>
                        <ul className="space-y-4 text-sm font-medium text-slate-600">
                            <li><a href="#home" className="hover:text-[#246851] transition-colors">Home</a></li>
                            <li><a href="#about" className="hover:text-[#246851] transition-colors">About Us</a></li>
                            <li><a href="#infrastructure" className="hover:text-[#246851] transition-colors">Infrastructure</a></li>
                            <li><a href="#contact" className="hover:text-[#246851] transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    {/* Products Links */}
                    <div className="md:col-span-4 lg:col-span-3">
                        <h4 className="text-[#1a4a3a] font-bold uppercase tracking-widest text-xs mb-8">Key Products</h4>
                        <ul className="space-y-4 text-sm font-medium text-slate-600">
                            <li><a href="#products" className="hover:text-[#246851] transition-colors">Industrial Fuel Oil</a></li>
                            <li><a href="#products" className="hover:text-[#246851] transition-colors">Base Oil SN500</a></li>
                            <li><a href="#products" className="hover:text-[#246851] transition-colors">Bitumen / Asphalt</a></li>
                            <li><a href="#products" className="hover:text-[#246851] transition-colors">Mineral Turpentine</a></li>
                        </ul>
                    </div>

                    {/* Legal / Certs */}
                    <div className="md:col-span-4 lg:col-span-2">
                        <h4 className="text-[#1a4a3a] font-bold uppercase tracking-widest text-xs mb-8">Legal</h4>
                        <ul className="space-y-4 text-sm font-medium text-slate-600">
                            <li><a href="#" className="hover:text-[#246851] transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-[#246851] transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-[#246851] transition-colors">ISO Certification</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center md:text-left">&copy; 2025 Vasant Petrochem. All Rights Reserved.</p>
                    <p className="text-[10px] text-slate-300">Designed with Corporate Precision</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
