import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import type { RuleId, Warning } from "@token-bridge/tokens";
import { store, useEditor, type Tab } from "../state/store.ts";

export const RULE_TITLES: Record<RuleId, string> = {
  "contrast-text": "Contraste de texto",
  "contrast-icon": "Contraste de ícone",
  "contrast-control": "Contraste de controle",
  "contrast-focus": "Anel de foco",
  "contrast-data": "Gráfico",
  "feedback-palette": "Feedback na própria paleta",
  "wrong-group": "Grupo certo",
  "size-order": "Ordem de tamanho",
  "line-height": "Altura de linha",
  "focus-width": "Foco ≥ 2",
  neutral: "Neutro",
  "data-palettes": "Paletas de dados",
  "font-weight": "Peso de fonte",
  "specific-name": "Nome de specific",
  "broken-ref": "Referência quebrada",
  "disabled-group-in-use": "Grupo desligado em uso",
};

function tabOf(token: string): Tab {
  const layer = token.split(":")[0];
  return layer === "semantic" || layer === "specific" ? layer : "base";
}

export function WarningsDrawer() {
  const open = useEditor((s) => s.warningsOpen);
  const warnings = useEditor((s) => s.warnings);
  const close = () => store.update((s) => ({ ...s, warningsOpen: false }));

  const groups = new Map<RuleId, Warning[]>();
  for (const w of warnings) groups.set(w.rule, [...(groups.get(w.rule) ?? []), w]);

  const go = (w: Warning) => store.update((s) => ({ ...s, tab: tabOf(w.token), focusToken: w.token, warningsOpen: false }));

  return (
    <Drawer anchor="right" open={open} onClose={close} slotProps={{ paper: { "aria-label": "Avisos", sx: { width: 420, maxWidth: "100vw" } } }}>
      <Box sx={{ display: "flex", alignItems: "center", p: "var(--vx-space-medium)" }}>
        <Typography variant="h6" component="h2" sx={{ flex: 1 }}>Avisos ({warnings.length})</Typography>
        <IconButton aria-label="Fechar avisos" onClick={close}><CloseIcon /></IconButton>
      </Box>
      <Divider />
      {warnings.length === 0 && <Typography sx={{ p: "var(--vx-space-medium)" }} color="text.secondary">Nenhum aviso.</Typography>}
      {[...groups].map(([rule, items]) => (
        <Box key={rule} component="section" aria-label={RULE_TITLES[rule]}>
          <Typography variant="subtitle2" component="h3" sx={{ px: "var(--vx-space-medium)", pt: "var(--vx-space-medium)" }}>
            {RULE_TITLES[rule]} ({items.length})
          </Typography>
          <List dense>
            {items.map((w) => (
              <ListItemButton key={w.id} onClick={() => go(w)}>
                <ListItemText primary={w.message} secondary={`${w.token.replace(":", " · ")}${w.mode ? ` · ${w.mode === "light" ? "claro" : "escuro"}` : ""}`} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      ))}
    </Drawer>
  );
}
