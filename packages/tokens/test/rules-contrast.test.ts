import { describe, expect, it } from "vitest";
import { loadSeed, parsePar, validate, type Warning } from "../src/index.ts";

const seed = loadSeed();
const SEED_CONTRAST_BASELINE: Warning[] = [];

describe("contrast rules", () => {
  it("parses Par", () => {
    expect(parsePar("Par: background/canvas, background/surface\nFlexibilidade: x", (n) => n in seed.semantic))
      .toEqual(["background/canvas", "background/surface"]);
  });
  it("expands 'e seus estados' and ignores unknown names", () => {
    const known = (n: string) => ["background/action/primary", "background/action/primary-hover", "background/action/primary-pressed"].includes(n);
    expect(parsePar("Par: background/action/primary e seus estados", known))
      .toEqual(["background/action/primary", "background/action/primary-hover", "background/action/primary-pressed"]);
    expect(parsePar("Par: —", known)).toEqual([]);
    expect(parsePar("sem par", known)).toEqual([]);
  });
  it("seed baseline", () => {
    expect(validate(seed).filter((w) => w.rule.startsWith("contrast"))).toEqual(SEED_CONTRAST_BASELINE);
  });
  it("yellow brand breaks on-action-primary (doc example)", () => {
    const s = structuredClone(seed); s.base["brand-1/600"].value = "#facc15";
    const w = validate(s).find((w) => w.token === "semantic:text/on-action-primary" && w.mode === "light" && w.against === "background/action/primary");
    expect(w?.rule).toBe("contrast-text");
    expect(Number(w!.actual!.split(":")[0])).toBeLessThan(4.5);
    expect(w!.expected).toBe("4.5:1");
    expect(w!.message).toMatch(/^Contraste \d\.\d:1 contra background\/action\/primary \(mínimo 4\.5:1\)/);
  });
  it("broken ref", () => {
    const s = structuredClone(seed); s.semantic["border/subtle"].values.dark = "neutral/123";
    expect(validate(s)).toContainEqual(expect.objectContaining({ rule: "broken-ref", token: "semantic:border/subtle", mode: "dark" }));
  });
  it("skips disabled tokens and partners", () => {
    const s = structuredClone(seed); s.disabledGroups = ["brand-2", "brand-3", "brand-4", "data"];
    expect(validate(s).some((w) => w.token.includes("accent-2") || w.token.includes("data/"))).toBe(false);
  });
});
