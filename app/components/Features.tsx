import { Droplets, Globe, ShieldCheck } from "lucide-react";
import Reveal from "./Reveal";

const features = [
    {
        icon: Droplets,
        title: "Manufacturing & Trading",
        body: "We manufacture our own product lines and source branded lubricants from trusted suppliers to cover what we don't make ourselves.",
    },
    {
        icon: Globe,
        title: "Central India Coverage",
        body: "Based in Indore, serving industrial buyers across Madhya Pradesh and neighbouring states.",
    },
    {
        icon: ShieldCheck,
        title: "Careful Handling",
        body: "Attentive storage and handling practices across our facility and supply chain.",
    },
];

const Features = () => (
    <section id="about" className="relative overflow-hidden wash-mid py-14 lg:py-[clamp(56px,9vw,96px)]">
        <div aria-hidden className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#246851_1px,transparent_1px)] bg-[size:20px_20px]" />

        <div className="container-wide relative z-10">
            <Reveal className="lg:text-center lg:max-w-2xl lg:mx-auto mb-7 lg:mb-16">
                <span className="eyebrow">Why Vasant</span>
                <h2 className="h2-section mt-2.5 lg:mt-3">Engineering excellence</h2>
            </Reveal>

            <div className="grid gap-3.5 lg:grid-cols-3 lg:gap-8">
                {features.map((f, idx) => (
                    <Reveal key={f.title} className="h-full">
                        <div className="h-full p-[26px] lg:p-[34px] rounded-3xl lg:rounded-[22px] glass glass-hover">
                            <div className="w-[54px] h-[54px] lg:w-16 lg:h-16 rounded-2xl lg:rounded-[18px] flex items-center justify-center mb-5 lg:mb-8 bg-[linear-gradient(150deg,rgba(52,211,153,0.24),rgba(36,104,81,0.08))] border border-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                <f.icon className="w-[26px] h-[26px] lg:w-8 lg:h-8 text-brand" strokeWidth={1.9} />
                            </div>
                            <h3 className="text-[19px] lg:text-xl font-bold text-brand-dark mb-2.5 lg:mb-4">{f.title}</h3>
                            <p className="text-[15px] lg:text-sm leading-[1.7] text-slate-500 text-pretty">{f.body}</p>
                        </div>
                    </Reveal>
                ))}
            </div>
        </div>
    </section>
);

export default Features;
