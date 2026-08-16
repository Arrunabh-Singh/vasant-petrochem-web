import type { Metadata } from "next";
import Infrastructure from "@/app/components/Infrastructure";
import { site } from "@/app/content";

export const metadata: Metadata = {
  title: "About Us",
  description: "Vasant Petrochem manufactures and trades petrochemical products and industrial lubricants from Indore, serving Central India.",
  alternates: { canonical: `${site.url}/about` },
};

export default function AboutPage() {
  return (
    <div className="pt-24">
      <section className="py-24 bg-white">
        <div className="container-wide max-w-3xl">
          <span className="text-brand-accent font-bold tracking-[0.2em] uppercase text-xs">About Vasant Petrochem</span>
          <h1 className="h2-section text-brand-dark mt-2">Manufacturing & Trading, Est. 2025</h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Vasant Petrochem is based in Mangaliya, Indore. We manufacture our own line of base oils,
            bitumen, industrial fuel oil, rubber process oil, mineral turpentine, and light diesel oil, and
            we also source and supply a wide range of branded industrial lubricants and specialty oils to
            match customer requirements — across Central India.
          </p>
        </div>
      </section>
      <Infrastructure />
    </div>
  );
}
