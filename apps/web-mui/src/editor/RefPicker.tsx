import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { allowedBaseGroups, baseGroupOf, isDisabled, setRef } from "@token-bridge/tokens";
import type { AliasValue, Mode, TokenSet } from "@token-bridge/tokens";
import { store, useEditor } from "../state/store.ts";

export type RefPart = "color" | "opacity";

const MODE_LABEL: Record<Mode, string> = { light: "claro", dark: "escuro" };

/** Refs da base aceitas pelo token (grupos permitidos, sem os desligados). `part` separa cor e opacidade do composto. */
export function baseOptions(set: TokenSet, layer: "semantic" | "specific", name: string, part?: RefPart): string[] {
  const groups = allowedBaseGroups(layer, name).filter((g) => (part === "opacity" ? g === "opacity" : part === "color" ? g !== "opacity" : true));
  return Object.keys(set.base).filter((n) => groups.includes(baseGroupOf(n)) && !isDisabled(set, "base", n));
}

export function currentRef(value: AliasValue | undefined, part?: RefPart): string {
  if (value === undefined) return "";
  return typeof value === "string" ? value : value[part ?? "color"];
}

function Sample({ set, name }: { set: TokenSet; name: string }) {
  const t = set.base[name];
  if (!t) return null;
  if (t.type === "color") {
    return (
      <Box
        component="span" aria-hidden style={{ backgroundColor: String(t.value) }}
        sx={{ width: 16, height: 16, flex: "none", borderRadius: "var(--vx-radius-small)", border: "1px solid var(--vx-border-subtle)" }}
      />
    );
  }
  return <Box component="span" aria-hidden sx={{ color: "var(--vx-text-secondary)", fontSize: "0.75rem" }}>{String(t.value)}</Box>;
}

export interface RefSelectProps {
  set: TokenSet;
  value: string;
  options: string[];
  label: string;
  onChange: (ref: string) => void;
}

/** Seletor controlado de ref da base, com amostra; `RefPicker` liga ele a um token existente. */
export function RefSelect({ set, value, options, label, onChange }: RefSelectProps) {
  const shown = value !== "" && !options.includes(value) ? [value, ...options] : options; // ref atual fora da lista segue visível
  const row = (n: string) => (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "var(--vx-space-small)" }}>
      <Sample set={set} name={n} />
      <span>{n}</span>
    </Box>
  );
  return (
    <Select
      size="small" value={value} displayEmpty
      inputProps={{ "aria-label": label }}
      renderValue={(v) => (v === "" ? "—" : row(String(v)))}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 150, fontSize: "0.8125rem" }}
      MenuProps={{ slotProps: { paper: { style: { maxHeight: 320 } } } }}
    >
      {shown.map((n) => <MenuItem key={n} value={n}>{row(n)}</MenuItem>)}
    </Select>
  );
}

export interface RefPickerProps {
  layer: "semantic" | "specific";
  name: string;
  mode: Mode;
  /** Cor composta (shadow, campo color): qual parte editar. */
  part?: RefPart;
  /** Sobrescreve o aria-label (padrão: "claro"/"escuro"). */
  label?: string;
}

export function RefPicker({ layer, name, mode, part, label }: RefPickerProps) {
  const set = useEditor((s) => s.set);
  return (
    <RefSelect
      set={set}
      value={currentRef(set[layer][name]?.values[mode], part)}
      options={baseOptions(set, layer, name, part)}
      label={label ?? MODE_LABEL[mode]}
      onChange={(ref) =>
        store.update((s) => {
          const cur = s.set[layer][name]?.values[mode];
          const next: AliasValue = part && cur && typeof cur !== "string" ? { ...cur, [part]: ref } : ref;
          return { ...s, set: setRef(s.set, layer, name, mode, next) };
        })}
    />
  );
}
