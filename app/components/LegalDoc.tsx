import type { ReactNode } from "react";

/** Visible marker for a fact only the owner can supply (MNC P5). Never invent the value. */
export const Todo = ({ id, children }: { id: string; children: ReactNode }) => (
    <mark className="rounded bg-amber-100 px-1.5 py-0.5 text-[0.92em] text-amber-900">
        TODO({id}): {children}
    </mark>
);

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="mt-9">
        <h2 className="font-serif text-xl lg:text-2xl font-bold text-brand-dark mb-3">{title}</h2>
        <div className="space-y-3 text-[15px] leading-[1.75] text-slate-600">{children}</div>
    </section>
);

/** Shared shell for the privacy policy and terms of use. */
export default function LegalDoc({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
    return (
        <section className="wash-top pt-[100px] lg:pt-[clamp(120px,14vw,176px)] pb-14 lg:pb-24">
            <div className="container-wide max-w-3xl">
                <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <strong>Draft — pending legal review.</strong> Not yet in force. Highlighted items are facts the
                    company must supply before this is published.
                </p>
                <span className="eyebrow">Legal</span>
                <h1 className="h1-page mt-2.5 mb-4">{title}</h1>
                <p className="text-base leading-[1.75] text-slate-600">{intro}</p>
                {children}
            </div>
        </section>
    );
}
