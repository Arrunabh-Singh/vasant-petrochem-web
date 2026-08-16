/**
 * Abstract storage-tank illustration standing in for real facility photography.
 * Swap for actual site photos in /public once available — see plan's "Open item".
 */
const StorageTanksVisual = () => (
    <svg viewBox="0 0 700 600" className="w-full h-full" role="img" aria-label="Stylized illustration of industrial storage tanks">
        <defs>
            <linearGradient id="tanksBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f2e24" />
                <stop offset="100%" stopColor="#1a4a3a" />
            </linearGradient>
            <linearGradient id="tanksBody" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#d7e4e0" />
            </linearGradient>
        </defs>
        <rect width="700" height="600" fill="url(#tanksBg)" />
        <g opacity="0.06" stroke="#ffffff" strokeWidth="1">
            {Array.from({ length: 10 }, (_, i) => (
                <line key={`v${i}`} x1={i * 78} y1="0" x2={i * 78} y2="600" />
            ))}
        </g>

        {[
            { x: 60, w: 150, h: 260 },
            { x: 260, w: 170, h: 320 },
            { x: 470, w: 150, h: 280 },
        ].map((t, i) => (
            <g key={i}>
                <rect x={t.x} y={560 - t.h} width={t.w} height={t.h} rx="10" fill="url(#tanksBody)" />
                <ellipse cx={t.x + t.w / 2} cy={560 - t.h} rx={t.w / 2} ry="14" fill="#ffffff" />
                <rect x={t.x} y={560 - t.h + 34} width={t.w} height="8" fill="#34d399" opacity="0.7" />
                <rect x={t.x} y={560 - t.h + 60} width={t.w} height="3" fill="#246851" opacity="0.4" />
                <rect x={t.x} y={560 - t.h + 76} width={t.w} height="3" fill="#246851" opacity="0.4" />
                <circle cx={t.x + t.w - 20} cy={560 - t.h + 20} r="6" fill="#246851" />
            </g>
        ))}

        <rect x="0" y="560" width="700" height="40" fill="#0a1f18" />
        <g stroke="#34d399" strokeWidth="3" opacity="0.6" fill="none">
            <path d="M 135 400 L 135 540 L 345 540" />
            <path d="M 345 380 L 345 540" />
            <path d="M 545 420 L 545 540 L 345 540" />
        </g>
    </svg>
);

export default StorageTanksVisual;
