"use client";

import { useState } from "react";
import { Truck, Paintbrush, HardHat, Pill, Factory, Fuel } from "lucide-react";
import Reveal from "./Reveal";

const industries = [
    {
        icon: HardHat,
        name: "Road Construction",
        body: "Paving-grade bitumen for highways, bridges and urban infrastructure projects across India.",
        tags: ["VG-30 Bitumen", "VG-40 Bitumen"],
    },
    {
        icon: Paintbrush,
        name: "Paint & Coatings",
        body: "High-purity mineral turpentine and solvents for paint, varnish and industrial coating formulations.",
        tags: ["Mineral Turpentine", "Industrial Solvents"],
    },
    {
        icon: Factory,
        name: "Rubber & Polymers",
        body: "Process oils engineered for rubber compounding, tyre manufacturing and polymer processing.",
        tags: ["Rubber Process Oil", "Base Oil SN500"],
    },
    {
        icon: Fuel,
        name: "Power & Energy",
        body: "Industrial fuel oils and light diesel for boilers, furnaces and power generation plants.",
        tags: ["Industrial Fuel Oil", "Light Diesel Oil"],
    },
    {
        icon: Truck,
        name: "Automotive & Lubricants",
        body: "Premium base oils serving as feedstock for engine oils, gear oils and industrial lubricants.",
        tags: ["Base Oil SN150", "Base Oil SN500"],
    },
    {
        icon: Pill,
        name: "Pharmaceutical",
        body: "Ultra-refined petroleum jelly and white oils meeting pharmacopoeia-grade standards.",
        tags: ["Petroleum Jelly", "White Mineral Oil"],
    },
];

const Industries = () => {
    // Phone artboard stacks these as an accordion with the first one open;
    // the desktop artboard shows all six expanded in a grid.
    const [open, setOpen] = useState(0);

    return (
        <section id="industries" className="relative overflow-hidden wash-top py-14 lg:py-[clamp(56px,9vw,110px)]">
            <div aria-hidden className="absolute -top-[20%] -right-[8%] w-[46vw] h-[90%] pointer-events-none bg-[radial-gradient(circle,rgba(52,211,153,0.22),transparent_65%)]" />

            <div className="container-wide relative z-10">
                <Reveal className="lg:text-center lg:max-w-2xl lg:mx-auto mb-7 lg:mb-16">
                    <span className="eyebrow">Markets we serve</span>
                    <h2 className="h2-section mt-2.5 lg:mt-3">
                        <span className="lg:hidden">Industries we supply</span>
                        <span className="hidden lg:inline">Industries &amp; Applications</span>
                    </h2>
                    <p className="hidden lg:block mt-4 max-w-lg mx-auto text-base leading-[1.7] text-slate-500">
                        From road infrastructure to pharmaceutical manufacturing, our products power diverse
                        sectors across Central India.
                    </p>
                </Reveal>

                {/* Phone: accordion */}
                <div className="lg:hidden flex flex-col gap-3">
                    {industries.map((ind, idx) => {
                        const isOpen = open === idx;
                        return (
                            <div key={ind.name} className="rounded-[22px] overflow-hidden glass">
                                <button
                                    type="button"
                                    onClick={() => setOpen(isOpen ? -1 : idx)}
                                    aria-expanded={isOpen}
                                    className="w-full flex items-center gap-4 px-[22px] py-5 text-left"
                                >
                                    <span className="w-[46px] h-[46px] shrink-0 rounded-[14px] flex items-center justify-center bg-[linear-gradient(150deg,rgba(52,211,153,0.24),rgba(36,104,81,0.08))] border border-white/75">
                                        <ind.icon size={22} className="text-brand" strokeWidth={1.9} />
                                    </span>
                                    <span className="flex-1 text-[17px] font-bold text-brand-dark">{ind.name}</span>
                                    <span
                                        className={`text-[22px] font-light text-brand transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                                            isOpen ? "rotate-45" : ""
                                        }`}
                                    >
                                        +
                                    </span>
                                </button>
                                <div
                                    className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                                        isOpen ? "max-h-[280px] opacity-100" : "max-h-0 opacity-0"
                                    }`}
                                >
                                    <div className="px-[22px] pb-[22px]">
                                        <p className="text-[14.5px] leading-[1.7] text-slate-500 mb-4">{ind.body}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {ind.tags.map((t) => (
                                                <span key={t} className="chip">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop: expanded card grid */}
                <div className="hidden lg:grid lg:grid-cols-3 gap-6">
                    {industries.map((ind, idx) => (
                        <Reveal key={ind.name} className="h-full">
                            <div className="h-full p-[34px] rounded-[22px] glass glass-hover">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-[linear-gradient(150deg,rgba(52,211,153,0.22),rgba(36,104,81,0.08))] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                                    <ind.icon size={28} className="text-brand" strokeWidth={2} />
                                </div>
                                <h3 className="text-lg font-bold text-brand-dark mb-2">{ind.name}</h3>
                                <p className="text-sm leading-[1.7] text-slate-500 mb-4">{ind.body}</p>
                                <div className="flex flex-wrap gap-2">
                                    {ind.tags.map((t) => (
                                        <span key={t} className="chip">{t}</span>
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Industries;
