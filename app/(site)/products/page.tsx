import type { Metadata } from "next";
import ProductGrid from "@/app/components/ProductGrid";
import TradingLines from "@/app/components/TradingLines";
import { getProducts } from "@/lib/products";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Product Catalog",
  description: "Base oils, bitumen, industrial fuel oil, rubber process oil, mineral turpentine, and light diesel oil — manufactured and traded by Vasant Petrochem, Indore.",
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      <section className="py-32 bg-surface min-h-screen">
        <div className="container-wide">
          <div className="max-w-2xl mb-16">
            <span className="text-brand-accent font-bold tracking-[0.2em] uppercase text-xs">Product Catalog</span>
            <h1 className="h2-section text-brand-dark mt-2">Our Product Lines</h1>
            <p className="text-slate-600">
              Manufactured and traded industrial oils, fuels &amp; lubricants. Click any product for details, or ask us for current specs, stock, and pricing.
            </p>
          </div>
          <ProductGrid products={products} showFilter />
        </div>
      </section>
      <TradingLines />
    </>
  );
}
