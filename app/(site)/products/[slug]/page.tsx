import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getProductBySlug, getProducts } from "@/lib/products";
import { site, contact } from "@/app/content";
import ProductCard from "@/app/components/ProductCard";
import TdsGate from "@/app/components/TdsGate";

export const revalidate = 3600;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const title = `${product.name} (${product.code})`;
  return {
    title,
    description: product.description,
    alternates: { canonical: `${site.url}/products/${product.slug}` },
    openGraph: { title, description: product.description, url: `${site.url}/products/${product.slug}` },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const allProducts = await getProducts();
  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.code,
    brand: { "@type": "Brand", name: site.name },
    manufacturer: { "@type": "Organization", name: site.name, url: site.url },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="pt-32 pb-24 bg-surface min-h-screen">
        <div className="container-wide">
          <Link href="/products" className="inline-flex items-center gap-2 text-brand font-bold text-sm mb-10 hover:gap-3 transition-all">
            <ArrowLeft size={16} /> All Products
          </Link>

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <span className="font-mono text-xs font-bold text-brand-accent uppercase tracking-widest">{product.code}</span>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-brand-dark mt-2 mb-6">{product.name}</h1>
              <p className="text-slate-600 text-lg leading-relaxed mb-10 max-w-2xl">{product.description}</p>

              {product.applications.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-brand-dark mb-4">Applications</h2>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {product.applications.map((a) => (
                      <li key={a} className="flex items-center gap-2 text-slate-600 text-sm">
                        <CheckCircle2 size={16} className="text-brand-accent shrink-0" /> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {product.industries.map((ind) => (
                  <span key={ind} className="text-xs font-bold uppercase tracking-wider text-brand bg-brand/5 px-3 py-1.5 rounded-full">
                    {ind}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-32">
                <div className="bg-brand-dark px-6 py-4">
                  <h2 className="text-white font-bold text-sm uppercase tracking-widest">Technical Data</h2>
                </div>
                <div className="p-6 space-y-3">
                  {product.specs.length === 0 && !product.packaging && (
                    <p className="text-slate-500 text-sm">Specifications available on request — ask below and we&apos;ll send current TDS/SDS data.</p>
                  )}
                  {product.specs.map((spec) => (
                    <div key={spec.label} className="flex items-center justify-between text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-slate-400 font-mono uppercase tracking-wide text-xs">{spec.label}</span>
                      <span className="font-mono font-bold text-brand-dark">{spec.value}</span>
                    </div>
                  ))}
                  {product.packaging && (
                    <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-3">
                      <span className="text-slate-400 font-mono uppercase tracking-wide text-xs">Packaging</span>
                      <span className="font-mono font-bold text-brand-dark">{product.packaging}</span>
                    </div>
                  )}
                </div>
                <div className="p-6 pt-0 space-y-4">
                  <TdsGate productId={product.id} productLabel={`${product.name} (${product.code})`} />
                  <a
                    href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Hello, I am interested in ${product.name} (${product.code}). Please share pricing and availability.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full btn-outline-brand justify-center text-xs py-2.5"
                  >
                    Ask on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-24">
              <h2 className="h2-section text-brand-dark mb-8">Related Products</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((p, idx) => (
                  <ProductCard key={p.id} product={p} index={idx} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
