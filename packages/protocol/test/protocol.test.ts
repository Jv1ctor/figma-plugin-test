import { describe, expect, it } from "vitest";
import {
  BASE_COLOR_NAMES, PRIMARY_NAMES, TOKENS, buildTheme, cssToFigmaRgba, figmaRgbaToOklch, themeToCss, validateTheme,
} from "../src/index.ts";

describe("color conversion", () => {
  it("converts in-gamut oklch to sRGB without clamping", () => {
    expect(cssToFigmaRgba("oklch(1 0 0)")).toEqual({ color: { r: 1, g: 1, b: 1, a: 1 }, clamped: false });
    const { color, clamped } = cssToFigmaRgba("oklch(0.205 0 0)");
    expect(clamped).toBe(false);
    expect(color.r).toBeCloseTo(0.0902, 3); // #171717
  });

  it("keeps alpha from `/ 10%`", () => {
    expect(cssToFigmaRgba("oklch(1 0 0 / 10%)").color.a).toBeCloseTo(0.1);
  });

  it("gamut-maps and flags out-of-sRGB colors", () => {
    const { color, clamped } = cssToFigmaRgba("oklch(0.7 0.4 150)");
    expect(clamped).toBe(true);
    for (const v of [color.r, color.g, color.b]) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(1);
  });

  it("rejects garbage", () => {
    expect(() => cssToFigmaRgba("not-a-color")).toThrow(/inválida/);
  });

  it("round-trips through Figma RGBA back to oklch", () => {
    for (const s of ["oklch(0.205 0 0)", "oklch(0.623 0.214 259.815)", "oklch(1 0 0 / 15%)"]) {
      const back = figmaRgbaToOklch(cssToFigmaRgba(s).color);
      expect(cssToFigmaRgba(back).color).toEqual(
        expect.objectContaining({ a: cssToFigmaRgba(s).color.a }),
      );
      const a = cssToFigmaRgba(s).color, b = cssToFigmaRgba(back).color;
      expect(Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)).toBeLessThan(0.01);
    }
    expect(figmaRgbaToOklch({ r: 1, g: 1, b: 1, a: 0.1 })).toBe("oklch(1 0 0 / 10%)");
  });
});

describe("presets", () => {
  it("every base × primary builds a valid, convertible theme", () => {
    for (const base of BASE_COLOR_NAMES) {
      for (const primary of ["base", ...PRIMARY_NAMES]) {
        const theme = buildTheme({ base, primary, radius: 0.625 });
        expect(validateTheme(theme)).toEqual([]);
        for (const mode of ["light", "dark"] as const) for (const t of TOKENS) cssToFigmaRgba(theme[mode][t]);
      }
    }
  });

  it("neutral ramps fit sRGB; only chromatic tokens (P3-tuned in Tailwind v4) get clamped", () => {
    const chromatic = /^(destructive|chart-\d|sidebar-primary)$/;
    for (const base of BASE_COLOR_NAMES) {
      const theme = buildTheme({ base, primary: "base", radius: 0.625 });
      for (const mode of ["light", "dark"] as const) {
        for (const t of TOKENS) {
          if (!chromatic.test(t)) expect(cssToFigmaRgba(theme[mode][t]).clamped, `${base}/${mode}/${t}`).toBe(false);
        }
      }
    }
    expect(cssToFigmaRgba(buildTheme({ base: "zinc", primary: "blue", radius: 0 }).light.primary).clamped).toBe(true);
  });

  it("supports custom hex primaries", () => {
    const theme = buildTheme({ base: "zinc", primary: "#ff6600", radius: 0.5 });
    expect(theme.light.primary).toMatch(/^oklch\(/);
    expect(theme.name).toBe("zinc-custom");
  });
});

describe("validateTheme", () => {
  it("reports missing tokens and bad radius", () => {
    const errors = validateTheme({ name: "x", radius: -1, light: { background: "red" }, dark: {} });
    expect(errors.join("\n")).toMatch(/radius/);
    expect(errors.join("\n")).toMatch(/light: tokens ausentes/);
  });
});

describe("themeToCss", () => {
  it("emits :root and .dark blocks", () => {
    const css = themeToCss(buildTheme({ base: "zinc", primary: "base", radius: 0.625 }));
    expect(css).toContain(":root {\n  --radius: 0.625rem;");
    expect(css).toContain(".dark {\n  --background: oklch(0.141 0.005 285.823);");
    expect(css).toContain("--color-sidebar-ring: var(--sidebar-ring);");
  });
});
