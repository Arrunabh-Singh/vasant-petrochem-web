import { Factory, ShieldCheck } from "lucide-react";
import StorageTanksVisual from "./StorageTanksVisual";
import Reveal from "./Reveal";

const points = [
    {
        icon: Factory,
        title: "Automated processing",
        body: "Computer-controlled blending ensures consistent viscosity and composition across every batch.",
    },
    {
        icon: ShieldCheck,
        title: "Quality checks",
        body: "In-house testing on manufactured batches before they leave the facility.",
    },
];

const Infrastructure = () => (
    <section
        id="infrastructure"
        className="relative overflow-hidden text-white py-11 lg:py-[clamp(64px,11vw,128px)] bg-[linear-gradient(140deg,#0f2e24,#1a4a3a_55%,#246851)] lg:bg-[linear-gradient(120deg,#0f2e24,#1a4a3a_55%,#246851)]"
    >
        <div aria-hidden className="absolute inset-0 opacity-5 bg-[linear-gradient(45deg,#ffffff_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div aria-hidden className="absolute -top-[30%] -left-[14%] lg:left-[4%] w-[90vw] lg:w-[44vw] h-[170%] lg:h-[160%] bg-[radial-gradient(circle,rgba(52,211,153,0.24),transparent_62%)]" />
        <div aria-hidden className="hidden lg:block absolute -bottom-[40%] right-[2%] w-[38vw] h-[160%] bg-[radial-gradient(circle,rgba(52,211,153,0.14),transparent_62%)]" />

        <div className="container-wide relative z-10">
            <div className="grid lg:grid-cols-2 items-center gap-8 lg:gap-[clamp(48px,6vw,96px)]">
                <div>
                    <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/20 mb-[22px] lg:mb-8">
                        <span className="text-[9.5px] lg:text-[10px] font-bold uppercase tracking-[0.28em] lg:tracking-[0.3em] text-brand-accent">
                            Our facility
                        </span>
                    </div>
                    <h2 className="font-serif text-[32px] lg:text-[clamp(26px,3.6vw,48px)] font-bold leading-[1.16] text-white mb-4 lg:mb-8">
                        Manufacturing <br className="hidden lg:block" />
                        <span className="text-brand-accent">infrastructure</span>
                    </h2>
                    <p className="text-[15.5px] lg:text-[clamp(16px,1.3vw,18px)] font-light leading-[1.75] lg:leading-[1.7] text-slate-300 max-w-lg mb-7 lg:mb-10">
                        Our Mangaliya facility handles blending and storage for our manufactured lines, giving us
                        direct control over consistency and supply for our partners.
                    </p>

                    {/* Phone: the visual sits between the copy and the points. */}
                    <div className="lg:hidden mb-[26px] p-3 rounded-[26px] glass-dark">
                        <div className="rounded-[18px] overflow-hidden aspect-square shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)]">
                            <StorageTanksVisual />
                        </div>
                        <div className="px-3 pt-5 pb-2">
                            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-400">Mangaliya, Indore</span>
                            <p className="text-[18px] font-bold text-white mt-2 mb-1.5">Blending &amp; storage</p>
                            <p className="text-[13.5px] leading-[1.65] text-slate-400">Manufacturing facility for our own product lines.</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:gap-8">
                        {points.map((p, i) => (
                            <div
                                key={p.title}
                                className={`flex gap-4 lg:gap-6 items-start p-5 lg:p-0 rounded-[20px] lg:rounded-none glass-dark lg:bg-none lg:border-0 lg:shadow-none lg:backdrop-blur-none ${
                                    i === 0 ? "lg:pb-6 lg:border-b lg:border-white/10" : ""
                                }`}
                            >
                                <div className="w-[46px] h-[46px] lg:w-14 lg:h-14 shrink-0 rounded-full flex items-center justify-center bg-brand-accent/15 border border-brand-accent/25">
                                    <p.icon size={21} className="lg:w-6 lg:h-6 text-brand-accent" strokeWidth={1.9} />
                                </div>
                                <div>
                                    <h3 className="text-[16.5px] lg:text-lg font-bold text-white mb-1.5 lg:mb-1">{p.title}</h3>
                                    <p className="text-[13.5px] lg:text-sm leading-[1.7] text-slate-400">{p.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Desktop: framed visual with the caption card overlapping it. */}
                <Reveal className="hidden lg:block">
                    <div className="relative w-full aspect-square">
                        <div aria-hidden className="absolute -inset-[18px] rounded-[28px] z-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] backdrop-blur-[14px] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" />
                        <div className="absolute inset-0 z-10 rounded-2xl overflow-hidden shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
                            <StorageTanksVisual />
                        </div>
                        <div className="absolute bottom-6 right-6 z-20 max-w-[290px] p-[clamp(20px,3vw,30px)] rounded-[22px] bg-[linear-gradient(145deg,rgba(15,46,36,0.72),rgba(15,46,36,0.42))] backdrop-blur-[24px] backdrop-saturate-[1.5] border border-white/25 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.28)]">
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Mangaliya, Indore</span>
                            <p className="text-lg font-bold text-white mt-2">Blending &amp; Storage</p>
                            <p className="text-sm leading-[1.6] text-slate-400 mt-2">Manufacturing facility for our own product lines.</p>
                        </div>
                    </div>
                </Reveal>
            </div>
        </div>
    </section>
);

export default Infrastructure;
