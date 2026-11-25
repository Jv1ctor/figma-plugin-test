import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { LayerDiff, SetDiff } from "@token-bridge/tokens";

const LAYERS: Array<{ key: "base" | "semantic" | "specific" | "styles"; label: string }> = [
  { key: "base", label: "Base" },
  { key: "semantic", label: "Semantic" },
  { key: "specific", label: "Specific" },
  { key: "styles", label: "Estilos" },
];

function Row({ label, diff }: { label: string; diff: LayerDiff }) {
  const [open, setOpen] = useState(false);
  const names = [...diff.added, ...diff.changed, ...diff.removed];
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2">
          {`${label}: ${diff.added.length} novos · ${diff.changed.length} alterados · ${diff.removed.length} removidos`}
        </Typography>
        {names.length > 0 && (
          <Button size="small" aria-expanded={open} aria-label={`${open ? "Ocultar" : "Ver"} nomes (${label})`} onClick={() => setOpen(!open)}>
            {open ? "Ocultar" : "Ver nomes"}
          </Button>
        )}
      </Box>
      {open && (
        <Box component="ul" sx={{ m: 0, pl: 3, color: "var(--vx-text-secondary)" }}>
          {names.map((n) => <li key={n}><Typography variant="caption">{n}</Typography></li>)}
        </Box>
      )}
    </Box>
  );
}

export function DiffSummary({ diff }: { diff: SetDiff }) {
  return (
    <Box sx={{ display: "grid", gap: 0.5 }}>
      {LAYERS.map((l) => <Row key={l.key} label={l.label} diff={diff[l.key]} />)}
    </Box>
  );
}
