import Box from "@mui/material/Box";

export interface HeatmapProps { rows: string[]; cols: string[]; values: number[][]; max: number }

const BANDS = ["0–20%", "20–40%", "40–60%", "60–80%", "80–100%"] as const;
const CELL = 44;
const GAP = 4;
const LABEL_W = 56;
const LABEL_H = 24;
const textSx = { fill: "var(--vx-text-secondary)", fontFamily: "var(--vx-typography-body-font-family)", fontSize: "var(--vx-typography-body-small-font-size)" };

/** Faixa 1..5 de `value/max` (limites 20/40/60/80%). */
function band(value: number, max: number): 1 | 2 | 3 | 4 | 5 {
  const r = max > 0 ? value / max : 0;
  return r < 0.2 ? 1 : r < 0.4 ? 2 : r < 0.6 ? 3 : r < 0.8 ? 4 : 5;
}

export function Heatmap({ rows, cols, values, max }: HeatmapProps) {
  const w = LABEL_W + cols.length * (CELL + GAP);
  const h = LABEL_H + rows.length * (CELL + GAP);
  return (
    <Box sx={{ display: "grid", gap: "var(--vx-space-medium)" }}>
      <svg role="img" aria-label="Mapa de calor" width="100%" viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: w }}>
        {cols.map((c, j) => (
          <text key={c} x={LABEL_W + j * (CELL + GAP) + CELL / 2} y={LABEL_H - 8} textAnchor="middle" style={textSx}>{c}</text>
        ))}
        {rows.map((r, i) => (
          <g key={r}>
            <text x={LABEL_W - 8} y={LABEL_H + i * (CELL + GAP) + CELL / 2 + 4} textAnchor="end" style={textSx}>{r}</text>
            {cols.map((c, j) => (
              <rect
                key={c}
                x={LABEL_W + j * (CELL + GAP)}
                y={LABEL_H + i * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                style={{ fill: `var(--vx-data-sequential-${band(values[i]?.[j] ?? 0, max)})` }}
              >
                <title>{`${r}, ${c}: ${values[i]?.[j] ?? 0}`}</title>
              </rect>
            ))}
          </g>
        ))}
      </svg>
      <Box component="ul" aria-label="Legenda do mapa de calor" sx={{ display: "flex", flexWrap: "wrap", gap: "var(--vx-space-medium)", listStyle: "none", m: 0, p: 0 }}>
        {BANDS.map((label, i) => (
          <Box component="li" key={label} sx={{ display: "flex", alignItems: "center", gap: "var(--vx-space-x-small)", color: "text.secondary", typography: "body2" }}>
            <Box aria-hidden sx={{ width: 16, height: 16, borderRadius: "2px", backgroundColor: `var(--vx-data-sequential-${i + 1})` }} />
            {label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
