import { Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { contact, site, addressLine, nav } from "../content";
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
        <footer className="relative z-1 pt-11 lg:pt-[clamp(56px,9vw,96px)] pb-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.44),rgba(230,240,237,0.66))] backdrop-blur-[18px] backdrop-saturate-[1.4] border-t border-white/75">
            <div className="container-wide">
                {/* Phone footer */}
                <div className="lg:hidden">
                    <div className="flex items-center gap-3.5 mb-[22px]">
                        <span className="relative block w-[62px] h-[62px] shrink-0">
                            <Image src="/vasant_logo.png" alt="Vasant Petrochem" fill sizes="62px" className="object-contain" />
                        </span>
                        <span>
                            <span className="block font-serif text-[21px] font-bold text-brand-dark leading-none mb-1">VASANT</span>
                            <span className="block text-[8.5px] font-bold uppercase tracking-[0.3em] text-brand">Petrochem</span>
                        </span>
                    </div>
                    <p className="text-sm leading-[1.75] text-slate-500 mb-[26px]">
                        {addressLine}. {site.tagline}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 mb-[26px]">
                        {nav.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center h-12 px-4 rounded-[14px] text-sm font-semibold text-brand-dark bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(255,255,255,0.32))] border border-white/80"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                    <div className="flex gap-4 mb-[26px]">
                        <a href={`mailto:${contact.email}`} aria-label="Email us" className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center transition-colors hover:bg-brand">
                            <Mail size={16} />
                        </a>
                        <a href={contact.phoneHref} aria-label="Call us" className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center transition-colors hover:bg-brand">
                            <Phone size={16} />
                        </a>
                    </div>
                    <p className="pt-[22px] border-t border-brand/15 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        &copy; {site.foundedYear} {site.name}. All rights reserved.
                    </p>
                </div>

                {/* Desktop footer */}
                <div className="hidden lg:block">
                    <div className="grid grid-cols-12 gap-[clamp(34px,4vw,48px)] mb-[clamp(40px,6vw,64px)]">
                        <div className="col-span-5 flex flex-col items-start">
                            <span className="relative block w-28 h-28 mb-6">
                                <Image src="/vasant_logo.png" alt="Vasant Petrochem" fill sizes="112px" className="object-contain" />
                            </span>
                            <span className="font-serif text-2xl font-bold text-brand-dark mb-2">VASANT PETROCHEM</span>
                            <p className="max-w-sm text-sm leading-[1.7] text-slate-500 mb-6">
                                {addressLine}.<br />
                                {site.tagline}
                            </p>
                            <div className="flex gap-4">
                                <a href={`mailto:${contact.email}`} aria-label="Email us" className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center transition-colors hover:bg-brand">
                                    <Mail size={16} />
                                </a>
                                <a href={contact.phoneHref} aria-label="Call us" className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center transition-colors hover:bg-brand">
                                    <Phone size={16} />
                                </a>
                            </div>
                        </div>

                        <div className="col-span-2">
                            <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-dark mb-8">Company</h4>
                            <ul className="flex flex-col gap-4 text-sm font-medium text-slate-600">
                                <li><Link href="/" className="transition-colors hover:text-brand">Home</Link></li>
                                <li><Link href="/about" className="transition-colors hover:text-brand">About Us</Link></li>
                                <li><Link href="/about#infrastructure" className="transition-colors hover:text-brand">Infrastructure</Link></li>
                                <li><Link href="/contact" className="transition-colors hover:text-brand">Contact</Link></li>
                            </ul>
                        </div>

                        <div className="col-span-3">
                            <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-dark mb-8">Key Products</h4>
                            <ul className="flex flex-col gap-4 text-sm font-medium text-slate-600">
                                {products.map((p) => (
                                    <li key={p.id}>
                                        <Link href={`/products/${p.slug}`} className="transition-colors hover:text-brand">{p.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="col-span-2">
                            <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-dark mb-8">Industries</h4>
                            <ul className="flex flex-col gap-4 text-sm font-medium text-slate-600">
                                {industries.map((ind) => (
                                    <li key={ind}>
                                        <Link href="/industries" className="transition-colors hover:text-brand">{ind}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-8 flex flex-wrap justify-between items-center gap-4">
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                            &copy; {site.foundedYear} {site.name}. All Rights Reserved.
                        </p>
                        <p className="text-[10px] text-slate-300">
                            {contact.address.street}, {contact.address.city}, {contact.address.region}, India
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
