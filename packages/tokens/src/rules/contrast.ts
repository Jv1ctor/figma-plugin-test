import { contrastRatio } from "../color.ts";
import { isDisabled } from "../groups.ts";
import { resolve, tokenKey } from "../resolve.ts";
import type { Layer, Mode, TokenSet } from "../types.ts";
import { MODES } from "../types.ts";
import { parsePar } from "./par.ts";
import type { RuleId, Warning } from "./types.ts";

const BG_CANVAS_SURFACES = ["background/canvas", "background/surface"];
const BG_ALL_SURFACES = [...BG_CANVAS_SURFACES, "background/surface-raised"];

function toHex8(c: { hex: string; alpha: number }): string {
  if (c.alpha >= 1) return c.hex;
  return c.hex + Math.round(c.alpha * 255).toString(16).padStart(2, "0");
}

/** Razão de contraste para exibição: truncada em 1 casa (4,46 → "4,4:1"), vírgula decimal. */
export function formatRatio(n: number): string {
  return `${(Math.floor(n * 10 + 1e-9) / 10).toFixed(1).replace(".", ",")}:1`;
}
const fmt = formatRatio;

function colorOf(set: TokenSet, layer: Layer, name: string, mode: Mode): string | undefined {
  const r = resolve(set, layer, name, mode);
  return r.kind === "color" ? toHex8(r) : undefined;
}

function check(
  set: TokenSet, out: Warning[], rule: RuleId, layer: Layer, token: string, partners: string[], min: number, what: string,
): void {
  if (!set[layer][token] || isDisabled(set, layer, token)) return;
  const key = tokenKey(layer, token);
  for (const mode of MODES) {
    const fg = colorOf(set, layer, token, mode);
    if (!fg) continue;
    for (const against of partners) {
      if (!set.semantic[against] || isDisabled(set, "semantic", against)) continue;
      const bg = colorOf(set, "semantic", against, mode);
      if (!bg) continue;
      const ratio = contrastRatio(fg, bg);
      if (ratio >= min) continue;
      out.push({
        id: `${rule}:${key}:${mode}:${against}`, token: key, mode, rule, against,
        message: `Contraste ${fmt(ratio)} contra ${against} (mínimo ${fmt(min)}) — ${what}`,
        actual: fmt(ratio), expected: fmt(min),
      });
    }
  }
}

function backgroundPartners(set: TokenSet, layer: Layer, name: string): string[] {
  const known = (n: string) => n in set.semantic;
  return parsePar(set[layer][name]?.description ?? "", known).filter((n) => n.startsWith("background/"));
}

export function contrastWarnings(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  for (const layer of ["semantic", "specific"] as const) {
    for (const name of Object.keys(set[layer])) {
      const c = (rule: RuleId, partners: string[], min: number, what: string) => check(set, out, rule, layer, name, partners, min, what);
      if (name.startsWith("text/")) {
        c("contrast-text", backgroundPartners(set, layer, name), 4.5, "texto");
      } else if (name.startsWith("icon/")) {
        let partners = backgroundPartners(set, layer, name);
        if (partners.length === 0) partners = backgroundPartners(set, layer, "text/" + name.slice(5));
        c("contrast-icon", partners, 3, "ícone");
      } else if (name === "border/strong" || name === "border/selected") {
        c("contrast-control", BG_CANVAS_SURFACES, 3, "contorno de controle");
      } else if (name === "border/focus") {
        c("contrast-focus", BG_ALL_SURFACES, 3, "indicador de foco");
      } else if (name.startsWith("data/categorical-")) {
        c("contrast-data", BG_CANVAS_SURFACES, 3, "série de dados");
      }
    }
  }
  return out;
}

export function brokenRefWarnings(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  for (const layer of ["semantic", "specific"] as Layer[]) {
    for (const name of Object.keys(set[layer])) {
      if (isDisabled(set, layer, name)) continue;
      const key = tokenKey(layer, name);
      for (const mode of MODES) {
        const r = resolve(set, layer, name, mode);
        if (r.kind !== "missing") continue;
        out.push({
          id: `broken-ref:${key}:${mode}:`, token: key, mode, rule: "broken-ref",
          message: `Referência quebrada: "${r.ref}" não existe na base (ou está desligada)`,
        });
      }
    }
  }
  return out;
}
