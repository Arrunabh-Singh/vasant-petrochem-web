"use client";
import { motion } from "framer-motion";
import { Factory, ShieldCheck } from "lucide-react";
import Image from "next/image";

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

export default InfrastructureSection;