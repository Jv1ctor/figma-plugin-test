import { differenceEuclidean, oklch as toOklch, parse, rgb as toRgb, toGamut, type Color } from "culori";

export class InvalidColorError extends Error {
  constructor(value: string) {
    super(`cor inválida: "${value}"`);
    this.name = "InvalidColorError";
  }
}

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
type ScaleStep = (typeof SCALE_STEPS)[number];

// Target OKLCH lightness per step, strictly decreasing (spec §13: exact values are free).
const SCALE_LIGHTNESS: Record<ScaleStep, number> = {
  50: 0.97, 100: 0.93, 200: 0.87, 300: 0.8, 400: 0.71, 500: 0.62,
  600: 0.53, 700: 0.45, 800: 0.37, 900: 0.29, 950: 0.21,
};
// Minimum L gap kept between neighbours so rounding to 8-bit hex stays strictly monotonic.
const MIN_GAP = 0.02;

const mapToSrgb = toGamut("rgb", "oklch");
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const oklabDistance = differenceEuclidean("oklab");

function parseColor(value: string): Color {
  // culori accepts hex without "#"; the model requires it.
  const parsed = typeof value === "string" && !/^[0-9a-f]{3,8}$/i.test(value) ? parse(value) : undefined;
  if (!parsed) throw new InvalidColorError(String(value));
  return parsed;
}

function toHex(c: Color): string {
  const { r, g, b } = toRgb(c);
  const h = (n: number) => Math.round(clamp01(n) * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function luminance(c: { r: number; g: number; b: number }): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(clamp01(c.r)) + 0.7152 * lin(clamp01(c.g)) + 0.0722 * lin(clamp01(c.b));
}

/** WCAG 2.x contrast ratio. An alpha fg is composited over bg; a translucent bg over white. */
export function contrastRatio(fg: string, bg: string): number {
  const f = toRgb(parseColor(fg));
  const b = toRgb(parseColor(bg));
  const ba = b.alpha ?? 1;
  const bgc = {
    r: b.r * ba + (1 - ba),
    g: b.g * ba + (1 - ba),
    b: b.b * ba + (1 - ba),
  };
  const fa = f.alpha ?? 1;
  const fgc = {
    r: f.r * fa + bgc.r * (1 - fa),
    g: f.g * fa + bgc.g * (1 - fa),
    b: f.b * fa + bgc.b * (1 - fa),
  };
  const l1 = luminance(fgc);
  const l2 = luminance(bgc);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Chroma weight by lightness: fullest in the mid tones, tapering at both ends. */
const chromaWeight = (l: number) => Math.max(0.12, 1 - ((l - 0.6) / 0.6) ** 2);

/**
 * 11-step palette (50–950) with strictly decreasing OKLCH lightness. The input hex sits at the
 * step whose target L is closest (kept verbatim); chroma is scaled around it, lower at the ends.
 */
export function generateScale(hex: string): Record<ScaleStep, string> {
  const base = toOklch(parseColor(hex));
  const anchorHex = toHex(base);
  const anchorL = toOklch(parse(anchorHex)!).l;
  const hue = base.h ?? 0;
  const chroma = base.h === undefined ? 0 : base.c;

  let anchor = 0;
  SCALE_STEPS.forEach((k, i) => {
    if (Math.abs(SCALE_LIGHTNESS[k] - anchorL) < Math.abs(SCALE_LIGHTNESS[SCALE_STEPS[anchor]!] - anchorL)) anchor = i;
  });

  const ls = SCALE_STEPS.map((k) => SCALE_LIGHTNESS[k]);
  ls[anchor] = anchorL;
  for (let i = anchor - 1; i >= 0; i--) ls[i] = Math.max(ls[i]!, ls[i + 1]! + MIN_GAP);
  for (let i = anchor + 1; i < ls.length; i++) ls[i] = Math.min(ls[i]!, ls[i - 1]! - MIN_GAP);

  const wAnchor = chromaWeight(anchorL);
  const out = {} as Record<ScaleStep, string>;
  SCALE_STEPS.forEach((k, i) => {
    if (i === anchor) {
      out[k] = anchorHex;
      return;
    }
    const l = clamp01(ls[i]!);
    const c = chroma * Math.min(chromaWeight(l) / wAnchor, 1.5);
    out[k] = toHex(mapToSrgb({ mode: "oklch", l, c, h: hue }));
  });
  return out;
}

/** Euclidean distance in OKLab. */
export function deltaEOk(a: string, b: string): number {
  return oklabDistance(parseColor(a), parseColor(b));
}

/** OKLCH hue in degrees; undefined for achromatic colors. */
export function hueOf(hex: string): number | undefined {
  const o = toOklch(parseColor(hex));
  return o.h === undefined || o.c < 0.002 ? undefined : o.h;
}

export function oklchLightness(hex: string): number {
  return toOklch(parseColor(hex)).l;
}
