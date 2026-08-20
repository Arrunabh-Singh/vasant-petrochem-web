/**
 * Blending & storage illustration for the Infrastructure block.
 * Same visual language as RefineryVisual on a square canvas.
 */
const tanks = [
    { x: 60, y: 230, w: 150, h: 250, ry: 14, delay: "0s", band: 380 },
    { x: 240, y: 290, w: 120, h: 190, ry: 12, delay: "1.2s", band: null },
    { x: 390, y: 200, w: 150, h: 280, ry: 14, delay: "2.4s", band: 360 },
];

const pipes = [
    "M 135 440 L 135 500",
    "M 300 440 L 300 470 L 135 470",
    "M 465 440 L 465 490 L 300 490 L 300 500",
];

const StorageTanksVisual = () => (
    <svg viewBox="0 0 600 600" className="w-full h-full block" role="img" aria-label="Stylized illustration of blending and storage tanks">
        <defs>
            <linearGradient id="vpSky2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0b241c" />
                <stop offset="100%" stopColor="#246851" />
            </linearGradient>
            <linearGradient id="vpTank2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e6f0ed" />
                <stop offset="100%" stopColor="#c9ded6" />
            </linearGradient>
            <pattern id="vpGrid2" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M50 0 L0 0 0 50" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.07" />
            </pattern>
        </defs>
        <rect width="600" height="600" fill="url(#vpSky2)" />
        <rect width="600" height="600" fill="url(#vpGrid2)" />

        {tanks.map((t) => (
            <g key={t.x}>
                <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="10" fill="url(#vpTank2)" />
                <ellipse cx={t.x + t.w / 2} cy={t.y} rx={t.w / 2} ry={t.ry} fill="#f8fafc" />
                <rect
                    x={t.x}
                    y={t.y + 32}
                    width={t.w}
                    height="7"
                    fill="#34d399"
                    opacity="0.6"
                    className="anim-rise"
                    style={{ animationDelay: t.delay }}
                />
                {t.band && <rect x={t.x} y={t.band} width={t.w} height="4" fill="#246851" opacity="0.35" />}
            </g>
        ))}

        <rect x="0" y="480" width="600" height="120" fill="#081a14" />
        <line x1="0" y1="500" x2="600" y2="500" stroke="#34d399" strokeWidth="3" opacity="0.45" />

        <g stroke="#34d399" strokeWidth="4" opacity="0.7" fill="none">
            {pipes.map((d) => <path key={d} d={d} />)}
        </g>
        <g stroke="#e6f0ed" strokeWidth="4" fill="none" strokeDasharray="8 26" className="anim-flow">
            {pipes.map((d) => <path key={d} d={d} />)}
        </g>
    </svg>
);

export default StorageTanksVisual;
