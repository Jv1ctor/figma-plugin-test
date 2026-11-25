import { beforeEach, describe, expect, it } from "vitest";
import { buildTheme } from "@token-bridge/protocol";
import { loadSeed } from "@token-bridge/tokens";
import { parseDtcg, toDtcg, valueLine, withValueLine } from "@token-bridge/tokens/figma";
import { createFakeFigma } from "./fake-figma.ts";
import { handleMessage } from "../src/handle.ts";

const install = (opts?: Parameters<typeof createFakeFigma>[0]) => {
  (globalThis as any).figma = createFakeFigma(opts).figma;
};
beforeEach(() => install());

const seed = loadSeed();
/** What a fresh write stores: payload description with its Valor line made consistent. */
const consistent = (set: typeof seed) => {
  const out: any = { ...set };
  for (const layer of ["base", "semantic", "specific"] as const) {
    out[layer] = Object.fromEntries(Object.entries(set[layer]).map(([n, t]: [string, any]) =>
      [n, { ...t, description: withValueLine(t.description, valueLine(set, layer, n)) }]));
  }
  return out;
};
const upsert = (tokens: unknown = toDtcg(seed), extra: object = {}) =>
  handleMessage({ id: "1", type: "upsert-tokens", payload: { tokens, ...extra } } as any);

describe("handleMessage", () => {
  it("upsert-tokens acks with the re-read tokens", async () => {
    const res = await upsert();
    expect(res!.type).toBe("ack");
    const ack = res!.payload as any;
    expect(ack).toMatchObject({ for: "upsert-tokens", warnings: [], durationMs: expect.any(Number) });
    expect(ack.variables).toMatchObject({ created: 454, removed: 0 });
    expect(parseDtcg(ack.tokens)).toEqual(consistent(seed));
  });

  it("invalid DTCG → error invalid", async () => {
    const res = await upsert({ foo: 1 });
    expect(res).toMatchObject({ id: "1", type: "error", payload: { code: "invalid" } });
    const bad = await handleMessage({ id: "2", type: "upsert-tokens", payload: {} } as any);
    expect(bad).toMatchObject({ type: "error", payload: { code: "invalid" } });
  });

  it("snapshot on empty file → error no-collection", async () => {
    const res = await handleMessage({ id: "3", type: "get-tokens-snapshot" } as any);
    expect(res).toMatchObject({ id: "3", type: "error", payload: { code: "no-collection" } });
  });

  it("snapshot after upsert returns tokens-snapshot", async () => {
    await upsert();
    const res = await handleMessage({ id: "4", type: "get-tokens-snapshot" } as any);
    expect(res!.type).toBe("tokens-snapshot");
    expect(parseDtcg((res!.payload as any).tokens)).toEqual(consistent(seed));
  });

  it("mode limit → error mode-limit", async () => {
    install({ maxModes: 1 });
    expect(await upsert()).toMatchObject({ type: "error", payload: { code: "mode-limit" } });
  });

  it("shadcn upsert-theme still acks", async () => {
    const payload = buildTheme({ base: "zinc", primary: "base", radius: 0.625 });
    const res = await handleMessage({ id: "5", type: "upsert-theme", payload } as any);
    expect(res).toMatchObject({ id: "5", type: "ack", payload: { theme: "zinc" } });
    const bad = await handleMessage({ id: "6", type: "upsert-theme", payload: {} } as any);
    expect(bad).toMatchObject({ type: "error", payload: { code: "invalid" } });
  });

  it("missing font: ack.tokens still has all variables", async () => {
    install({ missingFonts: ["Satoshi Variable"] });
    const ack = (await upsert())!.payload as any;
    expect(Object.keys(parseDtcg(ack.tokens).semantic)).toHaveLength(184);
    expect(ack.warnings.some((w: string) => w.includes("Satoshi Variable"))).toBe(true);
  });
});
