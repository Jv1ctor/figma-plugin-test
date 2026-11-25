import { describe, expect, it } from "vitest";
import { diffSets, loadSeed, setGroupEnabled } from "../src/index.ts";
import type { AliasToken, TokenSet } from "../src/index.ts";

const clone = (): TokenSet => structuredClone(loadSeed());

describe("diffSets", () => {
  it("identical sets have total 0", () => {
    const d = diffSets(loadSeed(), clone());
    expect(d.total).toBe(0);
    expect(d.base).toEqual({ added: [], changed: [], removed: [] });
  });

  it("detects added/changed/removed per layer", () => {
    const to = clone();
    to.base["brand-1/500"]!.value = "#010203";
    to.specific["button/primary/background"] = {
      name: "button/primary/background", type: "color", scopes: [], description: "", flex: "free",
      values: { light: "brand-1/500", dark: "brand-1/500" },
    };
    const gone = Object.keys(to.semantic)[0]!;
    delete to.semantic[gone];
    const d = diffSets(loadSeed(), to);
    expect(d.base.changed).toEqual(["brand-1/500"]);
    expect(d.specific.added).toEqual(["button/primary/background"]);
    expect(d.semantic.removed).toEqual([gone]);
    expect(d.total).toBe(3);
  });

  it("composite change counts as changed", () => {
    const to = clone();
    const name = Object.keys(to.semantic).find((n) => typeof to.semantic[n]!.values.light === "object")!;
    const t = to.semantic[name] as AliasToken;
    const light = t.values.light as { color: string; opacity: string };
    t.values.light = { ...light, opacity: light.opacity === "opacity/8" ? "opacity/16" : "opacity/8" };
    expect(diffSets(loadSeed(), to).semantic.changed).toContain(name);
  });

  it("style binding change", () => {
    const to = clone();
    const s = to.textStyles[0]!;
    s.fontSize = s.fontSize + "-x";
    expect(diffSets(loadSeed(), to).styles.changed).toContain(`text:${s.name}`);
  });

  it("ignores description and disabledGroups", () => {
    const to = clone();
    to.base["brand-1/500"]!.description = "outra";
    to.disabledGroups = ["brand-2"];
    expect(diffSets(loadSeed(), to).total).toBe(0);
  });

  it("ignoreDisabledOf skips tokens of disabled groups; default behavior unchanged", () => {
    const seed = loadSeed();
    const off = setGroupEnabled(seed, "data", false, seed);
    if (!off.ok) throw new Error("expected ok");
    const withoutData = structuredClone(off.set);
    for (const n of Object.keys(withoutData.base)) if (n.startsWith("data-")) delete withoutData.base[n];
    for (const n of Object.keys(withoutData.semantic)) if (n.startsWith("data/")) delete withoutData.semantic[n];
    expect(diffSets(withoutData, off.set).total).toBeGreaterThan(0);
    expect(diffSets(withoutData, off.set, { ignoreDisabledOf: off.set }).total).toBe(0);
  });
});
