import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Hero from "@/app/components/Hero";
import TrustBar from "@/app/components/TrustBar";
import Features from "@/app/components/Features";
import Industries from "@/app/components/Industries";
import ProductGrid from "@/app/components/ProductGrid";
import ProductCarousel from "@/app/components/ProductCarousel";
import TradingLines from "@/app/components/TradingLines";
import Reveal from "@/app/components/Reveal";
import { getProducts } from "@/lib/products";

export default async function Home() {
  const products = await getProducts();
  const featured = products.slice(0, 3);

  return (
    <div className="flex flex-col">
      <Hero productCount={products.length} />
      <TrustBar productCount={products.length} />

      {/* The phone artboard leads with the catalog, the desktop one with the
          pitch. Same DOM, reordered by breakpoint. */}
      <section className="order-1 lg:order-2 wash-alt py-14 lg:py-[clamp(56px,9vw,96px)]">
        <Reveal className="container-wide">
          <div className="flex flex-wrap justify-between items-end gap-6 mb-6 lg:mb-[clamp(40px,6vw,64px)]">
            <div className="max-w-xl">
              <span className="eyebrow">Product catalog</span>
              <h2 className="h2-section mt-2.5 mb-3 lg:mb-6">Our product lines</h2>
              <p className="text-[15.5px] lg:text-base leading-[1.7] text-slate-600">
                <span className="lg:hidden">Swipe through the lines we manufacture and trade.</span>
                <span className="hidden lg:inline">
                  Manufactured and traded industrial oils, fuels &amp; lubricants. Ask us for current specs and pricing.
                </span>
              </p>
            </div>
            <Link
              href="/products"
              className="hidden lg:flex items-center gap-2 text-base font-bold text-brand transition-all hover:gap-4"
            >
              View Full Catalog
              <ArrowRight size={20} />
            </Link>
          </div>
        </Reveal>

        {/* Phone: full-bleed swipe rail. Desktop: three featured cards. */}
        <div className="lg:hidden -mx-[18px] px-[18px]">
          <ProductCarousel products={products} />
        </div>
        <div className="lg:hidden container-wide pt-5">
          <Link href="/products" className="btn-ghost w-full">
            VIEW ALL {products.length} LINES
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="hidden lg:block container-wide">
          <ProductGrid products={featured} />
        </div>
      </section>

      <div className="order-2 lg:order-1">
        <Features />
      </div>

      <div className="order-3">
        <Industries />
      </div>

      <section className="order-4 relative overflow-hidden pb-14 lg:py-[clamp(56px,9vw,104px)] lg:bg-[linear-gradient(115deg,#0f2e24,#1a4a3a_55%,#246851)]">
        <div aria-hidden className="hidden lg:block absolute -top-[50%] left-[8%] w-[46vw] h-[200%] bg-[radial-gradient(circle,rgba(52,211,153,0.24),transparent_62%)]" />
        <div aria-hidden className="hidden lg:block absolute -bottom-[70%] right-[4%] w-[40vw] h-[200%] bg-[radial-gradient(circle,rgba(52,211,153,0.14),transparent_62%)]" />
        <div className="container-wide relative z-10">
          <div className="relative overflow-hidden p-[26px] py-11 lg:p-0 rounded-[28px] lg:rounded-none bg-[linear-gradient(140deg,#0f2e24,#1a4a3a_55%,#246851)] lg:bg-none border border-white/15 lg:border-0 shadow-[0_44px_90px_-46px_rgba(15,46,36,0.85),inset_0_1px_0_rgba(255,255,255,0.18)] lg:shadow-none lg:text-center">
            <div aria-hidden className="lg:hidden absolute -top-[40%] -right-[20%] w-[90%] h-[180%] bg-[radial-gradient(circle,rgba(52,211,153,0.26),transparent_62%)]" />
            <div className="relative">
              <h2 className="font-serif text-[30px] lg:text-[clamp(26px,3vw,36px)] font-bold leading-[1.18] text-white mb-3.5 lg:mb-6">
                Ready to source with confidence?
              </h2>
              <p className="text-[15.5px] lg:text-base leading-[1.7] text-slate-300 mb-7 lg:mb-10 lg:max-w-xl lg:mx-auto">
                Custom pricing within 24 hours. Our team in Indore is ready to serve your petrochemical needs.
              </p>
              <Link href="/contact" className="btn-accent w-full lg:w-auto lg:px-[42px]">
                GET A FREE QUOTE
                <ArrowRight size={18} className="lg:hidden" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="order-5">
        <TradingLines />
      </div>
    </div>
  );
}
