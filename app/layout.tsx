import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

// Vastu Principle: 
// The Inter font (Sans-serif) represents Modernity and Clarity (Air Element).
// The Playfair Display (Serif) represents Stability and Tradition (Earth Element).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Vasant Petrochem | Premium Refinery in Indore",
  description: "Vasant Petrochem - A modern, Vastu-compliant oil refinery based in Mangaliya, Indore. Excellence in petrochemicals with harmony and sustainability.",
  openGraph: {
    title: "Vasant Petrochem | Premium Refinery",
    description: "Advanced petrochemical solutions powering Central India's manufacturing sector.",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-white text-slate-900`}>
        {children}
      </body>
    </html>
  );
}