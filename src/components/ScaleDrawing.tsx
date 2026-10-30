// Floor-plan view: the rug and a 180 cm person drawn at one scale, so the
// buyer reads size without converting numbers.

interface Props {
  lengthCm: number;
  widthCm: number;
  label: string;
}

export function ScaleDrawing({ lengthCm, widthCm, label }: Props) {
  const person = 180;
  const gap = 40;
  const pad = 20;
  const w = widthCm + gap + 50 + pad * 2;
  const h = Math.max(lengthCm, person) + pad * 2 + 24;
  const rugX = pad;
  const rugY = h - pad - lengthCm;
  const px = rugX + widthCm + gap + 25;
  const base = h - pad;
  const head = 22;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full max-w-xs" role="img" aria-label={label}>
      <rect x={rugX} y={rugY} width={widthCm} height={lengthCm} fill="#6B1A26" opacity="0.12" stroke="#6B1A26" strokeWidth="2" />
      <text x={rugX + widthCm / 2} y={rugY - 8} textAnchor="middle" fontSize="16" fill="#7D736A">{widthCm} cm</text>
      <text
        x={rugX + widthCm + 14}
        y={rugY + lengthCm / 2}
        fontSize="16"
        fill="#7D736A"
        transform={`rotate(90 ${rugX + widthCm + 14} ${rugY + lengthCm / 2})`}
        textAnchor="middle"
      >
        {lengthCm} cm
      </text>
      {/* 180 cm person */}
      <g fill="#1B2440" opacity="0.75">
        <circle cx={px} cy={base - person + head / 2} r={head / 2} />
        <rect x={px - 15} y={base - person + head + 4} width={30} height={72} rx={10} />
        <rect x={px - 13} y={base - person + head + 70} width={11} height={person - head - 70} rx={4} />
        <rect x={px + 2} y={base - person + head + 70} width={11} height={person - head - 70} rx={4} />
      </g>
      <line x1={pad / 2} x2={w - pad / 2} y1={base} y2={base} stroke="#7D736A" strokeWidth="1" />
    </svg>
  );
}
