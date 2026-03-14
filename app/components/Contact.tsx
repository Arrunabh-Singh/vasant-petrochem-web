"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const productOptions = [
    "Industrial Fuel Oil (IFO-380)",
    "Base Oil SN500",
    "Base Oil SN150",
    "Paving Bitumen (VG-30)",
    "Rubber Process Oil",
    "Light Diesel Oil",
    "Mineral Turpentine (MTO)",
    "Petroleum Jelly",
    "Other",
];

const Contact = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        company: "",
        product: "",
        quantity: "",
        message: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const subject = `Quote Request: ${formData.product || "General Inquiry"} — ${formData.company || formData.name}`;
        const body = `Name: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\nProduct: ${formData.product}\nQuantity: ${formData.quantity}\n\nMessage:\n${formData.message}`;
        window.location.href = `mailto:vasantpetrochem@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <section id="contact" className="py-24 bg-white relative">
            <div className="container-wide">
                <div className="bg-[#1a4a3a] rounded-3xl p-8 md:p-16 flex flex-col lg:flex-row gap-16 overflow-hidden relative shadow-2xl">
                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#34d399]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:w-2/5 text-white relative z-10"
                    >
                        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Request a Free Quote</h2>
                        <p className="text-slate-300 mb-10 leading-relaxed">
                            Get custom pricing within 24 hours. Our team in Indore is ready to serve your petrochemical needs.
                        </p>

                        <div className="space-y-8">
                            <div className="flex gap-4 items-center group">
                                <div className="w-12 h-12 rounded-full bg-[#34d399]/10 flex items-center justify-center text-[#34d399] border border-[#34d399]/20 group-hover:bg-[#34d399]/20 transition-colors">
                                    <MapPin size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">Headquarters</p>
                                    <p className="text-slate-300 text-sm">Industrial Area, Mangaliya, Indore, MP 453771</p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center group">
                                <div className="w-12 h-12 rounded-full bg-[#34d399]/10 flex items-center justify-center text-[#34d399] border border-[#34d399]/20 group-hover:bg-[#34d399]/20 transition-colors">
                                    <Phone size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">Phone</p>
                                    <a href="tel:+919425058496" className="text-slate-300 text-sm hover:text-[#34d399] transition-colors">+91 94250 58496</a>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center group">
                                <div className="w-12 h-12 rounded-full bg-[#34d399]/10 flex items-center justify-center text-[#34d399] border border-[#34d399]/20 group-hover:bg-[#34d399]/20 transition-colors">
                                    <Mail size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">Email</p>
                                    <a href="mailto:vasantpetrochem@gmail.com" className="text-slate-300 text-sm hover:text-[#34d399] transition-colors">vasantpetrochem@gmail.com</a>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center group">
                                <div className="w-12 h-12 rounded-full bg-[#34d399]/10 flex items-center justify-center text-[#34d399] border border-[#34d399]/20 group-hover:bg-[#34d399]/20 transition-colors">
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1">Business Hours</p>
                                    <p className="text-slate-300 text-sm">Mon — Sat: 9:00 AM — 6:00 PM IST</p>
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
                        <form className="space-y-5 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm" onSubmit={handleSubmit}>
                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#34d399] uppercase tracking-widest pl-1">Full Name *</label>
                                    <input
                                        type="text" name="name" value={formData.name} onChange={handleChange} required
                                        className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#34d399] outline-none rounded-lg transition-colors placeholder:text-white/20"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#34d399] uppercase tracking-widest pl-1">Business Email *</label>
                                    <input
                                        type="email" name="email" value={formData.email} onChange={handleChange} required
                                        className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#34d399] outline-none rounded-lg transition-colors placeholder:text-white/20"
                                        placeholder="john@company.com"
                                    />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#34d399] uppercase tracking-widest pl-1">Company Name</label>
                                    <input
                                        type="text" name="company" value={formData.company} onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#34d399] outline-none rounded-lg transition-colors placeholder:text-white/20"
                                        placeholder="ABC Industries Pvt. Ltd."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#34d399] uppercase tracking-widest pl-1">Product of Interest</label>
                                    <select
                                        name="product" value={formData.product} onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#34d399] outline-none rounded-lg transition-colors appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-[#1a4a3a]">Select a product...</option>
                                        {productOptions.map((p) => (
                                            <option key={p} value={p} className="bg-[#1a4a3a]">{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#34d399] uppercase tracking-widest pl-1">Quantity Required</label>
                                <input
                                    type="text" name="quantity" value={formData.quantity} onChange={handleChange}
                                    className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#34d399] outline-none rounded-lg transition-colors placeholder:text-white/20"
                                    placeholder="e.g., 500 KL / month, 20 MT, bulk order"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#34d399] uppercase tracking-widest pl-1">Additional Details</label>
                                <textarea
                                    rows={3} name="message" value={formData.message} onChange={handleChange}
                                    className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#34d399] outline-none rounded-lg transition-colors resize-none placeholder:text-white/20"
                                    placeholder="Delivery timeline, packaging preferences, certifications needed..."
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-[#34d399] text-[#1a4a3a] font-bold rounded-lg hover:bg-white transition-all transform hover:-translate-y-1 shadow-lg shadow-[#34d399]/20 text-sm tracking-wide"
                            >
                                GET A FREE QUOTE
                            </button>
                            <p className="text-[10px] text-slate-400 text-center mt-4">
                                Clicking send will open your default email client. We respond within 24 hours on business days.
                            </p>
                        </form>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Contact;
