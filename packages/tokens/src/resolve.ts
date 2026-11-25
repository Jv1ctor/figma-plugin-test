import { isDisabled } from "./groups.ts";
import type { BaseToken, Layer, Mode, Resolved, TokenSet } from "./types.ts";
import { baseGroupOf } from "./groups.ts";

export function tokenKey(layer: Layer, name: string): string {
  return `${layer}:${name}`;
}

function parseHex(hex: string): { hex: string; alpha: number } {
  const body = hex.slice(0, 7).toLowerCase();
  const alpha = hex.length === 9 ? Math.round((parseInt(hex.slice(7, 9), 16) / 255) * 1000) / 1000 : 1;
  return { hex: body, alpha };
}

function lookupBase(set: TokenSet, name: string): BaseToken | undefined {
  const t = set.base[name];
  return t && !isDisabled(set, "base", name) ? t : undefined;
}

/** Opacidade na base é guardada em % (0–100); resolve em 0–1. */
function resolveBase(t: BaseToken): Resolved {
  if (t.type === "color") return { kind: "color", ...parseHex(String(t.value)) };
  if (t.type === "fontFamily") return { kind: "string", value: String(t.value) };
  const n = Number(t.value);
  return { kind: "number", value: baseGroupOf(t.name) === "opacity" ? n / 100 : n };
}

export function resolve(set: TokenSet, layer: Layer, name: string, mode: Mode): Resolved {
  if (layer === "base") {
    const t = lookupBase(set, name);
    return t ? resolveBase(t) : { kind: "missing", ref: name };
  }
  const token = set[layer][name];
  if (!token) return { kind: "missing", ref: name };
  const v = token.values[mode];
  if (typeof v === "string") {
    const t = lookupBase(set, v);
    return t ? resolveBase(t) : { kind: "missing", ref: v };
  }
  const color = lookupBase(set, v.color);
  if (!color) return { kind: "missing", ref: v.color };
  const opacity = lookupBase(set, v.opacity);
  if (!opacity) return { kind: "missing", ref: v.opacity };
  const c = resolveBase(color);
  const o = resolveBase(opacity);
  if (c.kind !== "color" || o.kind !== "number") return { kind: "missing", ref: v.color };
  return { kind: "color", hex: c.hex, alpha: Math.round(c.alpha * o.value * 1000) / 1000 };
}
