"use client";

import { useActionState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { contact, addressLine } from "../content";
import { submitQuoteRequest, type QuoteFormState } from "../actions/quote";
import type { Product } from "@/lib/products";

const initialState: QuoteFormState = { status: "idle" };

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
        <section id="contact" className="pt-32 pb-24 bg-white relative min-h-screen">
            <div className="container-wide">
                <div className="bg-brand-dark rounded-3xl p-8 md:p-16 flex flex-col lg:flex-row gap-16 overflow-hidden relative shadow-2xl">
                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:w-2/5 text-white relative z-10"
                    >
                        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Request a Free Quote</h1>
                        <p className="text-slate-300 mb-10 leading-relaxed">
                            Get custom pricing within 24 hours. Our team in Indore is ready to serve your petrochemical needs.
                        </p>

                        <div className="space-y-8">
                            <div className="flex gap-4 items-center group">
                                <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent border border-brand-accent/20 group-hover:bg-brand-accent/20 transition-colors">
                                    <MapPin size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">Headquarters</p>
                                    <p className="text-slate-300 text-sm">{addressLine}</p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center group">
                                <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent border border-brand-accent/20 group-hover:bg-brand-accent/20 transition-colors">
                                    <Phone size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">Phone</p>
                                    <a href={contact.phoneHref} className="text-slate-300 text-sm hover:text-brand-accent transition-colors">{contact.phone}</a>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center group">
                                <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent border border-brand-accent/20 group-hover:bg-brand-accent/20 transition-colors">
                                    <Mail size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">Email</p>
                                    <a href={`mailto:${contact.email}`} className="text-slate-300 text-sm hover:text-brand-accent transition-colors">{contact.email}</a>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center group">
                                <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent border border-brand-accent/20 group-hover:bg-brand-accent/20 transition-colors">
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">Business Hours</p>
                                    <p className="text-slate-300 text-sm">{contact.hours}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="lg:w-3/5 relative z-10"
                    >
                        {state.status === "success" ? (
                            <div className="bg-white/5 p-8 rounded-2xl border border-brand-accent/30 flex flex-col items-center text-center gap-4">
                                <CheckCircle2 className="text-brand-accent" size={48} />
                                <h3 className="text-white text-xl font-bold">Request received</h3>
                                <p className="text-slate-300 text-sm max-w-sm">
                                    Thank you — our team will reach out within 24 hours on business days. For anything urgent, call {contact.phone}.
                                </p>
                            </div>
                        ) : (
                            <form ref={formRef} action={formAction} className="space-y-5 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <input type="hidden" name="sourcePage" value={sourcePage} />
                                {/* Honeypot — hidden from real visitors via CSS, catches bots that fill every field */}
                                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

                                <div className="grid md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label htmlFor="name" className="text-xs font-bold text-brand-accent uppercase tracking-widest pl-1">Full Name *</label>
                                        <input
                                            id="name" type="text" name="name" required
                                            className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-brand-accent outline-none rounded-lg transition-colors placeholder:text-white/20"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="email" className="text-xs font-bold text-brand-accent uppercase tracking-widest pl-1">Business Email *</label>
                                        <input
                                            id="email" type="email" name="email" required
                                            className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-brand-accent outline-none rounded-lg transition-colors placeholder:text-white/20"
                                            placeholder="john@company.com"
                                        />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label htmlFor="company" className="text-xs font-bold text-brand-accent uppercase tracking-widest pl-1">Company Name</label>
                                        <input
                                            id="company" type="text" name="company"
                                            className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-brand-accent outline-none rounded-lg transition-colors placeholder:text-white/20"
                                            placeholder="ABC Industries Pvt. Ltd."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="product" className="text-xs font-bold text-brand-accent uppercase tracking-widest pl-1">Product of Interest</label>
                                        <select
                                            id="product" name="product" defaultValue={defaultProduct}
                                            className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-brand-accent outline-none rounded-lg transition-colors appearance-none cursor-pointer"
                                        >
                                            <option value="" className="bg-brand-dark">Select a product...</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={`${p.name} (${p.code})`} className="bg-brand-dark">{p.name} ({p.code})</option>
                                            ))}
                                            <option value="Other" className="bg-brand-dark">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="quantity" className="text-xs font-bold text-brand-accent uppercase tracking-widest pl-1">Quantity Required</label>
                                    <input
                                        id="quantity" type="text" name="quantity"
                                        className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-brand-accent outline-none rounded-lg transition-colors placeholder:text-white/20"
                                        placeholder="e.g., 500 KL / month, 20 MT, bulk order"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="message" className="text-xs font-bold text-brand-accent uppercase tracking-widest pl-1">Additional Details</label>
                                    <textarea
                                        id="message" rows={3} name="message"
                                        className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-brand-accent outline-none rounded-lg transition-colors resize-none placeholder:text-white/20"
                                        placeholder="Delivery timeline, packaging preferences, certifications needed..."
                                    ></textarea>
                                </div>

                                {state.status === "error" && (
                                    <div className="flex items-center gap-2 text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <span>{state.message}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={pending}
                                    className="w-full py-4 bg-brand-accent text-brand-dark font-bold rounded-lg hover:bg-white transition-all transform hover:-translate-y-1 shadow-lg shadow-brand-accent/20 text-sm tracking-wide disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                                >
                                    {pending ? "SENDING..." : "GET A FREE QUOTE"}
                                </button>
                                <p className="text-[10px] text-slate-400 text-center mt-4">
                                    We respond within 24 hours on business days.
                                </p>
                            </form>
                        )}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Contact;
