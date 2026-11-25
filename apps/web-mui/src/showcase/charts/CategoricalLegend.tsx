import Box from "@mui/material/Box";

/** Amostras `data/categorical-1..N` + nome da série (cor nunca resolvida: sempre `var(--vx-data-…)`). */
export function CategoricalLegend({ series }: { series: string[] }) {
  return (
    <Box component="ul" aria-label="Legenda das séries" sx={{ display: "flex", flexWrap: "wrap", gap: "var(--vx-space-medium)", listStyle: "none", m: 0, p: 0 }}>
      {series.map((name, i) => (
        <Box component="li" key={name} sx={{ display: "flex", alignItems: "center", gap: "var(--vx-space-x-small)", color: "text.secondary", typography: "body2" }}>
          <Box aria-hidden sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: `var(--vx-data-categorical-${i + 1})` }} />
          {name}
        </Box>
      ))}
    </Box>
  );
}
