import { baseGroupOf } from "./groups.ts";
import type { AliasToken, AliasValue, BaseToken, Layer, TokenSet } from "./types.ts";

const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin", 200: "Extra Light", 300: "Light", 400: "Regular", 500: "Medium",
  600: "Semi Bold", 700: "Bold", 800: "Extra Bold", 900: "Black",
};

/** Número no formato pt-BR (vírgula decimal). */
function fmt(n: number): string {
  return String(n).replace(".", ",");
}

function weightLabel(n: number): string {
  const name = WEIGHT_NAMES[n];
  return name ? `${n} · ${name}` : String(n);
}

/** Texto do valor de um token da base; `compact` é a variante curta usada dentro de "(…)" em shadow. */
function baseDetail(t: BaseToken, compact = false): string {
  const group = baseGroupOf(t.name);
  if (t.type === "color") return String(t.value).toUpperCase();
  if (t.type === "fontFamily") return String(t.value);
  const n = Number(t.value);
  if (t.type === "fontWeight") return weightLabel(n);
  if (group === "opacity") return `${fmt(n)}%`;
  if (group === "border-width" || compact || t.name.endsWith("/full")) return `${fmt(n)} px`;
  if (n === 0) return "0";
  return `${fmt(n)} px · ${fmt(n / 16)} rem`;
}

function aliasRef(set: TokenSet, token: AliasToken, v: AliasValue): string {
  if (typeof v !== "string") {
    const op = set.base[v.opacity];
    return `${v.color} a ${v.opacity}${op ? ` (${baseDetail(op)})` : ""}`;
  }
  if (token.type === "color" || token.type === "fontFamily") return v;
  const base = set.base[v];
  if (!base) return v;
  const shadow = token.name.startsWith("shadow/");
  return `${v} (${baseDetail(base, shadow)})`;
}

/** Texto após "Valor:" — reproduz as linhas do Figma, que é a fonte da verdade. */
export function valueLine(set: TokenSet, layer: Layer, name: string): string {
  if (layer === "base") {
    const t = set.base[name];
    return t ? baseDetail(t) : "";
  }
  const token = set[layer][name];
  if (!token) return "";
  const { light, dark } = token.values;
  const a = aliasRef(set, token, light);
  if (token.type !== "color") return a;
  const b = aliasRef(set, token, dark);
  return typeof light !== "string" && a === b ? a : `${a} | ${b}`;
}

/** Troca a linha "Valor:" da descrição ou acrescenta uma. */
export function withValueLine(description: string, line: string): string {
  const entry = `Valor: ${line}`;
  const lines = description.split("\n");
  const i = lines.findIndex((l) => l.startsWith("Valor:"));
  if (i >= 0) {
    lines[i] = entry;
    return lines.join("\n");
  }
  return description === "" ? entry : `${description}\n${entry}`;
}
