import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import WarningAmberIcon from "@mui/icons-material/WarningAmberRounded";
import type { Warning } from "@token-bridge/tokens";

/** Ícone de aviso com tooltip das mensagens; não renderiza nada sem avisos. */
export function WarningBadge({ warnings, label }: { warnings: Warning[]; label: string }) {
  if (warnings.length === 0) return null;
  return (
    <Tooltip slotProps={{ popper: { "data-editor-portal": "" } as object }} title={<Box>{warnings.map((w) => <div key={w.id}>{w.message}</div>)}</Box>}>
      <Box component="span" role="img" aria-label={`${warnings.length} aviso${warnings.length > 1 ? "s" : ""} em ${label}`} sx={{ display: "inline-flex" }}>
        <WarningAmberIcon fontSize="small" color="warning" />
      </Box>
    </Tooltip>
  );
}
