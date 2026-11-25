import { describe, expect, it } from "vitest";
import { loadSeed } from "../src/dtcg.ts";
import { valueLine, withValueLine } from "../src/describe.ts";
import {
  EditError, applyScale, removeSpecific, setBaseValue, setGroupEnabled, setRef, upsertSpecific,
} from "../src/edits.ts";
import type { AliasToken } from "../src/types.ts";

const seed = loadSeed();

function spec(name: string, light: string, dark: string): AliasToken {
  return {
    name, type: "color", scopes: ["FRAME_FILL", "SHAPE_FILL"], flex: "free", values: { light, dark },
    description: "Uso: x\nQuando usar: x\nQuando não usar: x\nOnde: x\nSituação: Proposto\nOrigem: x",
  };
}

describe("valueLine", () => {
  it("reproduces every seed Valor line", () => {
    const bad: string[] = [];
    for (const layer of ["base", "semantic"] as const) {
      for (const t of Object.values(seed[layer])) {
        if (layer === "base" && t.name.startsWith("font-family/")) continue; // descrição do Figma desatualizada
        if (withValueLine(t.description, valueLine(seed, layer, t.name)) !== t.description) bad.push(`${layer}:${t.name}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it("matches spot checks", () => {
    expect(valueLine(seed, "semantic", "space/medium")).toBe("space/16 (16 px · 1 rem)");
    expect(valueLine(seed, "semantic", "border-width/strong")).toBe("border-width/2 (2 px)");
    expect(valueLine(seed, "semantic", "shadow/raised/color")).toBe("neutral/1000 a opacity/10 (10%)");
    expect(valueLine(seed, "semantic", "typography/body/medium/font-weight")).toBe("font-weight/400 (400 · Regular)");
    expect(valueLine(seed, "semantic", "text/primary")).toBe("neutral/900 | neutral/50");
    expect(valueLine(seed, "base", "brand-1/600")).toBe("#9246D7");
    expect(valueLine(seed, "base", "space/4")).toBe("4 px · 0,25 rem");
  });
});

describe("withValueLine", () => {
  it("replaces, appends, or starts", () => {
    expect(withValueLine("A\nValor: x\nB", "y")).toBe("A\nValor: y\nB");
    expect(withValueLine("A", "y")).toBe("A\nValor: y");
    expect(withValueLine("", "y")).toBe("Valor: y");
  });
});

describe("edits", () => {
  it("rejects locked base", () => { expect(() => setBaseValue(seed, "space/16", 20)).toThrow(EditError); });
  it("sets an adjustable base and rewrites its line", () => {
    const s = setBaseValue(seed, "neutral/500", "#808080");
    expect(s.base["neutral/500"]!.value).toBe("#808080");
    expect(s.base["neutral/500"]!.description).toMatch(/^Valor: #808080$/m);
    expect(seed.base["neutral/500"]!.value).toBe("#727272");
  });
  it("does not mutate", () => {
    const s = setRef(seed, "semantic", "text/secondary", "light", "neutral/800");
    expect(seed.semantic["text/secondary"]!.values.light).toBe("neutral/700");
    expect(s.semantic["text/secondary"]!.description).toMatch(/^Valor: neutral\/800 \| neutral\/300$/m);
  });
  it("scale", () => {
    const s = applyScale(seed, "brand-1", "#16a34a");
    expect(Object.keys(s.base).filter((k) => k.startsWith("brand-1/"))).toHaveLength(11);
    expect(s.base["brand-1/600"]!.description).toMatch(new RegExp(`^Valor: ${String(s.base["brand-1/600"]!.value).toUpperCase()}$`, "m"));
  });
  it("neutral keeps extremes", () => {
    const s = applyScale(seed, "neutral", "#78716c");
    expect(s.base["neutral/0"]!.value).toBe("#ffffff");
    expect(s.base["neutral/1000"]!.value).toBe("#000000");
  });
  it("rejects locked palettes", () => { expect(() => applyScale(seed, "danger", "#ff0000")).toThrow(EditError); });
  it("toggle group blocked by specific", () => {
    const s = upsertSpecific(seed, spec("background/reading", "brand-2/50", "brand-2/900"));
    expect(setGroupEnabled(s, "brand-2", false, seed)).toEqual({ ok: false, blockedBy: ["background/reading"] });
  });
  it("re-enable restores seed", () => {
    const off = (setGroupEnabled(applyScale(seed, "brand-3", "#000000"), "brand-3", false, seed) as any).set;
    expect(off.disabledGroups).toContain("brand-3");
    const on = (setGroupEnabled(off, "brand-3", true, seed) as any).set;
    expect(on.disabledGroups).not.toContain("brand-3");
    expect(on.base["brand-3/600"].value).toBe(seed.base["brand-3/600"]!.value);
  });
  it("specific collides with semantic", () => {
    expect(() => upsertSpecific(seed, spec("text/primary", "neutral/900", "neutral/50"))).toThrow(EditError);
  });
  it("upserts and removes a specific", () => {
    const s = upsertSpecific(seed, spec("background/reading", "neutral/50", "neutral/900"));
    expect(s.specific["background/reading"]!.description).toMatch(/^Valor: neutral\/50 \| neutral\/900$/m);
    expect(removeSpecific(s, "background/reading").specific["background/reading"]).toBeUndefined();
    expect(seed.specific["background/reading"]).toBeUndefined();
  });
});
