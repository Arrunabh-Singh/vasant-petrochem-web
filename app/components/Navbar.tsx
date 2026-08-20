"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { contact, nav } from "../content";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname.startsWith(href);

    // Links in the sheet close it themselves; this covers the one route change
    // they can't see — the browser back button while the sheet is open.
    useEffect(() => {
        const close = () => setIsOpen(false);
        window.addEventListener("popstate", close);
        return () => window.removeEventListener("popstate", close);
    }, []);

    // While the sheet is open the page behind it must not scroll.
    useEffect(() => {
        if (!isOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [isOpen]);

    return (
        <>
            <header className="fixed top-0 inset-x-0 z-60 h-[68px] lg:h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.56))] backdrop-blur-[26px] backdrop-saturate-[1.8] border-b border-white/75 shadow-[0_12px_40px_-24px_rgba(15,46,36,0.5)]">
                <div className="container-wide h-full">
                    <div className="flex h-full items-center justify-between gap-4">
                        <Link href="/" className="flex items-center gap-3 lg:gap-6 min-w-0 group">
                            <span className="relative block w-[42px] h-[42px] lg:w-[72px] lg:h-[72px] shrink-0 transition-transform duration-500 group-hover:scale-105">
                                <Image src="/vasant_logo.png" alt="Vasant Petrochem" fill sizes="72px" className="object-contain" priority />
                            </span>
                            <span className="flex flex-col justify-center leading-none lg:h-12 lg:border-l lg:border-brand/20 lg:pl-6">
                                <span className="font-serif text-[19px] lg:text-2xl font-bold text-brand-dark tracking-[0.02em] leading-none">VASANT</span>
                                <span className="text-[8px] lg:text-[10px] font-bold text-brand tracking-[0.3em] uppercase mt-1">Petrochem</span>
                            </span>
                        </Link>

                        {/* Desktop rail */}
                        <nav className="hidden lg:flex items-center gap-[clamp(20px,2.6vw,40px)]">
                            {nav.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`relative text-xs font-bold uppercase tracking-[0.15em] whitespace-nowrap py-1 transition-colors group ${
                                        isActive(item.href) ? "text-brand" : "text-brand-dark hover:text-brand"
                                    }`}
                                >
                                    {item.name}
                                    <span
                                        className={`absolute left-0 -bottom-1 h-0.5 bg-brand transition-all duration-300 ${
                                            isActive(item.href) ? "w-full" : "w-0 group-hover:w-full"
                                        }`}
                                    />
                                </Link>
                            ))}
                            <Link href="/contact" className="btn-solid min-h-0 py-3 px-8 text-[11px] tracking-[0.1em]">
                                GET A FREE QUOTE
                            </Link>
                        </nav>

                        {/* Mobile trigger */}
                        <button
                            type="button"
                            onClick={() => setIsOpen((v) => !v)}
                            aria-label={isOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isOpen}
                            aria-controls="mobile-menu"
                            className="lg:hidden w-12 h-12 flex items-center justify-center rounded-[14px] text-brand-dark bg-[linear-gradient(145deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                <path d={isOpen ? "M18 6 6 18" : "M4 7h16"} />
                                <path d={isOpen ? "m6 6 12 12" : "M4 12h16"} />
                                <path d={isOpen ? "M12 12h.01" : "M4 17h16"} />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Always mounted and animated with a CSS transition -- `inert` keeps
                it out of the tab order and the a11y tree while closed, and no
                content depends on JS to become visible. */}
            <div
                id="mobile-menu"
                inert={!isOpen}
                className={`lg:hidden fixed inset-x-0 bottom-0 top-[68px] z-55 overflow-y-auto overscroll-contain px-[22px] py-7 bg-[linear-gradient(170deg,rgba(255,255,255,0.94),rgba(230,240,237,0.9))] backdrop-blur-[26px] transition-[opacity,transform,visibility] duration-250 ease-out ${
                    isOpen ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-2"
                }`}
            >
                {nav.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between mb-3 px-5 py-[22px] rounded-[20px] bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(255,255,255,0.55))] border border-white/85 shadow-[0_16px_34px_-24px_rgba(15,46,36,0.4),inset_0_1px_0_rgba(255,255,255,0.95)]"
                    >
                        <span className={`font-serif text-2xl font-bold ${isActive(item.href) ? "text-brand" : "text-brand-dark"}`}>
                            {item.name}
                        </span>
                        <ArrowRight size={20} className="text-brand" />
                    </Link>
                ))}

                <div className="mt-[26px] mb-[92px] p-6 rounded-[22px] panel-deep">
                    <p className="eyebrow mb-1.5">Talk to the desk</p>
                    <a href={contact.phoneHref} className="block font-serif text-[26px] font-bold text-white mb-1">
                        {contact.phone}
                    </a>
                    <p className="text-[13px] text-slate-300">{contact.hours}</p>
                </div>
            </div>
        </>
    );
};

export default Navbar;
