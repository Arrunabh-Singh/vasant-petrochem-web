import { Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { contact, site, addressLine } from "../content";
import { getProducts } from "@/lib/products";

const industries = [
    "Road Construction",
    "Paint & Coatings",
    "Rubber & Polymers",
    "Power & Energy",
    "Automotive & Lubricants",
];

const Footer = async () => {
    const products = await getProducts();

    return (
        <footer className="bg-surface pt-24 pb-12 border-t border-slate-200">
            <div className="container-wide">
                <div className="grid md:grid-cols-12 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="md:col-span-12 lg:col-span-5 flex flex-col items-start">
                        <div className="relative w-28 h-28 mb-6">
                            <Image src="/vasant_logo.png" alt="Vasant Petrochem Logo" fill className="object-contain" />
                        </div>
                        <span className="font-serif font-bold text-brand-dark text-2xl mb-2">VASANT PETROCHEM</span>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-sm mb-6">
                            {addressLine}.<br />
                            {site.tagline}
                        </p>
                        <div className="flex gap-4">
                            <a href={`mailto:${contact.email}`} className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center hover:bg-brand transition-colors" aria-label="Email Us">
                                <Mail size={16} />
                            </a>
                            <a href={contact.phoneHref} className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center hover:bg-brand transition-colors" aria-label="Call Us">
                                <Phone size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="md:col-span-4 lg:col-span-2">
                        <h4 className="text-brand-dark font-bold uppercase tracking-widest text-xs mb-8">Company</h4>
                        <ul className="space-y-4 text-sm font-medium text-slate-600">
                            <li><Link href="/" className="hover:text-brand transition-colors">Home</Link></li>
                            <li><Link href="/about" className="hover:text-brand transition-colors">About Us</Link></li>
                            <li><Link href="/about#infrastructure" className="hover:text-brand transition-colors">Infrastructure</Link></li>
                            <li><Link href="/contact" className="hover:text-brand transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Products Links */}
                    <div className="md:col-span-4 lg:col-span-3">
                        <h4 className="text-brand-dark font-bold uppercase tracking-widest text-xs mb-8">Key Products</h4>
                        <ul className="space-y-4 text-sm font-medium text-slate-600">
                            {products.map((p) => (
                                <li key={p.id}>
                                    <Link href={`/products/${p.slug}`} className="hover:text-brand transition-colors">{p.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Industries */}
                    <div className="md:col-span-4 lg:col-span-2">
                        <h4 className="text-brand-dark font-bold uppercase tracking-widest text-xs mb-8">Industries</h4>
                        <ul className="space-y-4 text-sm font-medium text-slate-600">
                            {industries.map((ind) => (
                                <li key={ind}><Link href="/industries" className="hover:text-brand transition-colors">{ind}</Link></li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center md:text-left">&copy; {site.foundedYear} {site.name}. All Rights Reserved.</p>
                    <p className="text-[10px] text-slate-300">{contact.address.street}, {contact.address.city}, {contact.address.region}, India</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
