/**
 * Structured data (schema.org JSON-LD) built from content. Serialised with
 * `jsonLd()`, which escapes "<" so a value can never close the script element
 * (the hub's audit.md M14 fix, carried over).
 */
import { company, SITE_URL } from "./company.ts";

export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

export const abs = (path: string) => new URL(path, SITE_URL).toString();

export function organization() {
  const w = company.works;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: company.tradeName,
    ...(company.legalName ? { legalName: company.legalName } : {}),
    url: SITE_URL,
    logo: abs("/brand/vasant-logo.png"),
    foundingDate: String(company.foundedYear),
    email: company.mailboxes.sales ?? company.email,
    telephone: company.phone.href.replace("tel:", ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: w.street,
      addressLocality: w.city,
      addressRegion: w.region,
      postalCode: w.postalCode,
      addressCountry: w.country,
    },
    ...(Object.values(company.social).some(Boolean) ? { sameAs: Object.values(company.social).filter(Boolean) } : {}),
  };
}

export function localBusiness() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: company.tradeName,
    url: SITE_URL,
    image: abs("/brand/vasant-logo.png"),
    telephone: company.phone.href.replace("tel:", ""),
    address: organization().address,
    geo: { "@type": "GeoCoordinates", latitude: company.works.lat, longitude: company.works.lng },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: company.hours.dayOfWeek,
      opens: company.hours.opens,
      closes: company.hours.closes,
    },
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function faqPage(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
