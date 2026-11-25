import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { contrastRatio, formatRatio, isDisabled, parsePar, resolve, tokenKey, valueLine } from "@token-bridge/tokens";
import type { AliasToken, Mode, Resolved, TokenSet } from "@token-bridge/tokens";
import { store, useEditor } from "../state/store.ts";
import { RefPicker } from "./RefPicker.tsx";
import { WarningBadge } from "./WarningBadge.tsx";

const GROUPS = ["text", "icon", "background", "border", "space", "radius", "border-width", "opacity", "typography", "shadow", "data"] as const;
type Group = (typeof GROUPS)[number];
const HIGHLIGHT_MS = 2000;
const WARN_COLOR = "var(--vx-text-warning)";

const groupOf = (name: string): Group | undefined => GROUPS.find((g) => g === name.split("/")[0]);

// --- contraste (spec §6) ---------------------------------------------------------------------------------

interface ContrastSpec { partners: string[]; min: number }

function contrastSpec(set: TokenSet, token: AliasToken): ContrastSpec | undefined {
  const { name } = token;
  const exists = (n: string) => n in set.semantic && !isDisabled(set, "semantic", n);
  if (name.startsWith("text/") || name.startsWith("icon/")) {
    const partners = parsePar(token.description, exists).filter((n) => n.startsWith("background/"));
    return { partners, min: name.startsWith("text/") ? 4.5 : 3 };
  }
  if (name === "border/strong" || name === "border/selected") return { partners: ["background/canvas", "background/surface"], min: 3 };
  if (name === "border/focus") return { partners: ["background/canvas", "background/surface", "background/surface-raised"], min: 3 };
  if (name.startsWith("data/categorical-")) return { partners: ["background/canvas", "background/surface"], min: 3 };
  return undefined;
}

function asHex(r: Resolved): string | undefined {
  if (r.kind !== "color") return undefined;
  return r.alpha < 1 ? `${r.hex}${Math.round(r.alpha * 255).toString(16).padStart(2, "0")}` : r.hex;
}

const fmtRatio = (n: number) => formatRatio(n).replace(":1", "");

function ratio(set: TokenSet, fg: string, bg: string, mode: Mode): number | undefined {
  const f = asHex(resolve(set, "semantic", fg, mode));
  const b = asHex(resolve(set, "semantic", bg, mode));
  return f && b ? contrastRatio(f, b) : undefined;
}

function ContrastCell({ set, token }: { set: TokenSet; token: AliasToken }) {
  const spec = contrastSpec(set, token);
  if (!spec || spec.partners.length === 0) return <Typography variant="caption" color="text.secondary">—</Typography>;
  const lines = spec.partners.map((p) => ({ p, light: ratio(set, token.name, p, "light"), dark: ratio(set, token.name, p, "dark") }));
  const low = (v: number | undefined) => v !== undefined && v < spec.min;
  const anyLow = lines.some((l) => low(l.light) || low(l.dark));
  const cell = (v: number | undefined) => (
    <Box component="span" sx={low(v) ? { color: WARN_COLOR, fontWeight: 600 } : undefined}>{v === undefined ? "—" : fmtRatio(v)}</Box>
  );
  return (
    <Box sx={{ display: "grid", gap: "2px" }}>
      {anyLow && <Box component="span" sx={{ color: WARN_COLOR, fontWeight: 600 }}>{`⚠ abaixo de ${formatRatio(spec.min)}`}</Box>}
      {lines.map((l) => (
        <Typography key={l.p} variant="caption" component="div">
          {l.p.replace("background/", "")}: claro {cell(l.light)} · escuro {cell(l.dark)}
        </Typography>
      ))}
    </Box>
  );
}

// --- descrição ------------------------------------------------------------------------------------------

const LABELS = ["Uso", "Não usar", "Par", "Flexibilidade", "Situação", "Valor"] as const;

function Description({ set, token }: { set: TokenSet; token: AliasToken }) {
  const lines = new Map(token.description.split("\n").map((l) => {
    const i = l.indexOf(":");
    return [l.slice(0, i), l.slice(i + 1).trim()] as const;
  }));
  lines.set("Valor", valueLine(set, "semantic", token.name));
  return (
    <Box component="dl" sx={{ m: 0, mt: "var(--vx-space-small)", display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: "var(--vx-space-small)", rowGap: "2px" }}>
      {LABELS.filter((l) => lines.has(l)).map((l) => (
        <Box key={l} sx={{ display: "contents" }}>
          <Typography component="dt" variant="caption" sx={{ fontWeight: 600 }}>{l}</Typography>
          <Typography component="dd" variant="caption" sx={{ m: 0 }}>{lines.get(l)}</Typography>
        </Box>
      ))}
    </Box>
  );
}

// --- linhas e seções --------------------------------------------------------------------------------------

function TokenRow({ token, highlighted }: { token: AliasToken; highlighted: boolean }) {
  const set = useEditor((s) => s.set);
  const warnings = useEditor((s) => s.warnings).filter((w) => w.token === tokenKey("semantic", token.name));
  const [open, setOpen] = useState(false);
  const composite = typeof token.values.light !== "string";
  return (
    <TableRow
      aria-label={token.name} data-token={token.name} data-highlighted={highlighted ? "true" : undefined}
      sx={highlighted ? { outline: "2px solid var(--vx-border-focus)", outlineOffset: -2 } : undefined}
    >
      <TableCell sx={{ verticalAlign: "top" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "var(--vx-space-x-small)" }}>
          <Box
            component="button" type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
            sx={{ all: "unset", cursor: "pointer", fontSize: "0.8125rem", textDecoration: "underline dotted" }}
          >
            {token.name}
          </Box>
          <WarningBadge warnings={warnings} label={token.name} />
        </Box>
        {open && <Description set={set} token={token} />}
      </TableCell>
      {(["light", "dark"] as const).map((mode) => (
        <TableCell key={mode} sx={{ verticalAlign: "top" }}>
          <Box sx={{ display: "grid", gap: "var(--vx-space-x-small)" }}>
            <RefPicker layer="semantic" name={token.name} mode={mode} part={composite ? "color" : undefined} />
            {composite && <RefPicker layer="semantic" name={token.name} mode={mode} part="opacity" label={`${mode === "light" ? "claro" : "escuro"} opacidade`} />}
          </Box>
        </TableCell>
      ))}
      <TableCell sx={{ verticalAlign: "top" }}><ContrastCell set={set} token={token} /></TableCell>
    </TableRow>
  );
}

function Section({ title, tokens, highlight }: { title?: string; tokens: AliasToken[]; highlight?: string }) {
  const table = (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>token</TableCell><TableCell>claro</TableCell><TableCell>escuro</TableCell><TableCell>par / contraste</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>{tokens.map((t) => <TokenRow key={t.name} token={t} highlighted={t.name === highlight} />)}</TableBody>
    </Table>
  );
  if (!title) return table;
  return (
    <Box role="group" aria-label={title} sx={{ display: "grid", gap: "var(--vx-space-x-small)" }}>
      <Typography variant="subtitle2" component="h3">{title}</Typography>
      {table}
    </Box>
  );
}

/** typography: um estilo `papel/tamanho` por grupo (+ font-family do papel); shadow: um estilo por papel. */
function sectionsOf(group: Group, tokens: AliasToken[]): Array<{ title?: string; tokens: AliasToken[] }> {
  if (group === "typography") {
    const styles = [...new Set(tokens.filter((t) => t.name.split("/").length === 4).map((t) => t.name.split("/").slice(1, 3).join("/")))];
    return styles.map((style) => {
      const role = style.split("/")[0]!;
      return { title: style, tokens: tokens.filter((t) => t.name.startsWith(`typography/${style}/`) || t.name === `typography/${role}/font-family`) };
    });
  }
  if (group === "shadow") {
    const roles = [...new Set(tokens.map((t) => t.name.split("/")[1]!))];
    return roles.map((role) => ({ title: `shadow/${role}`, tokens: tokens.filter((t) => t.name.startsWith(`shadow/${role}/`)) }));
  }
  return [{ tokens }];
}

export function SemanticTab() {
  const set = useEditor((s) => s.set);
  const focusToken = useEditor((s) => s.focusToken);
  const [group, setGroup] = useState<Group>("text");
  const [highlight, setHighlight] = useState<string>();
  const rootRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => GROUPS.filter((g) => !(g === "data" && set.disabledGroups.includes("data"))), [set.disabledGroups]);
  const active = visible.includes(group) ? group : visible[0]!;
  const tokens = useMemo(
    () => Object.values(set.semantic).filter((t) => groupOf(t.name) === active && !isDisabled(set, "semantic", t.name)),
    [set, active],
  );
  const sections = useMemo(() => sectionsOf(active, tokens), [active, tokens]);

  useEffect(() => {
    const prefix = tokenKey("semantic", "");
    if (!focusToken?.startsWith(prefix)) return;
    const name = focusToken.slice(prefix.length);
    const g = groupOf(name);
    if (g) setGroup(g);
    setHighlight(name);
    store.update((s) => ({ ...s, focusToken: undefined }));
  }, [focusToken]);

  useEffect(() => {
    if (!highlight) return;
    const row = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-token]") ?? []).find((r) => r.dataset.token === highlight);
    row?.scrollIntoView?.({ block: "center" });
    const t = setTimeout(() => setHighlight(undefined), HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [highlight, active]);

  return (
    <Box ref={rootRef} sx={{ display: "grid", gap: "var(--vx-space-small)", p: "var(--vx-space-medium)", maxHeight: "40vh", overflowY: "auto" }}>
      <Tabs value={active} onChange={(_, v: Group) => setGroup(v)} aria-label="Grupos semantic" variant="scrollable" scrollButtons="auto">
        {visible.map((g) => <Tab key={g} value={g} label={g} />)}
      </Tabs>
      {sections.map((s) => <Section key={s.title ?? active} title={s.title} tokens={s.tokens} highlight={highlight} />)}
    </Box>
  );
}
