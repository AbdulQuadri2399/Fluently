// Simple drawings for the three onboarding steps (03b SCR2), drawn with the colour tokens.
// Decorative: the step text carries the meaning, so each SVG is hidden from screen readers.

const card = { fill: "var(--surface)", stroke: "var(--line-strong)", strokeWidth: 1 } as const;
const wire = {
  stroke: "var(--wire)",
  strokeWidth: 1.5,
  strokeDasharray: "5 4",
  fill: "none",
} as const;

export function TreeDiagram() {
  const lanes = 7;
  return (
    <svg aria-hidden="true" viewBox="0 0 560 150" className="h-auto w-full">
      {Array.from({ length: lanes }, (_, i) => {
        const x = 8 + i * 79;
        const n = [1, 2, 3, 3, 2, 2, 1][i] ?? 1;
        return (
          <g key={i} opacity={1 - i * 0.08}>
            <rect x={x} y={8} width={64} height={6} rx={3} fill="var(--line)" />
            {Array.from({ length: n }, (_, j) => (
              <rect key={j} x={x} y={28 + j * 38} width={64} height={28} rx={6} {...card} />
            ))}
            {i < lanes - 1 ? (
              <path d={`M${x + 64} 42 C ${x + 72} 42, ${x + 71} 42, ${x + 79} 42`} {...wire} />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function CheckpointDiagram() {
  return (
    <svg aria-hidden="true" viewBox="0 0 560 150" className="h-auto w-full">
      <rect x={40} y={20} width={150} height={40} rx={8} {...card} />
      <rect x={40} y={76} width={150} height={40} rx={8} {...card} />
      <path d="M190 68 C 230 68, 230 75, 262 75" {...wire} />
      <rect
        x={262}
        y={44}
        width={258}
        height={62}
        rx={10}
        fill="var(--surface)"
        stroke="var(--line)"
      />
      <rect x={278} y={66} width={70} height={18} rx={4} fill="var(--canvas)" />
      <rect
        x={358}
        y={64}
        width={64}
        height={22}
        rx={6}
        fill="var(--surface)"
        stroke="var(--line-strong)"
      />
      <rect x={430} y={64} width={74} height={22} rx={6} fill="var(--action)" />
    </svg>
  );
}

export function TraceDiagram() {
  const cols = [40, 170, 300, 430];
  return (
    <svg aria-hidden="true" viewBox="0 0 560 150" className="h-auto w-full">
      {cols.map((x, i) => (
        <g key={x}>
          <rect x={x} y={20} width={90} height={32} rx={6} {...card} opacity={0.35} />
          <rect
            x={x}
            y={92}
            width={90}
            height={32}
            rx={6}
            fill="var(--surface)"
            stroke="var(--ink)"
            strokeWidth={1.5}
          />
          {i < cols.length - 1 ? (
            <path
              d={`M${x + 90} 108 L ${x + 130} 108`}
              stroke="var(--ink)"
              strokeWidth={1.75}
              strokeDasharray="5 4"
            />
          ) : null}
        </g>
      ))}
      <circle cx={475} cy={108} r={5} fill="var(--ok-bg)" stroke="var(--ok)" />
    </svg>
  );
}
