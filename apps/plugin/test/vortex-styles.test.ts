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
