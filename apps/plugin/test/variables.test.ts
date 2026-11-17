import { beforeEach, describe, expect, it } from "vitest";
import { buildTheme, TOKENS, cssToFigmaRgba } from "@token-bridge/protocol";
import { createFakeFigma } from "./fake-figma.ts";
import { readSnapshot, upsertTheme } from "../src/variables.ts";

let fake: ReturnType<typeof createFakeFigma>;
const install = (opts?: Parameters<typeof createFakeFigma>[0]) => {
  fake = createFakeFigma(opts);
  (globalThis as any).figma = fake.figma;
};
beforeEach(() => install());

const zinc = buildTheme({ base: "zinc", primary: "base", radius: 0.625 });
const blue = buildTheme({ base: "zinc", primary: "blue", radius: 0.5 });
const modeId = (name: string) => fake.collections[0].modes.find((m: any) => m.name === name).modeId;
const variable = (name: string) => fake.variables.find((v) => v.name === name);

describe("upsertTheme", () => {
  it("creates the collection, light/dark modes and 32 variables on first run", async () => {
    const ack = await upsertTheme(zinc);
    expect(ack).toMatchObject({ theme: "zinc", created: TOKENS.length + 1, updated: 0, unchanged: 0 });
    expect(fake.collections).toHaveLength(1);
    expect(fake.collections[0].name).toBe("shadcn/theme");
    expect(fake.collections[0].modes.map((m: any) => m.name)).toEqual(["light", "dark"]);
    expect(variable("color/primary").resolvedType).toBe("COLOR");
    expect(variable("color/primary").codeSyntax.WEB).toBe("var(--primary)");
    expect(variable("radius/base")).toMatchObject({ resolvedType: "FLOAT", scopes: ["CORNER_RADIUS"] });
    expect(variable("radius/base").valuesByMode[modeId("light")]).toBe(10);
    expect(variable("radius/base").valuesByMode[modeId("dark")]).toBe(10);
  });

  it("is idempotent: running the same theme twice creates nothing and writes nothing", async () => {
    await upsertTheme(zinc);
    const writes = fake.calls.setValueForMode;
    const ack = await upsertTheme(zinc);
    expect(ack).toMatchObject({ created: 0, updated: 0, unchanged: TOKENS.length + 1 });
    expect(fake.calls.createCollection).toBe(1);
    expect(fake.variables).toHaveLength(TOKENS.length + 1);
    expect(new Set(fake.variables.map((v) => v.name)).size).toBe(fake.variables.length);
    expect(fake.calls.setValueForMode).toBe(writes);
  });

  it("updates only what changed, in both modes", async () => {
    await upsertTheme(zinc);
    const ack = await upsertTheme(blue);
    expect(ack.created).toBe(0);
    // primary, primary-fg, ring, sidebar-primary, sidebar-primary-fg, sidebar-ring + radius
    expect(ack.updated).toBe(7);
    const primary = variable("color/primary");
    expect(primary.valuesByMode[modeId("light")]).toEqual(cssToFigmaRgba(blue.light.primary).color);
    expect(primary.valuesByMode[modeId("dark")]).toEqual(cssToFigmaRgba(blue.dark.primary).color);
    expect(variable("radius/base").valuesByMode[modeId("dark")]).toBe(8);
  });

  it("reports gamut-clamped tokens per mode", async () => {
    const ack = await upsertTheme(blue);
    expect(ack.clamped).toContainEqual({ token: "primary", mode: "light", from: blue.light.primary });
    expect(ack.clamped.some((c) => c.token === "background")).toBe(false);
  });

  it("reuses an existing collection whose only mode is the default one", async () => {
    fake.figma.variables.createVariableCollection("shadcn/theme");
    await upsertTheme(zinc);
    expect(fake.collections).toHaveLength(1);
    expect(fake.collections[0].modes.map((m: any) => m.name)).toEqual(["light", "dark"]);
  });

  it("fails with a clear mode-limit error on plans with 1 mode, without leaving a collection behind", async () => {
    install({ maxModes: 1 });
    await expect(upsertTheme(zinc)).rejects.toMatchObject({ code: "mode-limit", message: expect.stringMatching(/plano/) });
    expect(fake.collections).toHaveLength(0);
    expect(fake.variables).toHaveLength(0);
  });

  it("rejects bad colors before touching the file", async () => {
    const bad = { ...zinc, light: { ...zinc.light, primary: "nope" } };
    await expect(upsertTheme(bad)).rejects.toMatchObject({ code: "invalid" });
    expect(fake.collections).toHaveLength(0);
  });
});

describe("readSnapshot", () => {
  it("errors when the collection doesn't exist", async () => {
    await expect(readSnapshot()).rejects.toMatchObject({ code: "no-collection" });
  });

  it("returns the same theme it was given (modulo gamut mapping + rounding)", async () => {
    await upsertTheme(zinc);
    const snap = await readSnapshot();
    expect(snap.name).toBe("zinc");
    expect(snap.radius).toBe(0.625);
    for (const mode of ["light", "dark"] as const) {
      for (const t of TOKENS) {
        const a = cssToFigmaRgba(zinc[mode][t]).color;
        const b = cssToFigmaRgba(snap[mode][t]).color;
        expect(Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b), `${mode}.${t}`).toBeLessThan(0.01);
        expect(b.a).toBeCloseTo(a.a, 2);
      }
    }
    // Re-applying the snapshot is a no-op.
    expect(await upsertTheme(snap)).toMatchObject({ created: 0, updated: 0 });
  });

  it("resolves VARIABLE_ALIAS values", async () => {
    await upsertTheme(zinc);
    const ring = variable("color/ring");
    const primary = variable("color/primary");
    ring.valuesByMode[modeId("light")] = { type: "VARIABLE_ALIAS", id: primary.id };
    const snap = await readSnapshot();
    expect(snap.light.ring).toBe(snap.light.primary);
  });
});
