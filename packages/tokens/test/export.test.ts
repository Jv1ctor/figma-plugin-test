import { describe, expect, it } from "vitest";
import { loadSeed } from "../src/seed.ts";
import { cssVarMap, cssVarName, muiPaletteValues, toCss, toTailwind } from "../src/index.ts";

const seed = loadSeed();

describe("css vars", () => {
  it("names and values", () => {
    expect(cssVarName("base", "radius/full")).toBe("--vx-base-radius-full");
    const m = cssVarMap(seed);
    expect(m.light["--vx-text-primary"]).toBe("var(--vx-base-neutral-900)");
    expect(m.dark["--vx-text-primary"]).toBe("var(--vx-base-neutral-50)");
    expect(m.root["--vx-base-space-16"]).toBe("1rem");
    expect(m.root["--vx-base-border-width-0_5"]).toBe("0.5px");
    expect(m.root["--vx-base-opacity-40"]).toBe("0.4");
    expect(m.root["--vx-base-letter-spacing-0"]).toBe("0rem");
    expect(m.root["--vx-base-font-weight-400"]).toBe("400");
    expect(m.root["--vx-base-font-family-primary"]).toMatch(/^"[^"]+", system-ui, sans-serif$/);
    expect(Object.keys(m.light).some((k) => k.startsWith("--vx-base-"))).toBe(false);
    expect(m.light["--vx-shadow-raised-color"]).toBe(
      "rgb(from var(--vx-base-neutral-1000) r g b / var(--vx-base-opacity-10))");
    expect(m.dark["--vx-shadow-overlay"]).toBe(
      "var(--vx-shadow-overlay-offset-x) var(--vx-shadow-overlay-offset-y) var(--vx-shadow-overlay-blur) var(--vx-shadow-overlay-spread) var(--vx-shadow-overlay-color)");
    expect(m.light["--vx-shadow-raised"]).toContain("var(--vx-shadow-raised-color)");
  });
  it("missing refs become initial; disabled groups vanish", () => {
    const broken = { ...seed, semantic: { ...seed.semantic, "text/primary": { ...seed.semantic["text/primary"]!, values: { light: "nope/1", dark: "nope/1" } } } };
    expect(cssVarMap(broken).light["--vx-text-primary"]).toBe("initial");
    const off = cssVarMap({ ...seed, disabledGroups: ["data"] });
    expect(off.light["--vx-data-categorical-1"]).toBeUndefined();
    expect(off.root["--vx-base-data-1-500"] ?? off.root["--vx-base-data-1-600"]).toBeUndefined();
  });
  it("snapshots", () => {
    expect(toCss(seed)).toMatchSnapshot();
    expect(toCss(seed)).toContain(':root, [data-mode="light"] {');
    expect(toCss(seed)).toContain('[data-mode="dark"] {');
  });
});

describe("tailwind", () => {
  it("snapshot and base isolation", () => {
    const tw = toTailwind(seed);
    expect(tw).toMatchSnapshot();
    expect(tw).not.toMatch(/--color-base-/);
    expect(tw).not.toMatch(/var\(--vx-base-/);
    expect(tw).toContain('@import "./vortex.css";');
    expect(tw).toContain("--color-text-primary: var(--vx-text-primary);");
    expect(tw).toContain("--text-body-medium--line-height: var(--vx-typography-body-medium-line-height);");
    expect(tw).toContain("--font-body: var(--vx-typography-body-font-family);");
    expect(tw).toContain("--shadow-raised: var(--vx-shadow-raised);");
  });
  it("inlines css", () => {
    const tw = toTailwind(seed, { inlineCss: true });
    expect(tw).not.toContain("@import");
    expect(tw).toContain("--vx-base-space-16: 1rem;");
  });
});

describe("mui palette", () => {
  it("resolves hex values", () => {
    expect(muiPaletteValues(seed, "light")).toMatchObject({ primary: "#9246d7", textPrimary: "#1a1a1a", backgroundDefault: "#ffffff", divider: "#e6e6e6" });
    for (const v of Object.values(muiPaletteValues(seed, "dark"))) expect(v).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("secondary is null when brand-2 is off", () => {
    expect(muiPaletteValues({ ...seed, disabledGroups: ["brand-2"] }, "light").secondary).toBeNull();
  });
});
