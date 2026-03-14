import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: new URL("https://vasantpetrochem.com"),
  title: "Vasant Petrochem | Premium Petrochemical Refinery in Indore, India",
  description: "Vasant Petrochem is a leading petrochemical refinery in Mangaliya, Indore. We manufacture and supply base oil, bitumen, industrial fuel oil, rubber process oil, mineral turpentine, and light diesel oil across Central India.",
  keywords: [
    "petrochemical refinery Indore",
    "base oil manufacturer India",
    "bitumen supplier Gujarat",
    "industrial solvents supplier bulk",
    "petroleum products Madhya Pradesh",
    "VG-30 bitumen road construction",
    "base oil SN500 supplier",
    "rubber process oil manufacturer",
    "mineral turpentine oil India",
    "industrial fuel oil supplier",
    "light diesel oil bulk",
    "petrochemical company India",
  ],
  openGraph: {
    title: "Vasant Petrochem | Premium Petrochemical Refinery in Indore",
    description: "Advanced petrochemical solutions powering Central India's manufacturing sector. Base oils, bitumen, industrial fuels, solvents & more.",
    url: "https://vasantpetrochem.com",
    siteName: "Vasant Petrochem",
    images: [
      {
        url: "/vasant_logo.png",
        width: 800,
        height: 800,
        alt: "Vasant Petrochem Logo",
      },
    ],
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
    canonical: "https://vasantpetrochem.com",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://vasantpetrochem.com/#organization",
      name: "Vasant Petrochem",
      url: "https://vasantpetrochem.com",
      logo: "https://vasantpetrochem.com/vasant_logo.png",
      description: "Premium petrochemical refinery manufacturing and supplying base oils, bitumen, industrial fuels, solvents, and process oils across Central India.",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+91-94250-58496",
        contactType: "sales",
        email: "vasantpetrochem@gmail.com",
        availableLanguage: ["English", "Hindi"],
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "Industrial Area, Mangaliya",
        addressLocality: "Indore",
        addressRegion: "Madhya Pradesh",
        postalCode: "453771",
        addressCountry: "IN",
      },
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://vasantpetrochem.com/#localbusiness",
      name: "Vasant Petrochem",
      image: "https://vasantpetrochem.com/vasant_logo.png",
      url: "https://vasantpetrochem.com",
      telephone: "+91-94250-58496",
      email: "vasantpetrochem@gmail.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Industrial Area, Mangaliya",
        addressLocality: "Indore",
        addressRegion: "Madhya Pradesh",
        postalCode: "453771",
        addressCountry: "IN",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 22.6569,
        longitude: 75.7898,
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
      "@id": "https://vasantpetrochem.com/#website",
      url: "https://vasantpetrochem.com",
      name: "Vasant Petrochem",
      publisher: { "@id": "https://vasantpetrochem.com/#organization" },
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
        {children}
      </body>
    </html>
  );
}
