"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Clock, Mail, MapPin, Phone } from "lucide-react";
import { contact, addressLine } from "../content";
import { submitQuoteRequest, type QuoteFormState } from "../actions/quote";
import WhatsAppIcon from "./WhatsAppIcon";
import type { Product } from "@/lib/products";

const initialState: QuoteFormState = { status: "idle" };

const waHref = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
    "Hello, I'd like to request a quote."
)}`;

const rows = [
    { icon: MapPin, label: "Headquarters", value: addressLine },
    { icon: Phone, label: "Phone", value: contact.phone, href: contact.phoneHref },
    { icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    { icon: Clock, label: "Business Hours", value: contact.hours },
];

const Contact = ({
    products,
    sourcePage = "/contact",
    defaultProduct = "",
}: {
    products: Product[];
    sourcePage?: string;
    defaultProduct?: string;
}) => {
    const [state, formAction, pending] = useActionState(submitQuoteRequest, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.status === "success") formRef.current?.reset();
    }, [state.status]);

    return (
        <section id="contact" className="wash-top pt-[100px] lg:pt-32 pb-14 lg:pb-24 min-h-dvh">
            <div className="container-wide">
                {/* The shell is transparent on a phone and becomes the dark slab at lg. */}
                <div className="relative overflow-hidden lg:grid lg:grid-cols-2 lg:gap-[clamp(40px,4vw,64px)] lg:p-[clamp(32px,4vw,64px)] lg:rounded-[30px] lg:border lg:border-white/15 lg:bg-[linear-gradient(135deg,rgba(15,46,36,0.97),rgba(36,104,81,0.92))] lg:shadow-[0_60px_120px_-50px_rgba(15,46,36,0.85),inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <div aria-hidden className="hidden lg:block absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div aria-hidden className="hidden lg:block absolute bottom-0 left-0 w-96 h-96 rounded-full bg-brand-accent/5 blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <span className="eyebrow lg:hidden">Get a quote</span>
                        <h1 className="h1-page lg:font-serif lg:text-[clamp(26px,3.2vw,40px)] lg:text-white mt-2.5 lg:mt-0 mb-3.5 lg:mb-4">
                            Request a free quote
                        </h1>
                        <p className="text-base leading-[1.75] lg:leading-[1.7] text-slate-600 lg:text-slate-300 mb-[26px] lg:mb-10">
                            <span className="lg:hidden">
                                Custom pricing within 24 hours on business days. Urgent? WhatsApp or call — that reaches a person.
                            </span>
                            <span className="hidden lg:inline">
                                Get custom pricing within 24 hours. Our team in Indore is ready to serve your petrochemical needs.
                            </span>
                        </p>

                        {/* Phone: two thumb-sized shortcuts instead of a contact list. */}
                        <div className="lg:hidden grid grid-cols-2 gap-3 mb-[26px]">
                            <a
                                href={contact.phoneHref}
                                className="flex flex-col gap-2.5 p-[18px] rounded-[20px] text-brand-dark bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(255,255,255,0.46))] border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_20px_42px_-30px_rgba(15,46,36,0.45)]"
                            >
                                <Phone size={22} className="text-brand" strokeWidth={1.9} />
                                <span className="text-[12.5px] font-bold">Call the desk</span>
                            </a>
                            <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col gap-2.5 p-[18px] rounded-[20px] text-white bg-[linear-gradient(135deg,#246851,#1a4a3a)] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_24px_46px_-26px_rgba(15,46,36,0.8)]"
                            >
                                <WhatsAppIcon size={22} />
                                <span className="text-[12.5px] font-bold">WhatsApp us</span>
                            </a>
                        </div>

                        {/* Desktop: the full contact list. */}
                        <div className="hidden lg:flex flex-col gap-8 text-white">
                            {rows.map((row) => (
                                <div key={row.label} className="flex gap-4 items-center group">
                                    <div className="w-[50px] h-[50px] shrink-0 rounded-full flex items-center justify-center text-brand-accent bg-[linear-gradient(145deg,rgba(52,211,153,0.24),rgba(255,255,255,0.05))] backdrop-blur-[12px] border border-brand-accent/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] transition-colors group-hover:bg-brand-accent/20">
                                        <row.icon size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[15px] font-bold text-white mb-1">{row.label}</p>
                                        {row.href ? (
                                            <a href={row.href} className="text-sm text-slate-300 transition-colors hover:text-brand-accent">
                                                {row.value}
                                            </a>
                                        ) : (
                                            <p className="text-sm text-slate-300">{row.value}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="p-[26px] lg:p-[34px] rounded-[28px] lg:rounded-3xl panel-deep lg:bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] lg:backdrop-blur-[20px] lg:backdrop-saturate-[1.4] lg:border-white/15 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_24px_50px_-26px_rgba(0,0,0,0.6)]">
                            {state.status === "success" ? (
                                <div className="flex flex-col items-center text-center gap-4 py-6">
                                    <CheckCircle2 className="text-brand-accent" size={46} strokeWidth={1.8} />
                                    <h2 className="font-serif text-[26px] lg:text-xl font-bold text-white">Request received</h2>
                                    <p className="max-w-sm text-[14.5px] leading-[1.7] text-slate-300">
                                        Thank you — our team will reach out within 24 hours on business days. For anything
                                        urgent, call {contact.phone}.
                                    </p>
                                </div>
                            ) : (
                                <form ref={formRef} action={formAction} className="flex flex-col gap-[18px] lg:gap-5">
                                    <input type="hidden" name="sourcePage" value={sourcePage} />
                                    {/* Honeypot — hidden from real visitors via CSS, catches bots that fill every field */}
                                    <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

                                    <div className="grid lg:grid-cols-2 gap-[18px] lg:gap-5">
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="name" className="field-label">Full name *</label>
                                            <input id="name" type="text" name="name" required autoComplete="name" placeholder="John Doe" className="field-input" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="email" className="field-label">Business email *</label>
                                            <input id="email" type="email" name="email" required autoComplete="email" placeholder="john@company.com" className="field-input" />
                                        </div>
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-[18px] lg:gap-5">
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="company" className="field-label">Company name</label>
                                            <input id="company" type="text" name="company" autoComplete="organization" placeholder="ABC Industries Pvt. Ltd." className="field-input" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="phone" className="field-label">Phone / WhatsApp</label>
                                            <input id="phone" type="tel" name="phone" autoComplete="tel" inputMode="tel" placeholder="+91 …" className="field-input" />
                                        </div>
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-[18px] lg:gap-5">
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="product" className="field-label">Product of interest</label>
                                            <select id="product" name="product" defaultValue={defaultProduct} className="field-input appearance-none cursor-pointer">
                                                <option value="" className="bg-brand-dark">Select a product…</option>
                                                {products.map((p) => (
                                                    <option key={p.id} value={`${p.name} (${p.code})`} className="bg-brand-dark">
                                                        {p.name} ({p.code})
                                                    </option>
                                                ))}
                                                <option value="Other" className="bg-brand-dark">Other</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="quantity" className="field-label">Quantity required</label>
                                            <input id="quantity" type="text" name="quantity" placeholder="e.g. 20 kL / month, 40 drums" className="field-input" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="message" className="field-label">Additional details</label>
                                        <textarea id="message" name="message" rows={3} placeholder="Delivery city, timeline, packaging preference…" className="field-input resize-none" />
                                    </div>

                                    {state.status === "error" && (
                                        <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-[14px] text-[13.5px] text-red-300 bg-red-500/10 border border-red-500/25">
                                            <AlertCircle size={16} className="shrink-0" />
                                            <span>{state.message}</span>
                                        </div>
                                    )}

                                    <button type="submit" disabled={pending} className="btn-accent w-full">
                                        {pending ? "SENDING…" : "GET A FREE QUOTE"}
                                    </button>
                                    <p className="text-[11.5px] text-center text-slate-400">
                                        We respond within 24 hours on business days.
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* Phone: the address block the desktop panel already carries. */}
                <div className="lg:hidden mt-[26px] p-[22px] rounded-3xl glass">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-brand-muted mb-1.5">Where we are</p>
                    <p className="text-[16.5px] leading-[1.6] text-brand-dark mb-4">
                        {contact.address.street}
                        <br />
                        {contact.address.city}, {contact.address.region} {contact.address.postalCode}
                    </p>
                    <div className="flex justify-between gap-4 pt-4 border-t border-brand/10 text-sm">
                        <span className="text-slate-500">Mon — Sat</span>
                        <span className="font-semibold text-brand-dark">9:00 AM — 6:00 PM</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-3 text-sm">
                        <span className="text-slate-500">Email</span>
                        <a href={`mailto:${contact.email}`} className="font-semibold text-brand break-all">{contact.email}</a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contact;
