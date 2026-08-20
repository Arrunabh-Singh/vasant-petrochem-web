import type { Metadata } from "next";
import ProductGrid from "@/app/components/ProductGrid";
import Reveal from "@/app/components/Reveal";
import { getProducts } from "@/lib/products";
import { contact } from "@/app/content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Product Catalog",
  description:
    "Base oils, bitumen, industrial fuel oil, rubber process oil, mineral turpentine, and light diesel oil — manufactured and traded by Vasant Petrochem, Indore.",
};

const waHref = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
  "Hello, I'm looking for a branded industrial lubricant / specialty oil. Can you check current stock?"
)}`;

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <section className="wash-top pt-[100px] lg:pt-[clamp(120px,14vw,176px)] pb-14 lg:pb-24 min-h-dvh">
      <div className="container-wide">
        <div className="max-w-3xl mb-7 lg:mb-10">
          <span className="eyebrow">Product catalog</span>
          <h1 className="h1-page mt-2.5 mb-3.5 lg:mb-6">Our product lines</h1>
          <p className="text-base lg:text-[clamp(16px,1.3vw,18px)] leading-[1.75] lg:leading-[1.7] text-slate-600 text-pretty">
            Base oils, bitumen, industrial fuel oil, rubber process oil, mineral turpentine and light diesel
            oil — manufactured and traded from Mangaliya, Indore. Filter by industry, or ask us for current
            specs and pricing.
          </p>
        </div>

        <ProductGrid products={products} showFilter />

        <Reveal className="mt-10 lg:mt-14">
          <div className="flex flex-wrap items-center justify-between gap-6 p-6 lg:p-[clamp(28px,3.5vw,48px)] rounded-[26px] glass">
            <div className="max-w-xl">
              <h2 className="font-serif text-[22px] lg:text-[clamp(22px,2.4vw,30px)] font-bold text-brand-dark mb-3">
                Looking for something not listed?
              </h2>
              <p className="text-[15px] leading-[1.7] text-slate-500">
                We also source branded industrial lubricants and specialty oils on request. Send us the grade
                or spec sheet and we will check current stock.
              </p>
            </div>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-solid w-full sm:w-auto lg:min-w-[220px]">
              Ask on WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
