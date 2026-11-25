import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSeed, setBaseValue, toDtcg } from "@token-bridge/tokens";
import type * as StoreModule from "../src/state/store.ts";

async function freshModule(): Promise<typeof StoreModule> {
  vi.resetModules();
  return import("../src/state/store.ts");
}
const freshStore = async () => (await freshModule()).store;
const DRAFT_KEY = "vortex-builder:draft:v1";

describe("store", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("abre com o seed quando não há rascunho", async () => {
    const store = await freshStore();
    const s = store.get();
    expect(s.set).toEqual(loadSeed());
    expect(s.seed).toEqual(loadSeed());
    expect(s).toMatchObject({ mode: "light", tab: "base", warningsOpen: false, warnings: [] });
  });

  it("descarta um rascunho corrompido", async () => {
    localStorage.setItem(DRAFT_KEY, "{broken");
    expect((await freshStore()).get().set).toEqual(loadSeed());
  });

  it("descarta um rascunho que não é um tema Vortex", async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ hello: "world" }));
    expect((await freshStore()).get().set).toEqual(loadSeed());
  });

  it("não quebra com localStorage bloqueado", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.useFakeTimers();
    const store = await freshStore();
    expect(store.get().set).toEqual(loadSeed());
    store.update((s) => ({ ...s, set: setBaseValue(s.set, "brand-1/600", "#16a34a") }));
    expect(() => vi.advanceTimersByTime(300)).not.toThrow();
  });

  it("abre com o seed quando o rascunho tem uma cor inválida", async () => {
    const bad = JSON.parse(JSON.stringify(toDtcg(loadSeed())));
    bad.base.neutral["900"].$value = "#zzzzzz";
    localStorage.setItem(DRAFT_KEY, JSON.stringify(bad));
    expect((await freshStore()).get().set).toEqual(loadSeed());
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("restaura um rascunho válido", async () => {
    const edited = setBaseValue(loadSeed(), "brand-1/600", "#16a34a");
    localStorage.setItem(DRAFT_KEY, JSON.stringify(toDtcg(edited)));
    expect((await freshStore()).get().set.base["brand-1/600"]!.value).toBe("#16a34a");
  });

  it("grava o rascunho com debounce de 300 ms", async () => {
    vi.useFakeTimers();
    const store = await freshStore();
    store.update((s) => ({ ...s, set: setBaseValue(s.set, "brand-1/600", "#111111") }));
    store.update((s) => ({ ...s, set: setBaseValue(s.set, "brand-1/600", "#16a34a") }));
    vi.advanceTimersByTime(299);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!)).toEqual(toDtcg(store.get().set));
  });

  it("não grava rascunho por mudanças que não são do set", async () => {
    vi.useFakeTimers();
    const store = await freshStore();
    store.update((s) => ({ ...s, tab: "semantic", mode: "dark" }));
    vi.advanceTimersByTime(1000);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("recalcula os avisos com os pesos de FONT_CATALOG", async () => {
    const store = await freshStore();
    store.update((s) => ({ ...s, set: setBaseValue(s.set, "font-family/secondary", "Lato") }));
    const w = store.get().warnings.filter((x) => x.rule === "font-weight");
    expect(w.length).toBeGreaterThan(0);
    expect(w[0]!.message).toContain("Lato");
  });

  it("avisa quando brand-2 está desligado (Chip e Badge Secondary)", async () => {
    const store = await freshStore();
    store.update((s) => ({ ...s, set: { ...s.set, disabledGroups: ["brand-2"] } }));
    expect(store.get().warnings).toContainEqual(expect.objectContaining({
      rule: "disabled-group-in-use",
      token: "semantic:background/accent-2/strong",
      message: "Chip e Badge Secondary usam accent-2, que está desligado: voltam ao padrão do MUI",
    }));
  });

  it("replaceSet troca o set e reset volta ao seed", async () => {
    const store = await freshStore();
    const edited = setBaseValue(loadSeed(), "brand-1/600", "#16a34a");
    store.replaceSet(edited);
    expect(store.get().set).toBe(edited);
    store.reset();
    expect(store.get().set).toEqual(loadSeed());
  });

  it("notifica e desinscreve", async () => {
    const store = await freshStore();
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.update((s) => ({ ...s, tab: "specific" }));
    off();
    store.update((s) => ({ ...s, tab: "base" }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("exporta DRAFT_KEY", async () => {
    expect((await freshModule()).DRAFT_KEY).toBe(DRAFT_KEY);
  });
});
