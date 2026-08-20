"use client";

import { useEffect, useRef } from "react";

/**
 * The desktop artboard parks the hero visual as you scroll. Kept to a single
 * passive listener writing to one element — no animation library, and it is a
 * no-op below lg and under prefers-reduced-motion, so a phone pays nothing.
 */
const ParallaxVisual = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const wide = window.matchMedia("(min-width: 1024px)");
        const still = window.matchMedia("(prefers-reduced-motion: reduce)");
        let frame = 0;

        const apply = () => {
            frame = 0;
            if (!wide.matches || still.matches) {
                el.style.transform = "";
                el.style.opacity = "";
                return;
            }
            const y = Math.min(window.scrollY, 500);
            el.style.transform = `translateY(${y / 5}px)`;
            el.style.opacity = String(1 - (y / 500) * 0.5);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(apply);
        };

        apply();
        window.addEventListener("scroll", onScroll, { passive: true });
        wide.addEventListener("change", apply);
        return () => {
            window.removeEventListener("scroll", onScroll);
            wide.removeEventListener("change", apply);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
};

export default ParallaxVisual;
