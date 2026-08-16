import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Hero from "@/app/components/Hero";
import TrustBar from "@/app/components/TrustBar";
import Features from "@/app/components/Features";
import Industries from "@/app/components/Industries";
import ProductGrid from "@/app/components/ProductGrid";
import { getProducts } from "@/lib/products";

export default async function Home() {
  const products = await getProducts();
  const featured = products.slice(0, 3);

  return (
    <>
      <Hero productCount={products.length} />
      <TrustBar productCount={products.length} />
      <Features />

      <section className="py-24 bg-surface">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-xl">
              <span className="text-brand-accent font-bold tracking-[0.2em] uppercase text-xs">Product Catalog</span>
              <h2 className="h2-section text-brand-dark mt-2">Our Product Lines</h2>
              <p className="text-slate-600">Manufactured and traded industrial oils, fuels &amp; lubricants. Ask us for current specs and pricing.</p>
            </div>
            <Link href="/products" className="flex items-center gap-2 text-brand font-bold hover:gap-4 transition-all group">
              View Full Catalog <ArrowRight size={20} className="group-hover:text-brand-accent transition-colors" />
            </Link>
          </div>
          <ProductGrid products={featured} />
        </div>
      </section>

      <Industries />

      <section className="py-20 bg-brand-dark">
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6">Ready to source with confidence?</h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-10">
            Get custom pricing within 24 hours. Our team in Indore is ready to serve your petrochemical needs.
          </p>
          <Link href="/contact" className="btn-primary px-10">
            GET A FREE QUOTE
          </Link>
        </div>
      </section>
    </>
  );
}
