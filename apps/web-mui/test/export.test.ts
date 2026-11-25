import { describe, expect, it } from "vitest";
import { loadSeed } from "@token-bridge/tokens";
import { importFile } from "../src/export/ExportMenu.tsx";
import { toMuiModule } from "../src/export/mui-module.ts";
import { store } from "../src/state/store.ts";

describe("toMuiModule", () => {
  const mod = toMuiModule(loadSeed());

  it("importa o CSS e exporta o tema", () => {
    expect(mod).toContain('import "./vortex.css"');
    expect(mod).toContain("export const theme");
    expect(mod).toContain("export const vortexPalette");
    expect(mod).toMatch(/export \{[^}]*\bcreateVortexTheme\b/);
  });

  it("só importa @mui/material (e o CSS)", () => {
    const specs = [...mod.matchAll(/^import\s+(?:[^"']*\sfrom\s+)?["']([^"']+)["']/gm)].map((m) => m[1]!);
    expect(specs.length).toBeGreaterThan(1);
    expect(specs.every((s) => s === "./vortex.css" || s.startsWith("@mui/material"))).toBe(true);
  });

  it("traz as cores resolvidas do seed", () => {
    expect(mod).toContain('"#9246d7"');
  });

  it("é autônomo: sem URL de fonte do builder e com fontUrl nulo", () => {
    expect(mod).not.toContain("/fonts/");
    expect(mod).toContain("createVortexTheme(vortexPalette, { fontUrl: null })");
    expect(mod).toContain("CssBaseline");
  });

  it("não lê --vx-base-*", () => {
    expect(mod).not.toContain("--vx-base-");
  });
});

describe("importFile", () => {
  it("JSON fora do formato não altera o estado", async () => {
    const before = store.get().set;
    await importFile(new File(['{"x":1}'], "x.json"));
    expect(store.get().set).toBe(before);
  });

  it("JSON inválido não altera o estado", async () => {
    const before = store.get().set;
    await importFile(new File(["{nope"], "x.json"));
    expect(store.get().set).toBe(before);
  });
});
