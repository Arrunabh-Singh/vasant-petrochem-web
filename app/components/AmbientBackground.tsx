/**
 * The drifting blobs the whole site floats on. Fixed and pointer-transparent,
 * sitting at z-0 so every translucent `.wash-*` section reads through it.
 *
 * ponytail: the radial gradients carry their own falloff, so no `filter: blur()`
 * here. A blurred 100vw layer is one of the most expensive things a page can
 * composite, and at this softness it looks identical without.
 */
const AmbientBackground = () => (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[14vh] -left-[30vw] w-[100vw] h-[100vw] lg:-top-[20vh] lg:-left-[14vw] lg:w-[64vw] lg:h-[64vw] rounded-full anim-drift-wide lg:anim-drift bg-[radial-gradient(circle,rgba(52,211,153,0.30),transparent_62%)]" />
        <div className="absolute -bottom-[20vh] -right-[34vw] w-[110vw] h-[110vw] lg:-bottom-[28vh] lg:-right-[16vw] lg:w-[72vw] lg:h-[72vw] rounded-full anim-drift-slow bg-[radial-gradient(circle,rgba(36,104,81,0.26),transparent_62%)]" />
        <div className="hidden lg:block absolute top-[32vh] left-[40vw] w-[46vw] h-[46vw] rounded-full bg-[radial-gradient(circle,rgba(26,74,58,0.16),transparent_66%)]" />
    </div>
);

export default AmbientBackground;
