import { ArrowRight } from "lucide-react";
import Link from "next/link";
import ParallaxVisual from "./ParallaxVisual";
import RefineryVisual from "./RefineryVisual";

/**
 * Server-rendered on purpose: the hero is the first thing a phone paints, so
 * nothing here waits on a bundle. Only the desktop parallax is client-side.
 */
const Hero = ({ productCount }: { productCount: number }) => {
    return (
        <section className="relative overflow-hidden wash-top pt-[108px] lg:pt-32 pb-14 lg:pb-20 lg:min-h-dvh lg:flex lg:items-center">
            <div aria-hidden className="absolute inset-0 z-0 bg-grid-pattern opacity-60" />
            <div aria-hidden className="absolute -top-[6%] left-[30%] w-[70vw] lg:w-[34vw] h-[116%] lg:h-[130%] z-0 pointer-events-none rotate-[16deg] lg:rotate-[14deg] blur-[46px] lg:blur-[50px] anim-beam bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.8),transparent)]" />
            <div aria-hidden className="hidden lg:block absolute -top-[10%] left-[52%] w-[20vw] h-[130%] z-0 pointer-events-none rotate-[14deg] opacity-70 bg-[linear-gradient(90deg,transparent,rgba(52,211,153,0.26),transparent)]" />
            <div aria-hidden className="hidden lg:block absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_45%,transparent_42%,rgba(15,46,36,0.14)_100%)]" />

            <div className="container-wide relative z-10 w-full grid lg:grid-cols-2 items-center gap-12 lg:gap-[clamp(48px,6vw,96px)]">
                <div>
                    <div className="inline-flex items-center gap-2.5 lg:gap-3 px-[18px] lg:px-5 py-2.5 lg:py-2 rounded-full glass mb-7 lg:mb-10">
                        <span className="relative flex w-2 h-2">
                            <span className="absolute inline-flex w-full h-full rounded-full bg-brand opacity-75 anim-ping" />
                            <span className="relative inline-flex w-2 h-2 rounded-full bg-brand" />
                        </span>
                        <span className="text-[10.5px] lg:text-[11px] font-bold uppercase tracking-[0.12em] lg:tracking-[0.1em] text-brand-dark">
                            <span className="lg:hidden">Indore · Est. 2025</span>
                            <span className="hidden lg:inline">Industrial Excellence • Est. 2025</span>
                        </span>
                    </div>

                    <h1 className="h1-hero mb-6 lg:mb-7 text-balance">
                        Advanced <br className="hidden lg:block" />
                        <span className="text-gradient-brand">Petrochemical Solutions</span>
                    </h1>

                    <p className="text-[17px] lg:text-[clamp(16px,1.4vw,20px)] font-light leading-[1.72] lg:leading-[1.65] text-slate-600 mb-8 lg:mb-12 max-w-xl text-pretty">
                        Vasant Petrochem manufactures and trades industrial oils, fuels and lubricants from
                        Mangaliya, Indore — serving Central India&apos;s plants, road projects and blenders.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 lg:gap-3.5">
                        <Link href="/contact" className="btn-solid flex-1 sm:flex-none lg:px-10">
                            GET A FREE QUOTE
                            <ArrowRight size={18} className="lg:hidden" />
                        </Link>
                        <Link href="/products" className="btn-ghost flex-1 sm:flex-none lg:px-10">
                            <span className="lg:hidden">VIEW THE CATALOG</span>
                            <span className="hidden lg:inline">VIEW CATALOG</span>
                        </Link>
                    </div>
                </div>

                <ParallaxVisual className="relative w-full mt-10 lg:mt-0 lg:pb-[clamp(30px,5vw,48px)]">
                    {/* Mobile: the frame is a glass tray with the stat row inside it.
                        Desktop: a floating glass slab behind a bleeding stat card. */}
                    <div className="relative w-full max-w-[800px] mx-auto p-3.5 lg:p-0 rounded-[28px] lg:rounded-none glass lg:bg-none lg:border-0 lg:shadow-none lg:backdrop-blur-none">
                        <div aria-hidden className="hidden lg:block absolute -inset-[12%] rounded-full z-0 bg-[radial-gradient(circle,rgba(52,211,153,0.38),transparent_62%)]" />
                        <div aria-hidden className="hidden lg:block absolute -inset-[22px] rounded-[26px] z-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.6),rgba(255,255,255,0.16))] backdrop-blur-[18px] backdrop-saturate-[1.5] border border-white/75 shadow-[0_50px_100px_-45px_rgba(15,46,36,0.6),inset_0_1px_0_rgba(255,255,255,0.95)]" />

                        <div className="relative z-10 aspect-4/3 rounded-[18px] lg:rounded-xl overflow-hidden shadow-[0_20px_40px_-22px_rgba(15,46,36,0.6)] lg:shadow-[0_25px_50px_-12px_rgba(15,46,36,0.35)]">
                            <RefineryVisual />
                            <div aria-hidden className="hidden lg:block absolute inset-0 bg-linear-to-tr from-brand-dark/45 to-transparent mix-blend-multiply opacity-60" />
                            <div aria-hidden className="absolute inset-0 pointer-events-none shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_0_0_80px_rgba(0,0,0,0.35)]" />
                            <div aria-hidden className="absolute inset-y-0 w-1/2 pointer-events-none anim-sheen bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)]" />
                        </div>

                        {/* Mobile stat row */}
                        <div className="lg:hidden flex items-center justify-between gap-3.5 px-2 pt-5 pb-1.5">
                            <div>
                                <p className="font-serif text-[30px] font-bold text-brand-dark leading-none mb-0.5">{productCount}+</p>
                                <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-brand-muted">Product lines</p>
                            </div>
                            <p className="max-w-[190px] text-[12.5px] leading-[1.6] text-slate-500 text-right">
                                Manufactured and traded oils, fuels &amp; lubricants.
                            </p>
                        </div>

                        {/* Desktop floating stat card */}
                        <div className="hidden lg:block absolute -bottom-10 left-0 z-20 p-[clamp(20px,3vw,26px)] rounded-[20px] border-l-4 border-l-brand max-w-[250px] glass anim-float">
                            <p className="text-[30px] font-bold text-brand-dark mb-1">{productCount}+</p>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Product Lines</p>
                            <p className="text-xs leading-relaxed text-slate-500 mt-2">
                                Manufactured and traded industrial oils, fuels &amp; lubricants.
                            </p>
                        </div>
                    </div>
                </ParallaxVisual>
            </div>

            {/* Scroll cue — phone artboard only */}
            <div className="lg:hidden flex flex-col items-center gap-2 mt-9">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.3em] text-brand-muted">Scroll</span>
                <span className="block w-px h-11 bg-brand/20 overflow-hidden">
                    <span className="block w-full h-[40%] bg-brand anim-cue" />
                </span>
            </div>
        </section>
    );
};

export default Hero;
