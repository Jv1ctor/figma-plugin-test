import { clampChroma, parse, type Color, rgb as toRgb, oklch as toOklch, toGamut } from "culori";

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Colors this close to the sRGB edge are simply clipped and not reported: the
// difference is invisible, and it covers float noise plus 3-decimal oklch rounding
// (so a snapshot read back from Figma re-applies cleanly).
const GAMUT_EPS = 0.002;
const isSrgb = (c: Color) => {
  const { r, g, b } = toRgb(c);
  return [r, g, b].every((v) => v >= -GAMUT_EPS && v <= 1 + GAMUT_EPS);
};
// CSS Color 4 gamut mapping (chroma reduction in OKLCH with a JND of 0.02).
const mapToSrgb = toGamut("rgb", "oklch");

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round = (n: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/**
 * Parse any CSS color (oklch() in practice) into Figma's 0–1 RGBA.
 * `clamped` is true when the color was outside sRGB and had to be gamut-mapped.
 */
export function cssToFigmaRgba(value: string): { color: RGBA; clamped: boolean } {
  const parsed = parse(value);
  if (!parsed) throw new Error(`cor inválida: "${value}"`);
  const clamped = !isSrgb(parsed);
  const mapped = toRgb(clamped ? mapToSrgb(parsed) : parsed);
  return {
    color: {
      r: round(clamp01(mapped.r), 6),
      g: round(clamp01(mapped.g), 6),
      b: round(clamp01(mapped.b), 6),
      a: round(clamp01(mapped.alpha ?? 1), 4),
    },
    clamped,
  };
}

/** Figma 0–1 RGBA → shadcn-style `oklch(L C H)` / `oklch(L C H / a%)` string. */
export function figmaRgbaToOklch(c: { r: number; g: number; b: number; a?: number }): string {
  const o = toOklch({ mode: "rgb", r: c.r, g: c.g, b: c.b, alpha: c.a ?? 1 });
  // 4 decimals: at the sRGB edge, 3-decimal chroma rounding can move a 0 channel by ~2/255.
  const l = round(o.l, 4);
  const ch = round(o.c, 4);
  // Achromatic colors have no meaningful hue; shadcn writes them as `L 0 0`.
  const h = ch < 0.0005 || o.h === undefined ? 0 : round(o.h, 3);
  const a = o.alpha ?? 1;
  const alpha = a < 0.9995 ? ` / ${round(a * 100, 1)}%` : "";
  return `oklch(${l} ${ch < 0.0005 ? 0 : ch} ${h}${alpha})`;
}

/** Any CSS color → oklch() string (used for custom picker input). */
export function cssToOklch(value: string): string {
  const parsed = parse(value);
  if (!parsed) throw new Error(`cor inválida: "${value}"`);
  const c = toRgb(parsed);
  return figmaRgbaToOklch({ r: c.r, g: c.g, b: c.b, a: c.alpha });
}

/** Any CSS color → #rrggbb (for <input type="color">), gamut-clamped. */
export function cssToHex(value: string): string {
  const parsed = parse(value);
  if (!parsed) return "#000000";
  return hex(toRgb(clampChroma(parsed, "oklch")));
}

function hex(c: { r: number; g: number; b: number }) {
  const h = (n: number) => Math.round(clamp01(n) * 255).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

/** OKLCH lightness of a CSS color (0–1). */
export function lightnessOf(value: string): number {
  const parsed = parse(value);
  return parsed ? toOklch(parsed).l : 0;
}
