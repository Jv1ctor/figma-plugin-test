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

const fmt = (n: number) => `${n.toFixed(1)}:1`;

function colorOf(set: TokenSet, name: string, mode: Mode): string | undefined {
  const r = resolve(set, "semantic", name, mode);
  return r.kind === "color" ? toHex8(r) : undefined;
}

function check(
  set: TokenSet, out: Warning[], rule: RuleId, token: string, partners: string[], min: number, what: string,
): void {
  if (!set.semantic[token] || isDisabled(set, "semantic", token)) return;
  const key = tokenKey("semantic", token);
  for (const mode of MODES) {
    const fg = colorOf(set, token, mode);
    if (!fg) continue;
    for (const against of partners) {
      if (!set.semantic[against] || isDisabled(set, "semantic", against)) continue;
      const bg = colorOf(set, against, mode);
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

function backgroundPartners(set: TokenSet, name: string): string[] {
  const known = (n: string) => n in set.semantic;
  return parsePar(set.semantic[name]?.description ?? "", known).filter((n) => n.startsWith("background/"));
}

export function contrastWarnings(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  for (const name of Object.keys(set.semantic)) {
    if (name.startsWith("text/")) {
      check(set, out, "contrast-text", name, backgroundPartners(set, name), 4.5, "texto");
    } else if (name.startsWith("icon/")) {
      let partners = backgroundPartners(set, name);
      if (partners.length === 0) partners = backgroundPartners(set, "text/" + name.slice(5));
      check(set, out, "contrast-icon", name, partners, 3, "ícone");
    } else if (name === "border/strong" || name === "border/selected") {
      check(set, out, "contrast-control", name, BG_CANVAS_SURFACES, 3, "contorno de controle");
    } else if (name === "border/focus") {
      check(set, out, "contrast-focus", name, BG_ALL_SURFACES, 3, "indicador de foco");
    } else if (name.startsWith("data/categorical-")) {
      check(set, out, "contrast-data", name, BG_CANVAS_SURFACES, 3, "série de dados");
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
