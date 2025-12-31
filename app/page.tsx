"use client";

import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { ArrowRight, Droplets, Factory, ShieldCheck, MapPin, Phone, Mail, Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

// --- ANIMATION VARIANTS ---
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.8, 
      ease: "easeOut"
    } 
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

// --- COMPONENTS ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed w-full z-50 bg-white/80 backdrop-blur-2xl border-b border-[#246851]/10 supports-[backdrop-filter]:bg-white/60"
    >
      <div className="container-wide">
        <div className="flex justify-between items-center h-24">
          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center gap-6 group cursor-pointer">
            <div className="relative w-24 h-24 transition-transform duration-500 group-hover:scale-105">
              <Image 
                src="/vasant_logo.png" 
                alt="Vasant Petrochem Logo" 
                fill 
                className="object-contain"
              />
            </div>
            <div className="flex flex-col border-l border-[#246851]/20 pl-6">
              <span className="font-serif text-2xl font-bold text-[#1a4a3a] tracking-wide leading-none">
                VASANT
              </span>
              <span className="text-[11px] font-bold text-[#246851] tracking-[0.3em] uppercase mt-1">Petrochem</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-12 items-center">
            {["Home", "About", "Products", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-xs font-bold text-slate-500 hover:text-[#246851] transition-colors uppercase tracking-[0.15em]"
              >
                {item}
              </a>
            ))}
            <a href="#contact" className="btn-primary text-[11px] px-8 py-3 tracking-widest rounded-full">
              GET QUOTE
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-[#246851]">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden absolute top-24 left-0 w-full bg-white border-b border-[#246851]/10 p-6 shadow-xl"
        >
          <div className="flex flex-col space-y-6">
            {["Home", "About", "Products", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-lg font-bold text-[#1a4a3a]"
                onClick={() => setIsOpen(false)}
              >
                {item}
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-[#f8fafc] pt-32 pb-20">
      {/* Brand Pattern Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 z-0" />
      
      {/* Organic Shape Decoration (The 'Drop' from Logo) */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[#246851]/5 rounded-bl-full z-0 pointer-events-none blur-3xl" />

      <div className="container-wide relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="lg:w-1/2"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md border border-[#246851]/20 shadow-sm mb-10">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#246851] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#246851]"></span>
             </span>
             <span className="text-[#1a4a3a] font-bold tracking-widest uppercase text-[11px]">Industrial Excellence • Est. 2025</span>
          </motion.div>
          
          <motion.h1 variants={fadeInUp} className="h1-hero mb-8 leading-[1.1]">
            Advanced <br />
            <span className="text-gradient-brand">Petrochemical Solutions</span>
          </motion.h1>
          
          <motion.p variants={fadeInUp} className="text-slate-600 text-lg md:text-xl mb-12 leading-relaxed font-light">
            Vasant Petrochem delivers premium industrial solvents and fuels engineered for performance. We combine cutting-edge refining technology with a robust supply chain to power Central India&apos;s manufacturing sector.
          </motion.p>
          
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-5">
            <a href="#products" className="btn-primary rounded-sm shadow-xl shadow-[#246851]/10 px-10">
              VIEW CATALOG
            </a>
            <a href="#contact" className="btn-outline-brand rounded-sm px-10">
              CONTACT SALES
            </a>
          </motion.div>
        </motion.div>

        {/* Hero Visual */}
        <motion.div 
           style={{ y }}
           className="lg:w-1/2 relative"
        >
           <div className="relative w-full aspect-[4/3] max-w-[600px] mx-auto">
              <div className="absolute -inset-4 border-2 border-[#246851]/10 rounded-xl z-0"></div>
              <Image 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1500&auto=format&fit=crop"
                alt="Industrial Refinery Operations"
                fill
                className="object-cover rounded-lg shadow-2xl relative z-10"
                priority
              />
              
              {/* Floating Stat Card */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute -bottom-10 -left-10 bg-white p-6 rounded-lg shadow-xl border-l-4 border-l-[#246851] max-w-[240px] z-20 hidden md:block"
              >
                 <p className="text-3xl font-bold text-[#1a4a3a] mb-1">99.9%</p>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purity Standards</p>
                 <p className="text-xs text-slate-500 mt-2 leading-relaxed">Exceeding ISO requirements for industrial solvents.</p>
              </motion.div>
           </div>
        </motion.div>
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    {
      icon: Droplets,
      title: "Molecular Purity",
      desc: "Our fractional distillation achieves 99.9% purity, ensuring stability in your formulations."
    },
    {
      icon: Globe,
      title: "Sustainable Chain",
      desc: "Committed to green chemistry principles and reduced carbon footprint logistics."
    },
    {
      icon: ShieldCheck,
      title: "Industrial Safety",
      desc: "State-of-the-art facility designed with automated fail-safes and rigorous protocols."
    }
  ];

  return (
    <section id="about" className="py-24 bg-white relative">
      <div className="container-wide">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="group p-8 rounded-2xl bg-[#f8fafc] hover:bg-white border border-transparent hover:border-[#246851]/20 hover:shadow-2xl transition-all duration-500 cursor-default"
            >
              <div className="w-16 h-16 bg-[#246851]/5 rounded-xl flex items-center justify-center mb-8 group-hover:bg-[#246851] transition-all duration-500 shadow-sm">
                <f.icon className="w-8 h-8 text-[#246851] group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-xl font-bold text-[#1a4a3a] mb-4">{f.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const InfrastructureSection = () => {
  return (
    <section className="py-32 bg-[#1a4a3a] text-white relative overflow-hidden">
      {/* Abstract Geometry */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-[linear-gradient(45deg,#ffffff_1px,transparent_1px)] [background-size:30px_30px]" />
      
      <div className="container-wide relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-24">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="inline-block px-4 py-1 border border-white/20 rounded-full bg-white/5 mb-8">
              <span className="text-[#34d399] text-[10px] font-bold tracking-[0.3em] uppercase">Global Standards</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight">State-of-the-Art <br /><span className="text-[#34d399]">Infrastructure</span></h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-10 font-light">
              Our Mangaliya facility is engineered for precision and scale. We utilize advanced automated blending units and high-capacity storage systems to ensure uninterrupted supply for our partners. Every operational process is strictly monitored to meet global safety and environmental protocols.
            </p>
            
            <div className="space-y-8">
              <div className="flex items-start gap-6 border-b border-white/10 pb-6">
                 <div className="w-14 h-14 rounded-full bg-[#34d399]/10 flex items-center justify-center shrink-0 border border-[#34d399]/20">
                    <Factory size={24} className="text-[#34d399]" />
                 </div>
                 <div>
                    <h4 className="font-bold text-white text-lg mb-1">Automated Processing</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Computer-controlled blending ensures consistent viscosity and chemical composition across every batch.</p>
                 </div>
              </div>
              <div className="flex items-start gap-6">
                 <div className="w-14 h-14 rounded-full bg-[#34d399]/10 flex items-center justify-center shrink-0 border border-[#34d399]/20">
                    <ShieldCheck size={24} className="text-[#34d399]" />
                 </div>
                 <div>
                    <h4 className="font-bold text-white text-lg mb-1">Quality Assurance Lab</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">In-house testing facility equipped to verify specific gravity, flash point, and purity in real-time.</p>
                 </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:w-1/2 relative h-[600px] w-full"
          >
             {/* Architectural Diagram Vibe */}
             <div className="absolute top-10 -right-10 w-2/3 h-2/3 border-2 border-[#34d399]/20 rounded-2xl z-0 hidden lg:block" />
             
            <Image 
              src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=1500&auto=format&fit=crop" 
              alt="Industrial Storage Tanks" 
              fill 
              className="object-cover rounded-xl shadow-2xl relative z-10"
            />
            
            {/* Tech Overlay - LIVE TELEMETRY */}
            <div className="absolute bottom-10 right-10 bg-black/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 z-20 w-full max-w-[280px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                 <span className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em]">Live Feed</span>
                 <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-mono text-green-400 uppercase font-bold">Active</span>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Op. Capacity</span>
                    <span className="text-xs font-bold text-white font-mono">50,000 KL</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Pressure</span>
                    <span className="text-xs font-bold text-green-400 font-mono">14.7 PSI</span>
                 </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Thermal</span>
                    <span className="text-xs font-bold text-white font-mono">NOMINAL</span>
                 </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5">
                 <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                      className="h-full bg-[#34d399]"
                    />
                 </div>
                 <p className="text-[9px] text-slate-500 mt-2 text-center uppercase tracking-widest font-mono">Real-time Sync Enabled</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const Products = () => {
  const products = [
    { name: "Industrial Fuel Oil", code: "IFO-380", spec: "Viscosity: 380 cSt", desc: "High-grade thermal energy source." },
    { name: "Base Oil SN500", code: "SN-500", spec: "Density: 0.865", desc: "Premium lubricant base stock." },
    { name: "Paving Bitumen", code: "VG-30", spec: "Penetration: 60/70", desc: "Durable asphalt for infrastructure." },
    { name: "Rubber Process Oil", code: "RPO-A", spec: "Aniline Point: 90°C", desc: "Essential for polymer industries." },
    { name: "Light Diesel Oil", code: "LDO-IN", spec: "Flash Point: >66°C", desc: "Efficient combustion fuel." },
    { name: "Mineral Turpentine", code: "MTO", spec: "Aromatics: 14%", desc: "Versatile industrial solvent." },
  ];

  return (
    <section id="products" className="py-24 bg-[#f8fafc]">
      <div className="container-wide">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <h2 className="h2-section text-[#1a4a3a]">Technical Catalog</h2>
            <p className="text-slate-600">Precision-engineered petrochemicals. Hover over any product for specification details.</p>
          </div>
          <a href="#contact" className="flex items-center gap-2 text-[#246851] font-bold hover:gap-4 transition-all">
            View Full Specifications <ArrowRight size={20} />
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-xl hover:border-[#246851] transition-all group overflow-hidden"
            >
              {/* Technical Header */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center group-hover:bg-[#246851]/5 transition-colors">
                  <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Grade</span>
                  <span className="font-mono text-xs font-bold text-[#246851]">{p.code}</span>
              </div>
              
              <div className="p-8">
                <h3 className="font-bold text-xl text-[#1a4a3a] mb-2">{p.name}</h3>
                <p className="text-slate-500 text-sm mb-4 leading-relaxed">{p.desc}</p>
                
                {/* Tech Spec Line */}
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 border-t border-slate-100 pt-4">
                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                   <span>{p.spec}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

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

const Footer = () => {
  return (
    <footer className="bg-[#f8fafc] pt-24 pb-12 border-t border-slate-200">
      <div className="container-wide">
        <div className="grid md:grid-cols-12 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-5 flex flex-col items-start">
            <div className="relative w-32 h-32 mb-6">
              <Image src="/vasant_logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="font-serif font-bold text-[#1a4a3a] text-2xl mb-2">VASANT PETROCHEM</span>
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm mb-6">
              Industrial Area, Mangaliya, Indore.<br/>
              Engineered for purity. Aligned for success.
            </p>
            <div className="flex gap-4">
               {/* Social Placeholders */}
               <div className="w-8 h-8 rounded-full bg-[#1a4a3a] text-white flex items-center justify-center hover:bg-[#246851] transition-colors cursor-pointer">
                  <Mail size={14} />
               </div>
               <div className="w-8 h-8 rounded-full bg-[#1a4a3a] text-white flex items-center justify-center hover:bg-[#246851] transition-colors cursor-pointer">
                  <Phone size={14} />
               </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="text-[#1a4a3a] font-bold uppercase tracking-widest text-xs mb-8">Company</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-600">
              <li><a href="#home" className="hover:text-[#246851] transition-colors">Home</a></li>
              <li><a href="#about" className="hover:text-[#246851] transition-colors">About Us</a></li>
              <li><a href="#infrastructure" className="hover:text-[#246851] transition-colors">Infrastructure</a></li>
              <li><a href="#contact" className="hover:text-[#246851] transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Products Links */}
          <div className="md:col-span-3">
             <h4 className="text-[#1a4a3a] font-bold uppercase tracking-widest text-xs mb-8">Key Products</h4>
             <ul className="space-y-4 text-sm font-medium text-slate-600">
              <li><a href="#products" className="hover:text-[#246851] transition-colors">Industrial Fuel Oil</a></li>
              <li><a href="#products" className="hover:text-[#246851] transition-colors">Base Oil SN500</a></li>
              <li><a href="#products" className="hover:text-[#246851] transition-colors">Bitumen / Asphalt</a></li>
              <li><a href="#products" className="hover:text-[#246851] transition-colors">Mineral Turpentine</a></li>
            </ul>
          </div>

          {/* Legal / Certs */}
          <div className="md:col-span-2">
            <h4 className="text-[#1a4a3a] font-bold uppercase tracking-widest text-xs mb-8">Legal</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-600">
              <li><a href="#" className="hover:text-[#246851] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#246851] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#246851] transition-colors">ISO Certification</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">&copy; 2025 Vasant Petrochem. All Rights Reserved.</p>
           <p className="text-[10px] text-slate-300">Designed with Corporate Precision</p>
        </div>
      </div>
    </footer>
  );
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <InfrastructureSection />
      <Products />
      <Contact />
      <Footer />
    </main>
  );
}