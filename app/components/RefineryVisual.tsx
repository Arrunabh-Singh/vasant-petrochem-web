/**
 * Abstract refinery illustration standing in for real facility photography.
 * Swap for actual site photos in /public once available — see plan's "Open item".
 */
const RefineryVisual = () => (
    <svg viewBox="0 0 800 600" className="w-full h-full" role="img" aria-label="Stylized illustration of refinery storage tanks and a distillation tower">
        <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a4a3a" />
                <stop offset="100%" stopColor="#246851" />
            </linearGradient>
            <linearGradient id="tank" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e6f0ed" />
                <stop offset="100%" stopColor="#c9ded6" />
            </linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#sky)" />
        <g opacity="0.08" stroke="#ffffff" strokeWidth="1">
            {Array.from({ length: 12 }, (_, i) => (
                <line key={`v${i}`} x1={i * 70} y1="0" x2={i * 70} y2="600" />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 70} x2="800" y2={i * 70} />
            ))}
        </g>

        {/* Distillation tower */}
        <rect x="360" y="120" width="60" height="360" rx="6" fill="url(#tank)" />
        {[170, 220, 270, 320, 370, 420].map((y) => (
            <rect key={y} x="350" y={y} width="80" height="10" fill="#246851" opacity="0.5" />
        ))}
        <circle cx="390" cy="105" r="18" fill="url(#tank)" />

        {/* Storage tanks */}
        {[
            { x: 110, w: 130, h: 220 },
            { x: 270, w: 90, h: 170 },
            { x: 470, w: 110, h: 200 },
            { x: 610, w: 140, h: 240 },
        ].map((t, i) => (
            <g key={i}>
                <rect x={t.x} y={480 - t.h} width={t.w} height={t.h} rx="8" fill="url(#tank)" />
                <ellipse cx={t.x + t.w / 2} cy={480 - t.h} rx={t.w / 2} ry="10" fill="#f8fafc" />
                <rect x={t.x} y={480 - t.h + 24} width={t.w} height="6" fill="#34d399" opacity="0.6" />
            </g>
        ))}

        {/* Ground */}
        <rect x="0" y="480" width="800" height="120" fill="#0f2e24" />
        <g stroke="#34d399" strokeWidth="3" opacity="0.5">
            <line x1="0" y1="500" x2="800" y2="500" />
        </g>

        {/* Pipe connectors */}
        <g stroke="#34d399" strokeWidth="4" opacity="0.7" fill="none">
            <path d="M 175 400 L 175 460 L 390 460 L 390 480" />
            <path d="M 315 380 L 315 450 L 390 450" />
            <path d="M 525 400 L 525 465 L 430 465" />
        </g>
    </svg>
);

export default RefineryVisual;
