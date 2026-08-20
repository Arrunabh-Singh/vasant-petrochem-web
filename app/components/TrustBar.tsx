import Reveal from "./Reveal";

const TrustBar = ({ productCount }: { productCount: number }) => {
    const stats = [
        { value: `${productCount}+`, label: "Product lines" },
        { value: "Indore, MP", label: "Based in" },
        { value: "Mfg. + Trading", label: "Business model" },
        { value: "B2B", label: "Bulk supply" },
    ];

    return (
        <section className="relative overflow-hidden wash-deep py-11 lg:py-14">
            <div aria-hidden className="absolute inset-0 opacity-5 bg-[linear-gradient(45deg,#ffffff_1px,transparent_1px)] bg-[size:20px_20px]" />
            <div aria-hidden className="absolute -top-[40%] left-[-10%] lg:left-[10%] w-[80vw] lg:w-[40vw] h-[180%] lg:h-[200%] bg-[radial-gradient(circle,rgba(52,211,153,0.28),transparent_62%)]" />
            <div aria-hidden className="hidden lg:block absolute -top-[60%] right-[6%] w-[32vw] h-[200%] bg-[radial-gradient(circle,rgba(52,211,153,0.16),transparent_60%)]" />

            <div className="container-wide relative z-10">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-[clamp(12px,2vw,32px)]">
                    {stats.map((stat, idx) => (
                        <Reveal key={stat.label}>
                            <div className="h-full px-[18px] lg:px-[clamp(12px,2vw,18px)] py-[22px] lg:py-[clamp(20px,3vw,26px)] rounded-[20px] glass-dark lg:text-center">
                                <p className="font-serif text-[22px] lg:text-[clamp(24px,2.4vw,30px)] font-bold text-white leading-[1.1] mb-2 lg:mb-1">
                                    {stat.value}
                                </p>
                                <p className="text-[9.5px] lg:text-[11px] font-bold uppercase tracking-[0.18em] lg:tracking-[0.2em] text-brand-accent">
                                    {stat.label}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TrustBar;
