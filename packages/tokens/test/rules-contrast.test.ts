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
  const mutate = (fn: (s: ReturnType<typeof loadSeed>) => void) => { const s = structuredClone(seed); fn(s); return s; };
  const find = (s: ReturnType<typeof loadSeed>, token: string, mode: string, against: string) =>
    validate(s).find((w) => w.token === token && w.mode === mode && w.against === against);

  it("skips disabled tokens", () => {
    const s = mutate((s) => { s.semantic["text/on-accent-2-strong"].values.light = "brand-2/600"; });
    expect(find(s, "semantic:text/on-accent-2-strong", "light", "background/accent-2/strong")?.rule).toBe("contrast-text");
    s.disabledGroups = ["brand-2"];
    expect(validate(s).filter((w) => w.token.includes("accent-2") || w.against?.includes("accent-2"))).toEqual([]);
  });
  it("skips disabled partners", () => {
    const s = mutate((s) => {
      s.semantic["text/primary"].description += "\nPar: background/canvas, background/accent-2/strong";
      s.semantic["text/primary"].description = s.semantic["text/primary"].description.replace(/Par: background\/canvas, background\/surface, background\/surface-raised\n?/, "");
      s.semantic["text/primary"].values.light = "neutral/0";
      s.semantic["background/accent-2/strong"].values.light = "neutral/0";
    });
    expect(find(s, "semantic:text/primary", "light", "background/accent-2/strong")?.rule).toBe("contrast-text");
    s.disabledGroups = ["brand-2"];
    expect(find(s, "semantic:text/primary", "light", "background/accent-2/strong")).toBeUndefined();
    expect(find(s, "semantic:text/primary", "light", "background/canvas")?.rule).toBe("contrast-text");
  });
  it("contrast-icon with its own Par", () => {
    const s = mutate((s) => { s.semantic["icon/primary"].values.light = "neutral/100"; });
    expect(find(s, "semantic:icon/primary", "light", "background/canvas")?.rule).toBe("contrast-icon");
  });
  it("contrast-icon falls back to the text Par of the same name", () => {
    const s = mutate((s) => { s.semantic["icon/danger"].description = "sem linha de par"; s.semantic["icon/danger"].values.light = "neutral/0"; });
    const w = find(s, "semantic:icon/danger", "light", "background/canvas");
    expect(w?.rule).toBe("contrast-icon");
    expect(w!.expected).toBe("3.0:1");
  });
  it("contrast-control", () => {
    const s = mutate((s) => { s.semantic["border/strong"].values.light = "neutral/100"; });
    expect(find(s, "semantic:border/strong", "light", "background/canvas")?.rule).toBe("contrast-control");
  });
  it("contrast-focus", () => {
    const s = mutate((s) => { s.semantic["border/focus"].values.light = "neutral/0"; });
    expect(find(s, "semantic:border/focus", "light", "background/canvas")?.rule).toBe("contrast-focus");
  });
  it("contrast-data", () => {
    const s = mutate((s) => { s.semantic["data/categorical-1"].values.light = "data-1/50"; });
    expect(find(s, "semantic:data/categorical-1", "light", "background/canvas")?.rule).toBe("contrast-data");
  });
});
