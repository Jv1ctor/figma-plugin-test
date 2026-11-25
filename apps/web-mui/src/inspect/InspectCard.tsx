import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Typography from "@mui/material/Typography";
import WarningAmberIcon from "@mui/icons-material/WarningAmberRounded";
import type { InspectResult, InspectRow, InspectState } from "./introspect.ts";

export const CARD_ATTR = "data-inspect-card";
const CARD_Z_INDEX = 1501;

const STATE_TITLES: Record<InspectState, string> = {
  rest: "Repouso",
  hover: "Hover",
  active: "Pressionado",
  focus: "Foco",
  disabled: "Desabilitado",
};
const STATE_ORDER: InspectState[] = ["rest", "hover", "active", "focus", "disabled"];
const COLOR_VALUE = /^(#|rgba?\(|hsla?\(|oklch\(|color\()/i;

function Row({ row, onPick }: { row: InspectRow; onPick(row: InspectRow): void }) {
  const isColor = COLOR_VALUE.test(row.value);
  return (
    <Box component="li" sx={{ display: "grid", gap: "var(--vx-space-xx-small)", py: "var(--vx-space-x-small)" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "var(--vx-space-x-small)", flexWrap: "wrap" }}>
        <Typography variant="body2" component="span" color="text.secondary">
          {row.label}{row.inherited ? " (herdado)" : ""}
        </Typography>
        <Link
          component="button"
          type="button"
          variant="body2"
          aria-label="Ir para o token"
          onClick={() => onPick(row)}
          sx={{ fontFamily: "monospace", textAlign: "left" }}
        >
          {row.token}
        </Link>
        <Chip size="small" variant="outlined" label={row.layer} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: "var(--vx-space-x-small)" }}>
        {isColor && (
          <span
            aria-hidden
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: "1px solid var(--vx-border-subtle)",
              background: row.value,
            }}
          />
        )}
        <Typography variant="caption" color="text.secondary">{row.value}</Typography>
      </Box>
      {row.layer === "base" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: "var(--vx-space-xx-small)", color: "warning.main" }}>
          <WarningAmberIcon fontSize="small" />
          <Typography variant="caption">token da Base aplicado direto</Typography>
        </Box>
      )}
    </Box>
  );
}

export function InspectCard({ result, anchor, pinned, onPick }: {
  result: InspectResult;
  anchor: Element;
  pinned: boolean;
  onPick(row: InspectRow): void;
}) {
  const groups = STATE_ORDER
    .map((state) => ({ state, rows: result.rows.filter((r) => r.state === state) }))
    .filter((g) => g.rows.length > 0);

  return (
    <Popper
      open
      anchorEl={anchor}
      placement="right-start"
      style={{ zIndex: CARD_Z_INDEX }}
      modifiers={[{ name: "flip", enabled: true }, { name: "preventOverflow", options: { padding: 8 } }]}
      {...{ [CARD_ATTR]: "" }}
    >
      <Paper elevation={4} sx={{ p: "var(--vx-space-medium)", width: 340, maxHeight: "70vh", overflow: "auto" }}>
        <Typography variant="subtitle2" component="h2">{result.spot ?? result.component}</Typography>
        <Typography variant="caption" color="text.secondary">{result.component}</Typography>
        {pinned && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Preso: clique de novo para soltar</Typography>}
        {groups.length === 0 && <Typography variant="body2" sx={{ mt: "var(--vx-space-small)" }}>Nenhum token aplicado</Typography>}
        {groups.map((g) => (
          <Box key={g.state} component="section" sx={{ mt: "var(--vx-space-small)" }}>
            <Typography variant="overline" component="h3">{STATE_TITLES[g.state]}</Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {g.rows.map((r) => <Row key={`${r.property}|${r.pseudo ?? ""}|${r.token}`} row={r} onPick={onPick} />)}
            </Box>
          </Box>
        ))}
      </Paper>
    </Popper>
  );
}
