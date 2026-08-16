import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { site, contact } from "./content";
import MotionProvider from "./components/MotionProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Vasant Petrochem | Industrial Oils, Fuels & Lubricants, Indore",
    template: "%s | Vasant Petrochem",
  },
  description: "Vasant Petrochem manufactures and trades base oil, bitumen, industrial fuel oil, rubber process oil, mineral turpentine, light diesel oil, and branded industrial lubricants from Mangaliya, Indore, across Central India.",
  keywords: [
    "petrochemical company Indore",
    "base oil manufacturer India",
    "bitumen supplier Madhya Pradesh",
    "industrial lubricants trader India",
    "petroleum products Madhya Pradesh",
    "VG-30 bitumen road construction",
    "base oil SN500 supplier",
    "rubber process oil manufacturer",
    "mineral turpentine oil India",
    "industrial fuel oil supplier",
    "light diesel oil bulk",
    "industrial lubricants supplier India",
  ],
  openGraph: {
    title: "Vasant Petrochem | Industrial Oils, Fuels & Lubricants",
    description: "Manufacturing and trading base oils, bitumen, industrial fuels, and branded lubricants across Central India.",
    url: site.url,
    siteName: site.name,
    locale: "en_IN",
    type: "website",
  },
  icons: {
    icon: "/icon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: site.url,
  },
};

const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: contact.address.street,
  addressLocality: contact.address.city,
  addressRegion: contact.address.region,
  postalCode: contact.address.postalCode,
  addressCountry: contact.address.country,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
      logo: `${site.url}/vasant_logo.png`,
      description: "Manufacturer and trader of base oils, bitumen, industrial fuels, process oils, and branded industrial lubricants across Central India.",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: contact.phone,
        contactType: "sales",
        email: contact.email,
        availableLanguage: ["English", "Hindi"],
      },
      address: postalAddress,
    },
    {
      "@type": "LocalBusiness",
      "@id": `${site.url}/#localbusiness`,
      name: site.name,
      image: `${site.url}/vasant_logo.png`,
      url: site.url,
      telephone: contact.phone,
      email: contact.email,
      address: postalAddress,
      geo: {
        "@type": "GeoCoordinates",
        latitude: contact.address.lat,
        longitude: contact.address.lng,
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "18:00",
      },
      priceRange: "$$",
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: site.url,
      name: site.name,
      publisher: { "@id": `${site.url}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-white text-slate-900`}>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
