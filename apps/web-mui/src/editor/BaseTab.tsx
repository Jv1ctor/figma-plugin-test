import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningAmberIcon from "@mui/icons-material/WarningAmberRounded";
import { baseGroupOf, setBaseValue, setGroupEnabled } from "@token-bridge/tokens";
import type { OptionalGroup } from "@token-bridge/tokens";
import { FONT_CATALOG, ensureFontLoaded } from "../fonts.ts";
import { store, useEditor } from "../state/store.ts";
import { PaletteCard } from "./PaletteCard.tsx";

const BRAND_OPTIONAL: Array<{ palette: string; group: OptionalGroup }> = [
  { palette: "brand-2", group: "brand-2" },
  { palette: "brand-3", group: "brand-3" },
  { palette: "brand-4", group: "brand-4" },
];
const DATA = [1, 2, 3, 4, 5, 6].map((n) => `data-${n}`);
const LOCKED_PALETTES = ["danger", "warning", "success", "information"];
const LOCKED_SCALES = ["space", "radius", "border-width", "opacity", "font-size", "line-height", "font-weight", "letter-spacing"];

const row = { display: "flex", gap: "var(--vx-space-medium)", alignItems: "flex-start", overflowX: "auto", pb: "var(--vx-space-small)" } as const;

function FontSelect({ token, label }: { token: "font-family/primary" | "font-family/secondary"; label: string }) {
  const value = String(useEditor((s) => s.set.base[token]?.value ?? ""));
  const all = useEditor((s) => s.warnings);
  const warnings = all.filter((w) => w.token === `base:${token}`);
  const id = `font-${token.split("/")[1]}`;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "var(--vx-space-small)" }}>
      <TextField
        select size="small" id={id} label={label} value={value} sx={{ minWidth: 200 }}
        onChange={(e) => {
          ensureFontLoaded(e.target.value);
          store.update((s) => ({ ...s, set: setBaseValue(s.set, token, e.target.value) }));
        }}
      >
        {!FONT_CATALOG.some((f) => f.family === value) && <MenuItem value={value}>{value}</MenuItem>}
        {FONT_CATALOG.map((f) => <MenuItem key={f.family} value={f.family}>{f.family}</MenuItem>)}
      </TextField>
      {warnings.length > 0 && (
        <Tooltip title={<Box>{warnings.map((w) => <div key={w.id}>{w.message}</div>)}</Box>}>
          <WarningAmberIcon fontSize="small" color="warning" aria-label={`${warnings.length} aviso em ${label}`} />
        </Tooltip>
      )}
    </Box>
  );
}

export function BaseTab() {
  const set = useEditor((s) => s.set);
  const [blocked, setBlocked] = useState<{ group: OptionalGroup; by: string[] }>();

  const isOn = (g: OptionalGroup) => !set.disabledGroups.includes(g);
  const toggle = (group: OptionalGroup, enabled: boolean) => {
    const result = setGroupEnabled(store.get().set, group, enabled, store.get().seed);
    if (result.ok) {
      setBlocked(undefined);
      store.update((s) => ({ ...s, set: result.set }));
    } else {
      setBlocked({ group, by: result.blockedBy });
    }
  };
  const readOnly = (names: string[]) =>
    names.map((p) => {
      const sample = Object.values(set.base).find((t) => baseGroupOf(t.name) === p);
      const color = sample?.type === "color";
      const values = Object.values(set.base).filter((t) => baseGroupOf(t.name) === p);
      return (
        <Box key={p} sx={{ display: "flex", alignItems: "center", gap: "var(--vx-space-small)", flexWrap: "wrap" }}>
          <Typography variant="body2" sx={{ minWidth: 110 }}>{p}</Typography>
          {values.map((t) => (
            <Chip
              key={t.name} size="small" variant="outlined" label={`${t.name.split("/")[1]}: ${t.value}`}
              avatar={color ? <Box component="span" style={{ backgroundColor: String(t.value) }} sx={{ borderRadius: "50%" }} /> : undefined}
            />
          ))}
        </Box>
      );
    });

  return (
    <Box sx={{ display: "grid", gap: "var(--vx-space-medium)", p: "var(--vx-space-medium)", maxHeight: "40vh", overflowY: "auto" }}>
      {blocked && (
        <Alert severity="warning" onClose={() => setBlocked(undefined)}>
          Não dá para desligar {blocked.group}: ainda é usado por {blocked.by.join(", ")}.
        </Alert>
      )}
      <Box sx={row}>
        <PaletteCard palette="brand-1" />
        {BRAND_OPTIONAL.map(({ palette, group }) => (
          <PaletteCard key={palette} palette={palette} group={group} disabled={!isOn(group)} onToggle={toggle} />
        ))}
        <PaletteCard palette="neutral" />
      </Box>
      <Box sx={{ display: "grid", gap: "var(--vx-space-small)" }}>
        <FormControlLabel
          control={
            <Switch
              size="small" checked={isOn("data")} onChange={(_, on) => toggle("data", on)}
              slotProps={{ input: { "aria-label": "Ativar Gráficos (data-1…6)" } }}
            />
          }
          label="Gráficos (data-1…6)"
        />
        <Box sx={row}>
          {DATA.map((p) => <PaletteCard key={p} palette={p} disabled={!isOn("data")} />)}
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: "var(--vx-space-medium)", flexWrap: "wrap" }}>
        <FontSelect token="font-family/primary" label="Fonte primária" />
        <FontSelect token="font-family/secondary" label="Fonte secundária" />
      </Box>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Travado (somente leitura)</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ display: "grid", gap: "var(--vx-space-small)" }}>
          {readOnly([...LOCKED_PALETTES, ...LOCKED_SCALES])}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
