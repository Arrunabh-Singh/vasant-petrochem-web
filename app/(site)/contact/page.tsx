import type { Metadata } from "next";
import Contact from "@/app/components/Contact";
import { getProducts } from "@/lib/products";
import { site } from "@/app/content";

export const metadata: Metadata = {
  title: "Contact & Get a Quote",
  description: "Request a free quote from Vasant Petrochem. Our team in Indore responds within 24 hours on business days.",
  alternates: { canonical: `${site.url}/contact` },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const [products, params] = await Promise.all([getProducts(), searchParams]);

  return <Contact products={products} sourcePage="/contact" defaultProduct={params.product ?? ""} />;
}
