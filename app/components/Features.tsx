"use client";

import { motion } from "framer-motion";
import { Droplets, Globe, ShieldCheck } from "lucide-react";

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
              className="group p-8 rounded-2xl glass-card"
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

export default Features;