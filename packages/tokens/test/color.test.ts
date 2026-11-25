import { describe, expect, it } from "vitest";
import {
  InvalidColorError,
  SCALE_STEPS,
  contrastRatio,
  deltaEOk,
  generateScale,
  hueOf,
  oklchLightness,
} from "../src/color.ts";

describe("contrastRatio", () => {
  it("follows WCAG 2.x", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#1a1a1a", "#ffffff")).toBeCloseTo(17.4, 0);
  });
  it("composites an alpha foreground over the background", () => {
    expect(contrastRatio("#00000080", "#ffffff")).toBeCloseTo(contrastRatio("#808080", "#ffffff"), 0);
  });
  it("composites a translucent background over white", () => {
    expect(contrastRatio("#000000", "#00000000")).toBeCloseTo(21, 1);
  });
  it("rejects invalid colors", () => {
    expect(() => contrastRatio("abc", "#fff")).toThrow(InvalidColorError);
  });
});

describe("generateScale", () => {
  for (const hex of ["#9246d7", "#ffffff", "#000000", "#ffff00", "#12cee4"]) {
    it(`is monotonic, hex-only and deterministic for ${hex}`, () => {
      const s = generateScale(hex);
      const ls = SCALE_STEPS.map((k) => oklchLightness(s[k]));
      expect(ls.every((l, i) => i === 0 || l < ls[i - 1]!)).toBe(true);
      expect(Object.values(s).every((h) => /^#[0-9a-f]{6}$/.test(h))).toBe(true);
      expect(generateScale(hex)).toEqual(s);
      expect(Object.values(s)).toContain(hex);
    });
  }
  it("anchors the extremes for white and black", () => {
    expect(generateScale("#ffffff")[50]).toBe("#ffffff");
    expect(generateScale("#000000")[950]).toBe("#000000");
  });
  it("throws InvalidColorError on garbage", () => {
    expect(() => generateScale("abc")).toThrow(InvalidColorError);
  });
});

describe("deltaEOk / hueOf / oklchLightness", () => {
  it("measures distance", () => {
    expect(deltaEOk("#ffffff", "#ffffff")).toBe(0);
    expect(deltaEOk("#ffffff", "#000000")).toBeCloseTo(1, 2);
  });
  it("hue is undefined for achromatic colors", () => {
    expect(hueOf("#808080")).toBeUndefined();
    expect(hueOf("#ff0000")).toBeCloseTo(29.2, 0);
  });
  it("lightness spans 0..1", () => {
    expect(oklchLightness("#000000")).toBeCloseTo(0, 3);
    expect(oklchLightness("#ffffff")).toBeCloseTo(1, 3);
  });
});
