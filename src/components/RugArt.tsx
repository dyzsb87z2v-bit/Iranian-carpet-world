// Generated rug artwork used until a listing has real photos. Drawn at the
// rug's true proportions so cards already communicate shape.

const palettes = [
  { field: "#6B1A26", border: "#1B2440", medallion: "#F4EEE2", accent: "#A88A52" },
  { field: "#1B2440", border: "#6B1A26", medallion: "#E7DDCA", accent: "#A88A52" },
  { field: "#E7DDCA", border: "#6B1A26", medallion: "#1B2440", accent: "#A88A52" },
  { field: "#8C2A37", border: "#E7DDCA", medallion: "#1B2440", accent: "#A88A52" },
  { field: "#A88A52", border: "#1B2440", medallion: "#6B1A26", accent: "#F4EEE2" },
];

function rng(seed: number) {
  // Scramble the seed so nearby seeds give visibly different rugs.
  let s = (Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0) % 2147483647 || 1;
  const next = () => (s = (s * 16807) % 2147483647) / 2147483647;
  next();
  next();
  return next;
}

interface Props {
  seed: number;
  widthCm: number;
  lengthCm: number;
  kilim?: boolean;
  className?: string;
  title?: string;
}

export function RugArt({ seed, widthCm, lengthCm, kilim = false, className, title }: Props) {
  const r = rng(seed);
  const p = palettes[Math.floor(r() * palettes.length)];
  const w = 100;
  const h = Math.round((lengthCm / Math.max(widthCm, 1)) * 100);
  const b = 9; // outer border width
  const inner = { x: b, y: b, w: w - 2 * b, h: h - 2 * b };
  const cx = w / 2;
  const cy = h / 2;
  const medW = inner.w * (0.42 + r() * 0.12);
  const medH = Math.min(inner.h * 0.5, medW * (1.3 + r() * 0.4));
  const steps = kilim ? 4 : 0;
  const repeat = 3 + Math.floor(r() * 3);
  const id = `rug-${seed}`;

  const diamond = (x: number, y: number, rw: number, rh: number) =>
    `M ${x} ${y - rh} L ${x + rw} ${y} L ${x} ${y + rh} L ${x - rw} ${y} Z`;

  const stepped = (x: number, y: number, rw: number, rh: number, n: number) => {
    if (!n) return diamond(x, y, rw, rh);
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) pts.push(`${x + (rw * i) / n} ${y - rh + (rh * i) / n}`);
    for (let i = 1; i <= n; i++) pts.push(`${x + rw - (rw * i) / n} ${y + (rh * i) / n}`);
    for (let i = 1; i <= n; i++) pts.push(`${x - (rw * i) / n} ${y + rh - (rh * i) / n}`);
    for (let i = 1; i < n; i++) pts.push(`${x - rw + (rw * i) / n} ${y - (rh * i) / n}`);
    return `M ${pts.join(" L ")} Z`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={`${id}-dots`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="0.9" fill={p.accent} opacity="0.55" />
        </pattern>
        <pattern id={`${id}-band`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3 L3 0 L6 3 L3 6 Z" fill={p.accent} opacity="0.8" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={p.border} />
      <rect x={b / 3} y={b / 3} width={w - (2 * b) / 3} height={h - (2 * b) / 3} fill={`url(#${id}-band)`} />
      <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill={p.field} />
      <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill={`url(#${id}-dots)`} />
      {/* corner spandrels */}
      {[
        [inner.x, inner.y, 1, 1],
        [inner.x + inner.w, inner.y, -1, 1],
        [inner.x, inner.y + inner.h, 1, -1],
        [inner.x + inner.w, inner.y + inner.h, -1, -1],
      ].map(([x, y, sx, sy], i) => (
        <path
          key={i}
          d={`M ${x} ${y} L ${x + sx * inner.w * 0.24} ${y} Q ${x + sx * inner.w * 0.08} ${y + sy * inner.w * 0.08} ${x} ${y + sy * inner.w * 0.24} Z`}
          fill={p.medallion}
          opacity="0.85"
        />
      ))}
      {/* repeated small motifs along the field */}
      {Array.from({ length: repeat }).map((_, i) => {
        const y = inner.y + ((i + 0.5) * inner.h) / repeat;
        return (
          <g key={i} opacity="0.5">
            <path d={stepped(inner.x + inner.w * 0.18, y, 4, 6, steps)} fill={p.accent} />
            <path d={stepped(inner.x + inner.w * 0.82, y, 4, 6, steps)} fill={p.accent} />
          </g>
        );
      })}
      {/* central medallion */}
      <path d={stepped(cx, cy, medW / 2, medH / 2, steps)} fill={p.medallion} />
      <path d={stepped(cx, cy, medW / 3, medH / 3, steps)} fill={p.border} />
      <path d={stepped(cx, cy, medW / 7, medH / 7, steps)} fill={p.accent} />
      <path d={`M ${cx} ${cy - medH / 2 - 7} L ${cx} ${cy - medH / 2}`} stroke={p.medallion} strokeWidth="2" />
      <path d={`M ${cx} ${cy + medH / 2} L ${cx} ${cy + medH / 2 + 7}`} stroke={p.medallion} strokeWidth="2" />
    </svg>
  );
}
