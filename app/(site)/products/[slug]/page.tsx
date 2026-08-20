import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, FileText } from "lucide-react";
import { getProductBySlug, getProducts } from "@/lib/products";
import { site, contact } from "@/app/content";
import ProductCard from "@/app/components/ProductCard";
import Reveal from "@/app/components/Reveal";
import TdsGate from "@/app/components/TdsGate";
import WhatsAppIcon from "@/app/components/WhatsAppIcon";

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

  const waHref = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
    `Hello, I am interested in ${product.name} (${product.code}). Please share pricing and availability.`
  )}`;

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
      {/* audit.md M14: JSON.stringify doesn't escape < > & — a product
          name/description containing `</script><script>` would break out
          of the script context. Escape before interpolation. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026"),
        }}
      />

      <section className="wash-top pt-[96px] lg:pt-[clamp(120px,14vw,176px)] pb-14 lg:pb-24 min-h-screen">
        <div className="container-wide">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 h-11 mb-4 lg:mb-8 text-xs lg:text-[13px] font-bold tracking-[0.08em] text-slate-500 transition-colors hover:text-brand"
          >
            <ArrowLeft size={17} />
            BACK TO CATALOG
          </Link>

          <div className="grid lg:grid-cols-2 items-start gap-8 lg:gap-[clamp(32px,4vw,64px)] mb-10 lg:mb-[clamp(40px,6vw,64px)]">
            <div>
              <span className="font-mono text-[11px] lg:text-xs font-bold uppercase tracking-[0.18em] lg:tracking-[0.15em] text-brand-accent">
                Grade {product.code}
              </span>
              <h1 className="h1-page mt-2.5 mb-4 lg:mb-6">{product.name}</h1>
              <p className="text-base lg:text-[clamp(16px,1.3vw,18px)] leading-[1.75] lg:leading-[1.7] text-slate-600 max-w-xl mb-6 lg:mb-8 text-pretty">
                {product.description}
              </p>

              {product.industries.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-7 lg:mb-8">
                  {product.industries.map((ind) => (
                    <span key={ind} className="chip">{ind}</span>
                  ))}
                </div>
              )}

              {/* Desktop only — on a phone the fixed action bar already carries these. */}
              <div className="hidden lg:flex flex-wrap gap-3">
                <Link href={`/contact?product=${encodeURIComponent(`${product.name} (${product.code})`)}`} className="btn-solid flex-1 min-w-[220px]">
                  REQUEST A QUOTE
                </Link>
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 min-w-[220px]">
                  <WhatsAppIcon size={18} />
                  Ask on WhatsApp
                </a>
              </div>
            </div>

            <div className="rounded-3xl lg:rounded-[24px] overflow-hidden glass">
              <div className="flex justify-between items-center px-[22px] lg:px-7 py-[17px] bg-[linear-gradient(90deg,rgba(255,255,255,0.6),rgba(230,240,237,0.32))] border-b border-white/75">
                <span className="font-mono text-[9.5px] lg:text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Typical specifications
                </span>
                <span className="font-mono text-xs font-bold text-brand">{product.code}</span>
              </div>
              <div className="px-[22px] lg:px-7 pt-2 pb-[22px] lg:pb-6">
                {product.specs.length === 0 && !product.packaging && (
                  <p className="py-4 text-sm text-slate-500">
                    Specifications available on request — ask below and we&apos;ll send current TDS/SDS data.
                  </p>
                )}
                {product.specs.map((spec) => (
                  <div key={spec.label} className="flex items-baseline justify-between gap-4 py-[15px] border-b border-brand/10">
                    <span className="spec-key">{spec.label}</span>
                    <span className="spec-val text-[13px] lg:text-sm">{spec.value}</span>
                  </div>
                ))}
                {product.packaging && (
                  <div className="flex items-baseline justify-between gap-4 pt-[18px] pb-1">
                    <span className="spec-key">Packaging</span>
                    <span className="text-[13px] font-semibold text-brand text-right">{product.packaging}</span>
                  </div>
                )}
                <p className="mt-4 text-[11px] leading-[1.6] text-slate-400">
                  Typical values, not a guarantee of specification. A batch test report is issued with every
                  consignment.
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-[clamp(32px,4vw,64px)]">
            {product.applications.length > 0 && (
              <div className="p-[22px] lg:p-0 rounded-3xl lg:rounded-none glass lg:bg-none lg:border-0 lg:shadow-none lg:backdrop-blur-none">
                <span className="eyebrow hidden lg:block">Applications</span>
                <h2 className="font-serif text-2xl lg:text-[clamp(22px,2.6vw,32px)] font-bold text-brand-dark mb-4 lg:mt-2 lg:mb-6">
                  Where it is used
                </h2>
                <div className="flex flex-col gap-2.5 lg:gap-3">
                  {product.applications.map((a) => (
                    <div
                      key={a}
                      className="flex items-center gap-3.5 lg:gap-4 px-[18px] lg:px-[22px] py-4 lg:py-5 rounded-[15px] lg:rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.8),rgba(255,255,255,0.38))] border border-white/80 transition-transform duration-300 hover:translate-x-1"
                    >
                      <span className="w-[30px] h-[30px] lg:w-[34px] lg:h-[34px] shrink-0 rounded-full flex items-center justify-center bg-[linear-gradient(150deg,rgba(52,211,153,0.24),rgba(36,104,81,0.08))] border border-white/75">
                        <Check size={15} className="text-brand" strokeWidth={2.6} />
                      </span>
                      <span className="text-[14.5px] lg:text-[15px] text-slate-700">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="eyebrow hidden lg:block">Documentation</span>
              <h2 className="hidden lg:block font-serif text-[clamp(22px,2.6vw,32px)] font-bold text-brand-dark mt-2 mb-6">
                Technical data sheet
              </h2>
              <div className="p-6 lg:p-[clamp(28px,3vw,40px)] rounded-[26px] lg:rounded-3xl panel-deep">
                <div className="w-[52px] h-[52px] lg:w-14 lg:h-14 rounded-full flex items-center justify-center mb-5 lg:mb-6 bg-brand-accent/10 border border-brand-accent/25">
                  <FileText size={23} className="text-brand-accent" strokeWidth={1.9} />
                </div>
                <h3 className="font-serif lg:font-sans text-2xl lg:text-xl font-bold text-white mb-3">
                  <span className="lg:hidden">Technical data sheet</span>
                  <span className="hidden lg:inline">{product.name} — TDS</span>
                </h3>
                <p className="text-[14.5px] lg:text-[15px] leading-[1.7] text-slate-300 mb-6">
                  Full specification with test methods, handling and storage guidance. Share your email and we
                  will send it across.
                </p>
                <TdsGate productId={product.id} productLabel={`${product.name} (${product.code})`} />
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-14 lg:mt-24">
              <h2 className="h2-section mb-6 lg:mb-8">Related products</h2>
              <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
                {related.map((p, idx) => (
                  <Reveal key={p.id} delay={idx * 0.06} className="h-full">
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
