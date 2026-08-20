import type { Metadata } from "next";
import Infrastructure from "@/app/components/Infrastructure";
import Reveal from "@/app/components/Reveal";
import { site } from "@/app/content";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Vasant Petrochem manufactures and trades petrochemical products and industrial lubricants from Indore, serving Central India.",
  alternates: { canonical: `${site.url}/about` },
};

const values = [
  {
    num: "01",
    title: "Quotes within 24 hours",
    body: "Send the grade and quantity and you get pricing back the next business day, freight included.",
  },
  {
    num: "02",
    title: "One point of contact",
    body: "The person who quotes you is the person who tracks your dispatch. No ticket queue.",
  },
  {
    num: "03",
    title: "Batch test reports",
    body: "Viscosity, flash point, pour point and density recorded per batch and issued with the consignment.",
  },
  {
    num: "04",
    title: "Drums or bulk",
    body: "210 L and 155 kg packs, or bulk tanker loads — whatever suits your storage and offloading.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="wash-top pt-[100px] lg:pt-[clamp(120px,14vw,176px)] pb-11 lg:pb-[clamp(56px,9vw,96px)]">
        <div className="container-wide">
          <div className="max-w-3xl">
            <span className="eyebrow">About Vasant Petrochem</span>
            <h1 className="h1-page mt-2.5 mb-4 lg:mb-6">
              Manufacturing &amp; trading, est. 2025
            </h1>
            <p className="text-base lg:text-[clamp(16px,1.3vw,18px)] leading-[1.78] lg:leading-[1.75] text-slate-600 text-pretty">
              Vasant Petrochem is based in Mangaliya, Indore. We manufacture our
              own line of base oils, bitumen, industrial fuel oil, rubber
              process oil, mineral turpentine and light diesel oil — and we
              source and supply a wide range of branded industrial lubricants
              and specialty oils to match customer requirements, across Central
              India.
            </p>
          </div>
        </div>
      </section>

      <Infrastructure />

      <section className="wash-alt py-14 lg:py-[clamp(56px,9vw,96px)]">
        <div className="container-wide">
          <Reveal className="lg:text-center lg:max-w-2xl lg:mx-auto mb-7 lg:mb-14">
            <span className="eyebrow">How we work</span>
            <h2 className="h2-section mt-2.5 lg:mt-3">What you can expect</h2>
          </Reveal>

          <div className="grid gap-3 lg:grid-cols-4 lg:gap-6">
            {values.map((v, idx) => (
              <Reveal key={v.num} delay={idx * 0.08} className="h-full">
                <div className="h-full p-[22px] lg:p-[34px] rounded-[22px] glass glass-hover">
                  <p className="font-serif text-[28px] lg:text-[32px] font-bold leading-none text-brand/25 mb-3 lg:mb-4">
                    {v.num}
                  </p>
                  <h3 className="text-[17px] font-bold text-brand-dark mb-2">
                    {v.title}
                  </h3>
                  <p className="text-[14.5px] lg:text-sm leading-[1.7] text-slate-500">
                    {v.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
