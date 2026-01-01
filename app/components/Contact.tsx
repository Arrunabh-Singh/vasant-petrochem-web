"use client";

import { useState } from "react";
import { MapPin, Phone, Mail } from "lucide-react";

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Website Inquiry: ${formData.name}`;
    const body = `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`;
    window.location.href = `mailto:vasantpetrochem@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="py-24 bg-white relative">
      <div className="container-wide">
        <div className="bg-[#1a4a3a] rounded-3xl p-8 md:p-16 flex flex-col lg:flex-row gap-16 overflow-hidden relative">
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="lg:w-2/5 text-white relative z-10">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">Let&apos;s Fuel Your Growth</h2>
            <p className="text-slate-300 mb-10 leading-relaxed">
              Connect with our team in Indore for premium supply chain solutions.
            </p>

            <div className="space-y-8">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-[#34d399]/20 flex items-center justify-center text-[#34d399]">
                   <MapPin size={20} />
                </div>
                <div>
                  <p className="font-bold text-white">Headquarters</p>
                  <p className="text-slate-300 text-sm">Industrial Area, Mangaliya, Indore, MP 453771</p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                 <div className="w-10 h-10 rounded-full bg-[#34d399]/20 flex items-center justify-center text-[#34d399]">
                   <Phone size={20} />
                </div>
                <div>
                  <p className="font-bold text-white">Phone</p>
                  <p className="text-slate-300 text-sm">+91 94250 58496</p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                 <div className="w-10 h-10 rounded-full bg-[#34d399]/20 flex items-center justify-center text-[#34d399]">
                   <Mail size={20} />
                </div>
                <div>
                  <p className="font-bold text-white">Email</p>
                  <p className="text-slate-300 text-sm">vasantpetrochem@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-3/5 relative z-10">
            <form className="space-y-4 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#34d399] uppercase tracking-widest">Name</label>
                  <input
                    type="text" name="name" value={formData.name} onChange={handleChange} required
                    className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#34d399] outline-none rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#34d399] uppercase tracking-widest">Email</label>
                  <input
                    type="email" name="email" value={formData.email} onChange={handleChange} required
                    className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#34d399] outline-none rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#34d399] uppercase tracking-widest">Inquiry</label>
                <textarea
                  rows={4} name="message" value={formData.message} onChange={handleChange} required
                  className="w-full bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#34d399] outline-none rounded-lg"
                ></textarea>
              </div>
              <button type="submit" className="w-full py-4 bg-[#34d399] text-[#1a4a3a] font-bold rounded-lg hover:bg-white transition-colors">
                SEND MESSAGE
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-4">
                Note: Clicking send will open your default email client (e.g. Gmail) to securely transmit your inquiry.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;