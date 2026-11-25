import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { EditError, InvalidColorError, SCALE_STEPS, applyScale, setBaseValue } from "@token-bridge/tokens";
import type { OptionalGroup, TokenSet } from "@token-bridge/tokens";
import { store, useEditor } from "../state/store.ts";
import { WarningBadge } from "./WarningBadge.tsx";

const HEX_ERROR = "Hex inválido. Use o formato #rrggbb.";
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

/** Aplica uma edição ao set; devolve a mensagem de erro (ou undefined) sem tocar no estado se falhar. */
function tryEdit(edit: (set: TokenSet) => TokenSet): string | undefined {
  try {
    const next = edit(store.get().set);
    store.update((s) => ({ ...s, set: next }));
    return undefined;
  } catch (e) {
    if (e instanceof InvalidColorError || e instanceof EditError) return HEX_ERROR;
    throw e;
  }
}

function SwatchEditor({ token, anchor, onClose }: { token: string; anchor: HTMLElement; onClose: () => void }) {
  const current = String(useEditor((s) => s.set.base[token]?.value ?? "#000000"));
  const [hex, setHex] = useState(current);
  const [error, setError] = useState<string>();
  const apply = (value: string) => {
    const err = tryEdit((set) => setBaseValue(set, token, value));
    setError(err);
    if (!err) onClose();
  };
  return (
    <Popover data-editor-portal="" open anchorEl={anchor} onClose={onClose} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
      <Box sx={{ p: "var(--vx-space-medium)", display: "flex", gap: "var(--vx-space-small)", alignItems: "flex-start" }}>
        <input
          type="color"
          aria-label={`Seletor de cor do passo ${token}`}
          value={isHex(hex) ? hex.toLowerCase() : "#000000"}
          onChange={(e) => setHex(e.target.value)}
        />
        <TextField
          size="small"
          label={`Hex do passo ${token}`}
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          error={!!error}
          helperText={error}
          sx={{ width: 150 }}
        />
        <Button variant="contained" size="small" onClick={() => apply(hex)}>Aplicar</Button>
      </Box>
    </Popover>
  );
}

export interface PaletteCardProps {
  palette: string;
  /** Grupo opcional que liga/desliga esta paleta (brand-2..4). */
  group?: OptionalGroup;
  disabled?: boolean;
  onToggle?: (group: OptionalGroup, enabled: boolean) => void;
}

export function PaletteCard({ palette, group, disabled = false, onToggle }: PaletteCardProps) {
  const set = useEditor((s) => s.set);
  const warnings = useEditor((s) => s.warnings);
  const source = String(set.base[`${palette}/600`]?.value ?? set.base[`${palette}/500`]?.value ?? "#000000");
  const [hex, setHex] = useState(source);
  const [seenSource, setSeenSource] = useState(source);
  if (seenSource !== source) {
    // o set mudou por fora (reset, importação, reativação): o campo volta a acompanhá-lo
    setSeenSource(source);
    setHex(source);
  }
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<{ token: string; anchor: HTMLElement }>();

  const steps: Array<{ name: string; locked: boolean }> = [
    ...(palette === "neutral" ? [{ name: "neutral/0", locked: true }] : []),
    ...SCALE_STEPS.map((s) => ({ name: `${palette}/${s}`, locked: false })),
    ...(palette === "neutral" ? [{ name: "neutral/1000", locked: true }] : []),
  ].filter((s) => set.base[s.name]);

  const mine = warnings.filter((w) => w.token.startsWith(`base:${palette}/`));

  const generate = () => {
    const err = tryEdit((s) => applyScale(s, palette, hex));
    setError(err);
  };

  return (
    <Box
      component="section"
      aria-label={`Paleta ${palette}`}
      sx={{
        minWidth: 300, p: "var(--vx-space-medium)", display: "grid", gap: "var(--vx-space-small)",
        border: "var(--vx-border-width-default) solid var(--vx-border-subtle)", borderRadius: "var(--vx-radius-medium)",
        bgcolor: "var(--vx-background-surface)", opacity: disabled ? 0.5 : 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "var(--vx-space-small)" }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>{palette}</Typography>
        <WarningBadge warnings={mine} label={palette} />
        {group && (
          <Switch
            size="small"
            checked={!disabled}
            onChange={(_, on) => onToggle?.(group, on)}
            slotProps={{ input: { "aria-label": `Ativar ${palette}` } }}
          />
        )}
      </Box>
      <Box sx={{ display: "flex", gap: "2px", overflowX: "auto" }}>
        {steps.map(({ name, locked }) => {
          const color = String(set.base[name]!.value);
          const sx = { width: 24, height: 24, flex: "none", borderRadius: "var(--vx-radius-small)", border: "1px solid var(--vx-border-subtle)", p: 0 };
          return locked ? (
            <Tooltip key={name} slotProps={{ popper: { "data-editor-portal": "" } as object }} title={`${name} (somente leitura)`}>
              <Box component="span" aria-label={name} role="img" sx={sx} style={{ backgroundColor: color }} />
            </Tooltip>
          ) : (
            <Tooltip key={name} slotProps={{ popper: { "data-editor-portal": "" } as object }} title={`${name} ${color}`}>
              <Box
                component="button"
                type="button"
                aria-label={name}
                disabled={disabled}
                onClick={(e) => setEditing({ token: name, anchor: e.currentTarget })}
                style={{ backgroundColor: color }}
                sx={{ ...sx, cursor: disabled ? "default" : "pointer" }}
              />
            </Tooltip>
          );
        })}
      </Box>
      <Box sx={{ display: "flex", gap: "var(--vx-space-small)", alignItems: "flex-start" }}>
        <TextField
          size="small"
          label={`Hex de ${palette}`}
          value={hex}
          disabled={disabled}
          onChange={(e) => setHex(e.target.value)}
          error={!!error}
          helperText={error}
          sx={{ flex: 1 }}
        />
        <Button variant="outlined" size="small" disabled={disabled} onClick={generate} aria-label={`Gerar escala de ${palette}`} sx={{ mt: "2px", whiteSpace: "nowrap" }}>
          Gerar escala
        </Button>
      </Box>
      {editing && <SwatchEditor token={editing.token} anchor={editing.anchor} onClose={() => setEditing(undefined)} />}
    </Box>
  );
}
