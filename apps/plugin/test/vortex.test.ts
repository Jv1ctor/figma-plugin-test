import { beforeEach, describe, expect, it } from "vitest";
import { loadSeed } from "@token-bridge/tokens";
import { fromFigmaExport, valueLine, withValueLine } from "@token-bridge/tokens/figma";
import { createFakeFigma } from "./fake-figma.ts";
import { capWarnings, readVortex, upsertVortex } from "../src/vortex.ts";

let fake: ReturnType<typeof createFakeFigma>;
const install = (opts?: Parameters<typeof createFakeFigma>[0]) => {
  fake = createFakeFigma(opts);
  (globalThis as any).figma = fake.figma;
};
beforeEach(() => install());

const seed = loadSeed();
/** What a fresh write stores: payload description with its Valor line made consistent. */
const consistent = (set: typeof seed) => {
  const out: any = { ...set, textStyles: [], shadowStyles: [] };
  for (const layer of ["base", "semantic", "specific"] as const) {
    out[layer] = Object.fromEntries(Object.entries(set[layer]).map(([n, t]: [string, any]) =>
      [n, { ...t, description: withValueLine(t.description, valueLine(set, layer, n)) }]));
  }
  return out;
};
const coll = (name: string) => fake.collections.find((c) => c.name === name);
const variable = (collection: string, name: string) =>
  fake.variables.find((v) => v.name === name && v.variableCollectionId === coll(collection)!.id);

describe("upsertVortex", () => {
  it("first send creates 3 collections with the right modes and round-trips", async () => {
    const res = await upsertVortex(seed, []);
    expect(fake.collections.map((c) => [c.name, c.modes.map((m: any) => m.name)])).toEqual([
      ["base", ["value"]], ["semantic", ["light", "dark"]], ["specific", ["light", "dark"]],
    ]);
    expect(res.variables.created).toBe(454);
    expect(res.warnings).toEqual([]);
    const { raw, warnings } = await readVortex();
    expect(warnings).toEqual([]);
    expect(fromFigmaExport(raw)).toEqual(consistent(seed));
  });

  it("second identical send writes nothing", async () => {
    await upsertVortex(seed, []);
    const writes = fake.calls.setValueForMode;
    let metaWrites = 0;
    for (const v of fake.variables) {
      for (const k of ["description", "scopes"]) {
        let cur = v[k];
        Object.defineProperty(v, k, { get: () => cur, set: (x) => { metaWrites++; cur = x; } });
      }
      const orig = v.setVariableCodeSyntax;
      v.setVariableCodeSyntax = (...a: any[]) => { metaWrites++; return orig(...a); };
    }
    const res = await upsertVortex(seed, []);
    expect(metaWrites).toBe(0);
    expect(res.variables).toMatchObject({ created: 0, updated: 0, unchanged: 454, removed: 0 });
    expect(fake.calls.setValueForMode).toBe(writes);
    expect(fake.calls.createVariable).toBe(454);
  });

  it("mode limit aborts before writing", async () => {
    install({ maxModes: 1 });
    await expect(upsertVortex(seed, [])).rejects.toMatchObject({ code: "mode-limit" });
    expect(fake.collections).toEqual([]);
    expect(fake.variables).toEqual([]);
  });

  it("updates in place and only replaces the Valor line", async () => {
    await upsertVortex(seed, []);
    const v = variable("semantic", "text/primary");
    const id = v.id;
    v.description = "Uso: X\nValor: velho";
    const other = Object.keys(seed.base).find((n) => n.startsWith("brand-1/") && n !== seed.semantic["text/primary"]!.values.light)!;
    const set2 = {
      ...seed,
      semantic: {
        ...seed.semantic,
        "text/primary": { ...seed.semantic["text/primary"]!, values: { ...seed.semantic["text/primary"]!.values, light: other } },
      },
    };
    const res = await upsertVortex(set2, []);
    expect(res.variables.updated).toBe(1);
    expect(variable("semantic", "text/primary").id).toBe(id);
    expect(v.description).toBe("Uso: X\nValor: " + valueLine(set2, "semantic", "text/primary"));
  });

  it("updates scopes on an existing variable and counts it as updated", async () => {
    await upsertVortex(seed, []);
    const id = variable("semantic", "text/primary").id;
    const set2 = {
      ...seed,
      semantic: { ...seed.semantic, "text/primary": { ...seed.semantic["text/primary"]!, scopes: ["ALL_FILLS"] } },
    };
    const res = await upsertVortex(set2, []);
    expect(res.variables).toMatchObject({ created: 0, updated: 1, unchanged: 453 });
    expect(variable("semantic", "text/primary")).toMatchObject({ id, scopes: ["ALL_FILLS"] });
  });

  it("mode-limit leaves existing collections' mode names untouched", async () => {
    install({ maxModes: 1 });
    const c = fake.figma.variables.createVariableCollection("semantic");
    await expect(upsertVortex(seed, [])).rejects.toMatchObject({ code: "mode-limit" });
    expect(c.modes.map((m: any) => m.name)).toEqual(["Mode 1"]);
    expect(fake.variables).toEqual([]);
  });

  it("writes scopes and codeSyntax", async () => {
    await upsertVortex(seed, []);
    const t = variable("semantic", "text/primary");
    expect(t.scopes).toEqual(["TEXT_FILL"]);
    expect(t.codeSyntax.WEB).toBe("var(--vx-text-primary)");
    expect(variable("base", "brand-1/50").codeSyntax.WEB).toBe("var(--vx-base-brand-1-50)");
  });

  it("removes only listed specifics", async () => {
    const color = Object.keys(seed.base).find((n) => seed.base[n]!.type === "color")!;
    const mk = (name: string) => ({
      name, type: "color" as const, scopes: ["ALL_FILLS"], description: "", flex: "free" as const,
      values: { light: color, dark: color },
    });
    const set = { ...seed, specific: { "a/b/c": mk("a/b/c"), "a/b/d": mk("a/b/d") } };
    await upsertVortex(set, []);
    expect(fake.variables.filter((v) => v.variableCollectionId === coll("specific")!.id)).toHaveLength(2);
    const res = await upsertVortex({ ...set, specific: { "a/b/d": set.specific["a/b/d"] } }, ["a/b/c", "x/y/z"]);
    expect(res.variables.removed).toBe(1);
    expect(fake.calls.removeVariable).toBe(1);
    expect(variable("specific", "a/b/c")).toBeUndefined();
    expect(variable("specific", "a/b/d")).toBeDefined();
    expect(res.warnings).toEqual(['Specific "x/y/z" não existe no Figma; nada removido']);
  });

  it("type mismatch is skipped with warning", async () => {
    const c = fake.figma.variables.createVariableCollection("semantic");
    c.renameMode(c.modes[0].modeId, "light");
    c.addMode("dark");
    fake.figma.variables.createVariable("text/primary", c, "FLOAT");
    const res = await upsertVortex(seed, []);
    expect(res.warnings).toContain('"semantic/text/primary": já existe como FLOAT (esperado COLOR); ignorado');
    expect(res.variables.created).toBe(454 - 1);
    expect(variable("semantic", "text/primary").resolvedType).toBe("FLOAT");
  });

  it("skips a value whose kind does not fit the variable type", async () => {
    // a dimension base token flagged as fontFamily makes toFigmaExport emit {number} on a STRING variable
    const name = Object.keys(seed.base).find((n) => seed.base[n]!.type === "dimension")!;
    const bad = { ...seed, base: { ...seed.base, [name]: { ...seed.base[name]!, type: "fontFamily" as const } } };
    const res = await upsertVortex(bad, []);
    expect(res.warnings).toContain(`"base/${name}": já existe como STRING (esperado FLOAT); ignorado`);
    expect(variable("base", name)).toBeUndefined();
  });

  it("existing base collection keeps its mode name", async () => {
    const c = fake.figma.variables.createVariableCollection("base");
    await upsertVortex(seed, []);
    expect(c.modes.map((m: any) => m.name)).toEqual(["Mode 1"]);
    const v = variable("base", "brand-1/50");
    expect(v.valuesByMode[c.defaultModeId]).toBeDefined();
    expect(fromFigmaExport((await readVortex()).raw)).toEqual(consistent(seed));
  });

  it("same name in another collection is untouched", async () => {
    const other = fake.figma.variables.createVariableCollection("shadcn/theme");
    const v = fake.figma.variables.createVariable("text/primary", other, "COLOR");
    v.setValueForMode(other.modes[0].modeId, { r: 1, g: 0, b: 0, a: 1 });
    const before = structuredClone(v.valuesByMode);
    await upsertVortex(seed, []);
    expect(v.valuesByMode).toEqual(before);
    expect(fake.variables.filter((x) => x.id === v.id)).toHaveLength(1);
  });
});

describe("readVortex", () => {
  it("broken alias is omitted on read", async () => {
    await upsertVortex(seed, []);
    const t = variable("semantic", "text/primary");
    const mode = coll("semantic")!.modes[0].modeId;
    const target = fake.variables.find((v) => v.id === t.valuesByMode[mode].id);
    target.remove();
    const { raw, warnings } = await readVortex();
    expect(raw.collections.find((c) => c.name === "semantic")!.variables.some((v) => v.name === "text/primary")).toBe(false);
    expect(warnings).toContain('"semantic/text/primary": alias quebrado; omitido');
  });

  it("fails clearly when there is no Vortex", async () => {
    await expect(readVortex()).rejects.toMatchObject({
      code: "no-collection", message: "Este arquivo ainda não tem os tokens Vortex — use Enviar para o Figma",
    });
  });
});

describe("capWarnings", () => {
  it("caps at 50", () => {
    const list = Array.from({ length: 60 }, (_, i) => `w${i}`);
    const out = capWarnings([...list, "w0"]);
    expect(out).toHaveLength(51);
    expect(out[50]).toBe("+10 avisos");
  });
});
