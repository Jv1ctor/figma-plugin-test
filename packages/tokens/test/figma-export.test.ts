import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fromFigmaExport, isDisabled, loadSeed, toFigmaExport } from "../src/index.ts";

describe("toFigmaExport", () => {
  it("round-trip: fromFigmaExport(toFigmaExport(seed)) equals seed", () => {
    expect(fromFigmaExport(toFigmaExport(loadSeed()))).toEqual(loadSeed());
  });

  it("maps types, modes and composite shadow color", () => {
    const raw = toFigmaExport(loadSeed(), { fileKey: "abc" });
    expect(raw.fileKey).toBe("abc");
    const col = (n: string) => raw.collections.find((c) => c.name === n)!;
    expect(raw.collections.map((c) => c.name)).toEqual(["base", "semantic", "specific"]);
    expect(col("base").modes).toEqual(["value"]);
    expect(col("semantic").modes).toEqual(["light", "dark"]);
    const shadow = col("semantic").variables.find((v) => /^shadow\/.*\/color$/.test(v.name))!;
    expect(shadow.values.light).toHaveProperty("composite");
    const b = col("base").variables;
    const brand = b.find((v) => v.name === "brand-1/50")!;
    expect(brand.values.value).toMatchObject({ color: { a: 1 } });
    expect(b.find((v) => v.name.startsWith("font-family/"))!.type).toBe("STRING");
  });

  it("omits disabled groups", () => {
    const set = { ...loadSeed(), disabledGroups: ["brand-2" as const] };
    const raw = toFigmaExport(set);
    const base = raw.collections[0]!.variables;
    expect(base.some((v) => v.name.startsWith("brand-2/"))).toBe(false);
    const sem = raw.collections[1]!.variables.map((v) => v.name);
    expect(sem.some((n) => isDisabled(set, "semantic", n))).toBe(false);
    expect(sem.length).toBeLessThan(Object.keys(set.semantic).length);
  });

  it("figma entry does not pull the seed", () => {
    const seen = new Set<string>();
    const visit = (file: string): void => {
      if (seen.has(file)) return;
      seen.add(file);
      const text = readFileSync(file, "utf8");
      expect(text).not.toMatch(/seed\//);
      expect(text).not.toMatch(/culori/);
      for (const m of text.matchAll(/from "(\.[^"]+)"/g)) visit(resolve(dirname(file), m[1]!));
    };
    visit(resolve(import.meta.dirname, "../src/figma.ts"));
    expect(seen.size).toBeGreaterThan(3);
  });
});
