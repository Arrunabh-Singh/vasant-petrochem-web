/**
 * Abstract refinery illustration standing in for real facility photography.
 * Tank levels pulse and the pipe dashes flow, matching the design artboards.
 */
const tanks = [
    { x: 110, w: 130, h: 220, delay: "0s" },
    { x: 270, w: 90, h: 170, delay: "0.8s" },
    { x: 470, w: 110, h: 200, delay: "1.6s" },
    { x: 610, w: 140, h: 240, delay: "2.4s" },
];

const pipes = [
    "M 175 400 L 175 460 L 390 460 L 390 480",
    "M 315 380 L 315 450 L 390 450",
    "M 525 400 L 525 465 L 430 465",
];

const RefineryVisual = () => (
    <svg viewBox="0 0 800 600" className="w-full h-full block" role="img" aria-label="Stylized illustration of refinery storage tanks and a distillation tower">
        <defs>
            <linearGradient id="vpSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f2e24" />
                <stop offset="100%" stopColor="#246851" />
            </linearGradient>
            <linearGradient id="vpTank" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e6f0ed" />
                <stop offset="100%" stopColor="#c9ded6" />
            </linearGradient>
            <pattern id="vpGrid" width="70" height="70" patternUnits="userSpaceOnUse">
                <path d="M70 0 L0 0 0 70" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.08" />
            </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#vpSky)" />
        <rect width="800" height="600" fill="url(#vpGrid)" />

        {/* Distillation tower */}
        <rect x="360" y="120" width="60" height="360" rx="6" fill="url(#vpTank)" />
        {[170, 220, 270, 320, 370, 420].map((y) => (
            <rect key={y} x="350" y={y} width="80" height="10" fill="#246851" opacity="0.5" />
        ))}
        <circle cx="390" cy="105" r="18" fill="url(#vpTank)" />

        {/* Storage tanks */}
        {tanks.map((t) => (
            <g key={t.x}>
                <rect x={t.x} y={480 - t.h} width={t.w} height={t.h} rx="8" fill="url(#vpTank)" />
                <ellipse cx={t.x + t.w / 2} cy={480 - t.h} rx={t.w / 2} ry="10" fill="#f8fafc" />
                <rect
                    x={t.x}
                    y={480 - t.h + 24}
                    width={t.w}
                    height="6"
                    fill="#34d399"
                    opacity="0.6"
                    className="anim-rise"
                    style={{ animationDelay: t.delay }}
                />
            </g>
        ))}

        {/* Ground */}
        <rect x="0" y="480" width="800" height="120" fill="#0f2e24" />
        <line x1="0" y1="500" x2="800" y2="500" stroke="#34d399" strokeWidth="3" opacity="0.5" />

        {/* Pipe runs, with a flowing dash overlay */}
        <g stroke="#34d399" strokeWidth="4" opacity="0.7" fill="none">
            {pipes.map((d) => <path key={d} d={d} />)}
        </g>
        <g stroke="#e6f0ed" strokeWidth="4" fill="none" strokeDasharray="10 30" className="anim-flow">
            {pipes.map((d) => <path key={d} d={d} />)}
        </g>
    </svg>
);

export default RefineryVisual;
