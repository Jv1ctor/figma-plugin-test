import { baseGroupOf, isDisabled } from "../groups.ts";
import type { AliasToken, BaseToken, Layer, TokenSet } from "../types.ts";

export const MODE_ATTR = "data-mode";

/** ("base","radius/full") → "--vx-base-radius-full"; semantic/specific não levam prefixo de camada. */
export function cssVarName(layer: Layer, name: string): string {
  const slug = name.replace(/\//g, "-");
  return layer === "base" ? `--vx-base-${slug}` : `--vx-${slug}`;
}

export interface CssVarMap {
  root: Record<string, string>;
  light: Record<string, string>;
  dark: Record<string, string>;
}

const rem = (px: number): string => `${px / 16}rem`;

function baseValue(t: BaseToken): string {
  const group = baseGroupOf(t.name);
  if (t.type === "color") return String(t.value);
  if (t.type === "fontFamily") return `"${t.value}", system-ui, sans-serif`;
  const n = Number(t.value);
  if (group === "opacity") return String(n / 100);
  if (group === "border-width") return `${n}px`;
  if (t.type === "dimension" || group === "letter-spacing") return rem(n);
  return String(n); // font-weight etc.: sem unidade
}

function aliasValue(set: TokenSet, token: AliasToken, mode: "light" | "dark"): string {
  const v = token.values[mode];
  if (typeof v === "string") {
    return set.base[v] && !isDisabled(set, "base", v) ? `var(${cssVarName("base", v)})` : "initial";
  }
  for (const ref of [v.color, v.opacity]) {
    if (!set.base[ref] || isDisabled(set, "base", ref)) return "initial";
  }
  return `rgb(from var(${cssVarName("base", v.color)}) r g b / var(${cssVarName("base", v.opacity)}))`;
}

export function cssVarMap(set: TokenSet): CssVarMap {
  const map: CssVarMap = { root: {}, light: {}, dark: {} };
  for (const [name, t] of Object.entries(set.base)) {
    if (isDisabled(set, "base", name)) continue;
    map.root[cssVarName("base", name)] = baseValue(t);
  }
  for (const layer of ["semantic", "specific"] as const) {
    for (const [name, token] of Object.entries(set[layer])) {
      if (isDisabled(set, layer, name)) continue;
      map.light[cssVarName(layer, name)] = aliasValue(set, token, "light");
      map.dark[cssVarName(layer, name)] = aliasValue(set, token, "dark");
    }
  }
  for (const s of set.shadowStyles) {
    const parts = [s.offsetX, s.offsetY, s.blur, s.spread, s.color].map((n) => `var(${cssVarName("semantic", n)})`);
    const value = parts.join(" ");
    map.light[cssVarName("semantic", s.name)] = value;
    map.dark[cssVarName("semantic", s.name)] = value;
  }
  return map;
}

function block(selector: string, vars: Record<string, string>): string {
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

export function toCss(set: TokenSet): string {
  const m = cssVarMap(set);
  return [
    "/* Vortex: variáveis CSS geradas pelo Token Bridge. Não edite à mão. */",
    block(":root", m.root),
    block(`:root, [${MODE_ATTR}="light"]`, m.light),
    block(`[${MODE_ATTR}="dark"]`, m.dark),
  ].join("\n\n") + "\n";
}
