/**
 * Scroll reveal, desktop only — the phone artboard has none.
 *
 * Deliberately a plain server component with no hidden initial state: the
 * animation lives entirely in the `.reveal` rule, driven by `animation-timeline`
 * where the browser supports it. Content is visible the moment HTML lands, so a
 * slow bundle or a missed IntersectionObserver can never leave the page blank —
 * which is exactly what a JS-gated `opacity: 0` did here on mobile.
 */
const Reveal = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => <div className={className ? `reveal ${className}` : "reveal"}>{children}</div>;

export default Reveal;
