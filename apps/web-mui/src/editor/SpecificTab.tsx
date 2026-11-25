import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { EditError, checkSpecificName, tokenKey, upsertSpecific, valueLine } from "@token-bridge/tokens";
import type { AliasToken, AliasValue, TokenSet, TokenType } from "@token-bridge/tokens";
import { store, useEditor } from "../state/store.ts";
import { RefSelect, baseOptions } from "./RefPicker.tsx";
import { WarningBadge } from "./WarningBadge.tsx";

const PROPERTIES = ["text", "icon", "background", "border", "space", "radius", "border-width", "opacity", "data", "typography", "shadow"] as const;
const HIGHLIGHT_MS = 2000;

const SCOPES: Record<string, string[]> = {
  text: ["TEXT_FILL"],
  icon: ["SHAPE_FILL", "STROKE_COLOR"],
  background: ["FRAME_FILL", "SHAPE_FILL"],
  border: ["STROKE_COLOR"],
  data: ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR"],
  space: ["GAP"],
  radius: ["CORNER_RADIUS"],
  "border-width": ["STROKE_FLOAT"],
  opacity: ["OPACITY"],
};
const FIELD_SCOPES: Record<string, string> = {
  "font-size": "FONT_SIZE", "line-height": "LINE_HEIGHT", "font-weight": "FONT_WEIGHT", "letter-spacing": "LETTER_SPACING", "font-family": "FONT_FAMILY",
};

const lastPart = (name: string) => name.split("/").pop() ?? "";
const isShadowColor = (property: string, name: string) => property === "shadow" && lastPart(name) === "color";

/** Escopos (spec §5.3) e tipo a partir da propriedade; typography e shadow variam pelo campo final do nome. */
function scopesAndType(property: string, name: string): { scopes: string[]; type: TokenType } {
  if (property === "typography") {
    const field = lastPart(name);
    const type: TokenType = field === "font-family" ? "fontFamily" : field === "font-weight" ? "fontWeight" : field === "letter-spacing" ? "number" : "dimension";
    return { scopes: [FIELD_SCOPES[field] ?? "FONT_SIZE"], type };
  }
  if (property === "shadow") return isShadowColor(property, name) ? { scopes: ["EFFECT_COLOR"], type: "color" } : { scopes: ["EFFECT_FLOAT"], type: "dimension" };
  const type: TokenType = ["space", "radius", "border-width"].includes(property) ? "dimension" : property === "opacity" ? "number" : "color";
  return { scopes: SCOPES[property] ?? [], type };
}

/** Nome-modelo para listar as refs aceitas: typography/shadow dependem do campo final digitado. */
const optionsName = (property: string, name: string) => (property === "typography" || property === "shadow" ? name : `${property}/x`);

function preferred(options: string[], wanted: string): string {
  return options.includes(wanted) ? wanted : (options[0] ?? "");
}

const field = { size: "small", fullWidth: true } as const;

export function SpecificTab() {
  const set = useEditor((s) => s.set);
  const warnings = useEditor((s) => s.warnings);
  const focusToken = useEditor((s) => s.focusToken);
  const [name, setName] = useState("");
  const [refs, setRefs] = useState<{ light?: string; dark?: string; lightOpacity?: string; darkOpacity?: string }>({});
  const [uso, setUso] = useState("");
  const [naoUsar, setNaoUsar] = useState("");
  const [par, setPar] = useState("");
  const [error, setError] = useState<string>();
  const [highlight, setHighlight] = useState<string>();
  const rootRef = useRef<HTMLDivElement>(null);

  const headOfName = name.split("/")[0] ?? "";
  // O primeiro nível do nome decide a propriedade; o select só serve para começar um nome vazio ou inválido.
  const property = (PROPERTIES as readonly string[]).includes(headOfName) ? headOfName : "";
  const composite = isShadowColor(property, name);
  const colorOptions = useMemo(
    () => (property ? baseOptions(set, "specific", optionsName(property, name), composite ? "color" : undefined) : []),
    [set, property, name, composite],
  );
  const opacityOptions = useMemo(() => (composite ? baseOptions(set, "specific", name, "opacity") : []), [set, name, composite]);
  const { scopes, type } = scopesAndType(property, name);

  const ref = (mode: "light" | "dark", opacity = false): string => {
    const key = `${mode}${opacity ? "Opacity" : ""}` as keyof typeof refs;
    if (refs[key] !== undefined) return refs[key]!;
    return opacity ? preferred(opacityOptions, "opacity/10") : preferred(colorOptions, type === "color" ? (mode === "light" ? "neutral/900" : "neutral/50") : "");
  };
  const value = (mode: "light" | "dark"): AliasValue => (composite ? { color: ref(mode), opacity: ref(mode, true) } : ref(mode));

  const draft: AliasToken = {
    name, type, scopes, flex: "free",
    values: { light: value("light"), dark: value("dark") },
    description: [
      `Uso: ${uso.trim()}`, `Não usar: ${naoUsar.trim()}`, `Par: ${par.trim()}`,
      "Flexibilidade: Livre", "Situação: Proposto",
    ].join("\n"),
  };

  const nameWarnings = name === "" ? [] : checkSpecificName(name, set.semantic);
  // Colisão com semantic também começa com "Formato:", mas vira EditError ao criar; os demais erros duros bloqueiam o botão.
  const hardErrors = nameWarnings.filter((w) => w.message.startsWith("Formato:") && !w.id.endsWith(":semantic"));
  const incomplete = name === "" || property === "" || colorOptions.length === 0 || (composite && opacityOptions.length === 0);
  const preview = useMemo(() => {
    if (incomplete) return "";
    const probe: TokenSet = { ...set, specific: { ...set.specific, [name]: draft } };
    return valueLine(probe, "specific", name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, name, property, refs, composite, colorOptions, opacityOptions]);

  const create = () => {
    const current = store.get().set;
    if (name in current.semantic || name in current.specific) {
      setError(`O nome ${name} já existe (${name in current.semantic ? "semantic" : "specific"}).`);
      return;
    }
    try {
      const next = upsertSpecific(current, draft);
      store.update((s) => ({ ...s, set: next }));
      setError(undefined);
      setName(""); setRefs({}); setUso(""); setNaoUsar(""); setPar("");
    } catch (e) {
      if (e instanceof EditError) setError(e.message);
      else throw e;
    }
  };

  useEffect(() => {
    const prefix = tokenKey("specific", "");
    if (!focusToken?.startsWith(prefix)) return;
    setHighlight(focusToken.slice(prefix.length));
    store.update((s) => ({ ...s, focusToken: undefined }));
  }, [focusToken]);
  useEffect(() => {
    if (!highlight) return;
    Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-token]") ?? []).find((r) => r.dataset.token === highlight)?.scrollIntoView?.({ block: "center" });
    const t = setTimeout(() => setHighlight(undefined), HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [highlight]);

  const specifics = Object.values(set.specific);

  return (
    <Box ref={rootRef} sx={{ display: "grid", gap: "var(--vx-space-medium)", p: "var(--vx-space-medium)", maxHeight: "40vh", overflowY: "auto", gridTemplateColumns: { md: "minmax(0, 3fr) minmax(0, 2fr)" }, alignItems: "start" }}>
      <Box component="form" aria-label="Novo specific" onSubmit={(e) => { e.preventDefault(); create(); }} sx={{ display: "grid", gap: "var(--vx-space-small)" }}>
        {error && <Alert severity="error" role="alert" onClose={() => setError(undefined)}>{error}</Alert>}
        <Box sx={{ display: "grid", gap: "var(--vx-space-small)", gridTemplateColumns: "1fr 1fr" }}>
          <TextField {...field} label="Nome" value={name} onChange={(e) => { setName(e.target.value); setError(undefined); }} />
          <TextField
            {...field} select label="Propriedade" slotProps={{ select: { MenuProps: { "data-editor-portal": "" } as object } }} value={property} disabled={property !== ""}
            helperText={property !== "" ? "Definida pelo nome" : undefined}
            onChange={(e) => { setName(`${e.target.value}/${name.includes("/") ? name.slice(name.indexOf("/") + 1) : ""}`); setRefs({}); setError(undefined); }}
          >
            {PROPERTIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
        </Box>
        {nameWarnings.length > 0 && (
          <Box component="ul" sx={{ m: 0, pl: "var(--vx-space-large)", color: "var(--vx-text-warning)", fontSize: "0.75rem" }}>
            {nameWarnings.map((w) => <li key={w.id}>{w.message}</li>)}
          </Box>
        )}
        <Box sx={{ display: "flex", gap: "var(--vx-space-medium)", flexWrap: "wrap" }}>
          {(["light", "dark"] as const).map((mode) => (
            <Box key={mode} sx={{ display: "grid", gap: "var(--vx-space-x-small)" }}>
              <RefSelect
                set={set} value={ref(mode)} options={colorOptions} label={mode === "light" ? "claro" : "escuro"}
                onChange={(r) => setRefs((p) => ({ ...p, [mode]: r }))}
              />
              {composite && (
                <RefSelect
                  set={set} value={ref(mode, true)} options={opacityOptions} label={`${mode === "light" ? "claro" : "escuro"} opacidade`}
                  onChange={(r) => setRefs((p) => ({ ...p, [`${mode}Opacity`]: r }))}
                />
              )}
            </Box>
          ))}
        </Box>
        <TextField {...field} label="Uso" value={uso} onChange={(e) => setUso(e.target.value)} />
        <TextField {...field} label="Não usar" value={naoUsar} onChange={(e) => setNaoUsar(e.target.value)} />
        <TextField {...field} label="Par" value={par} onChange={(e) => setPar(e.target.value)} />
        <Typography variant="caption" color="text.secondary">
          Situação: Proposto · Flexibilidade: Livre · Tipo: {type} · Escopos: {scopes.join(", ") || "—"}
          {preview && ` · Valor: ${preview}`}
        </Typography>
        <Box><Button type="submit" variant="contained" size="small" disabled={hardErrors.length > 0 || incomplete}>Criar</Button></Box>
      </Box>
      <Box>
        <Typography variant="subtitle2" component="h3">Specifics ({specifics.length})</Typography>
        {specifics.length === 0 ? (
          <Typography variant="caption" color="text.secondary">Nenhum specific ainda.</Typography>
        ) : (
          <List dense disablePadding>
            {specifics.map((t) => (
              <ListItem
                key={t.name} aria-label={t.name} data-token={t.name} data-highlighted={t.name === highlight ? "true" : undefined}
                sx={t.name === highlight ? { outline: "2px solid var(--vx-border-focus)" } : undefined}
                secondaryAction={
                  <IconButton edge="end" size="small" aria-label={`Remover ${t.name}`} onClick={() => store.removeSpecific(t.name)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <Typography variant="body2" sx={{ pr: "var(--vx-space-x-large)" }}>
                  {t.name}
                  <Typography component="span" variant="caption" color="text.secondary"> · {valueLine(set, "specific", t.name)}</Typography>
                </Typography>
                <WarningBadge warnings={warnings.filter((w) => w.token === tokenKey("specific", t.name))} label={t.name} />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
