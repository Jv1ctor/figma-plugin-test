import { beforeEach, describe, expect, it } from "vitest";
import { loadSeed } from "@token-bridge/tokens";
import { fromFigmaExport, valueLine, withValueLine } from "@token-bridge/tokens/figma";
import { createFakeFigma } from "./fake-figma.ts";
import { readVortex, upsertVortex } from "../src/vortex.ts";

let fake: ReturnType<typeof createFakeFigma>;
const install = (opts?: Parameters<typeof createFakeFigma>[0]) => {
  fake = createFakeFigma(opts);
  (globalThis as any).figma = fake.figma;
};
beforeEach(() => install());

const seed = loadSeed();
const consistent = (set: typeof seed) => {
  const out: any = { ...set };
  for (const layer of ["base", "semantic", "specific"] as const) {
    out[layer] = Object.fromEntries(Object.entries(set[layer]).map(([n, t]: [string, any]) =>
      [n, { ...t, description: withValueLine(t.description, valueLine(set, layer, n)) }]));
  }
  return out;
};
const varId = (name: string) => fake.variables.find((v) => v.name === name)!.id;

describe("vortex styles", () => {
  it("creates 12 text and 2 effect styles bound to variables", async () => {
    const res = await upsertVortex(seed, []);
    expect(res.warnings).toEqual([]);
    expect(res.styles.created).toBe(14);
    expect(fake.textStyles).toHaveLength(12);
    expect(fake.effectStyles).toHaveLength(2);
    const t = fake.textStyles[0];
    expect(t.name).toBe(seed.textStyles[0]!.name);
    expect(t.boundVariables.fontSize.id).toBe(varId(seed.textStyles[0]!.fontSize));
    expect(t.fontName).toEqual({ family: "Satoshi Variable", style: "Regular" });
    const e = fake.effectStyles[0].effects[0];
    expect(e.type).toBe("DROP_SHADOW");
    expect(e.boundVariables.color.id).toBe(varId(seed.shadowStyles[0]!.color));
    expect(e.boundVariables.radius.id).toBe(varId(seed.shadowStyles[0]!.blur));
  });

  it("full round-trip with styles", async () => {
    await upsertVortex(seed, []);
    const { raw, warnings } = await readVortex();
    expect(warnings).toEqual([]);
    expect(fromFigmaExport(raw)).toEqual(consistent(seed));
  });

  it("second send leaves styles unchanged", async () => {
    await upsertVortex(seed, []);
    const res = await upsertVortex(seed, []);
    expect(res.styles).toEqual({ created: 0, updated: 0, unchanged: 14 });
  });

  it("missing font skips only that style", async () => {
    install({ missingFonts: ["Satoshi Variable"] });
    const res = await upsertVortex(seed, []);
    expect(res.warnings).toContain(
      `Fonte "Satoshi Variable" indisponível no Figma: estilo "${seed.textStyles[0]!.name}" não foi atualizado`);
    expect(res.styles.created).toBe(2);
    expect(res.variables.created).toBe(454);
    expect(fake.textStyles).toHaveLength(0);
  });

  it("existing style keeps id and description", async () => {
    install();
    const pre = fake.figma.createTextStyle();
    pre.name = seed.textStyles[0]!.name;
    pre.description = "minha";
    const res = await upsertVortex(seed, []);
    expect(res.styles).toEqual({ created: 13, updated: 1, unchanged: 0 });
    expect(fake.textStyles.filter((s) => s.name === pre.name)).toHaveLength(1);
    expect(fake.textStyles.find((s) => s.name === pre.name)!.id).toBe(pre.id);
    expect(pre.description).toBe("minha");
    expect((pre.boundVariables as any).fontSize.id).toBe(varId(seed.textStyles[0]!.fontSize));
  });

  it("unknown variable warns and skips the style", async () => {
    const set = { ...seed, textStyles: [{ ...seed.textStyles[0]!, fontSize: "nope/x" }], shadowStyles: [] };
    const res = await upsertVortex(set, []);
    expect(res.warnings).toContain(`Estilo "${set.textStyles[0]!.name}": variável "nope/x" não existe; estilo ignorado`);
    expect(res.styles.created).toBe(0);
  });
});

describe("vortex styles: failure isolation and reading", () => {
  it("type-mismatched variable skips one style with an exact warning and no orphan", async () => {
    await upsertVortex(seed, []);
    const first = seed.textStyles[0]!;
    fake.textStyles.splice(0, 1); // pretend the style is new again
    const v = fake.variables.find((x) => x.name === first.fontSize)!;
    v.resolvedType = "STRING";
    const res = await upsertVortex(seed, []);
    expect(res.warnings).toContain(
      `Estilo "${first.name}": variável "${first.fontSize}" tem tipo STRING (esperado FLOAT); estilo ignorado`);
    expect(fake.textStyles).toHaveLength(11);
    expect(fake.textStyles.some((s) => s.name === first.name)).toBe(false);
    expect(res.styles).toEqual({ created: 0, updated: 0, unchanged: 13 });
  });

  it("a style whose Figma write throws is skipped and cleaned up", async () => {
    install();
    const orig = fake.figma.createTextStyle;
    let n = 0;
    fake.figma.createTextStyle = () => {
      const st = orig();
      if (n++ === 0) st.setBoundVariable = () => { throw new Error("boom"); };
      return st;
    };
    const res = await upsertVortex(seed, []);
    expect(res.warnings).toContain(
      `Estilo "${seed.textStyles[0]!.name}": Figma recusou a atualização (boom); estilo ignorado`);
    expect(res.styles.created).toBe(13);
    expect(fake.textStyles).toHaveLength(11);
    expect(res.variables.created).toBe(454);
  });

  it("existing effect style with a blur effect becomes a bound DROP_SHADOW", async () => {
    install();
    const pre = fake.figma.createEffectStyle();
    pre.name = seed.shadowStyles[0]!.name;
    pre.effects = [{ type: "LAYER_BLUR", radius: 4, visible: true, blurType: "NORMAL" }] as any;
    const res = await upsertVortex(seed, []);
    expect(res.warnings).toEqual([]);
    expect(res.styles.updated).toBe(1);
    expect(pre.effects[0]!.type).toBe("DROP_SHADOW");
    expect((pre.effects[0] as any).boundVariables.spread.id).toBe(varId(seed.shadowStyles[0]!.spread));
  });

  it("untouched local styles are silently ignored when reading", async () => {
    await upsertVortex(seed, []);
    const own = fake.figma.createTextStyle();
    own.name = "mine/body";
    const { raw, warnings } = await readVortex();
    expect(warnings).toEqual([]);
    expect(raw.textStyles.map((s) => s.name)).not.toContain("mine/body");
    expect(raw.textStyles).toHaveLength(12);
  });

  it("caps warnings once, with +N last", async () => {
    await upsertVortex(seed, []);
    const base = fake.collections.find((c) => c.name === "base");
    fake.figma.variables.createVariable("flag", base, "BOOLEAN");
    for (let i = 0; i < 60; i++) {
      const st = fake.figma.createTextStyle();
      st.name = `partial/${i}`;
      st.setBoundVariable("fontSize", fake.variables.find((x) => x.name === seed.textStyles[0]!.fontSize));
    }
    const { warnings } = await readVortex();
    expect(warnings).toHaveLength(51);
    expect(warnings[50]).toBe("+11 avisos");
    expect(warnings.filter((w) => /^\+\d+ avisos$/.test(w))).toHaveLength(1);
  });
});
