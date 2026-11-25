import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSeed, removeSpecific, setBaseValue, toDtcg, upsertSpecific } from "@token-bridge/tokens";
import type { AliasToken, TokenSet } from "@token-bridge/tokens";
import type { Envelope, ErrorPayload, MessageType, StatusPayload } from "@token-bridge/protocol";
import type { RelayPort, RelayState } from "../src/sync/relay-client.ts";

const REMOVED_KEY = "vortex-builder:removed-specifics:v1";

interface Call { type: MessageType; payload: unknown; timeoutMs?: number }

/** Relay controlável: cada request só resolve quando o teste manda. */
class FakeRelay implements RelayPort {
  state: RelayState = { socket: "closed", status: null };
  calls: Call[] = [];
  handler: (c: Call) => Promise<Envelope> = () => new Promise(() => {});
  private fns = new Set<() => void>();
  subscribe(fn: () => void) { this.fns.add(fn); return () => this.fns.delete(fn); }
  set(patch: Partial<RelayState>) { this.state = { ...this.state, ...patch }; for (const f of this.fns) f(); }
  open(status: Partial<StatusPayload> = {}) {
    this.set({ socket: "open", status: { plugin: "connected", queued: false, tokensQueued: false, ...status } });
  }
  request(type: MessageType, payload?: unknown, timeoutMs?: number): Promise<Envelope> {
    const c = { type, payload, timeoutMs };
    this.calls.push(c);
    return this.handler(c);
  }
}

const reply = (type: string, payload: unknown): Promise<Envelope> => Promise.resolve({ id: "x", type, payload });
const fail = (code: ErrorPayload["code"]) => Promise.reject(new (relayError())({ code, message: code }));
let relayError: () => typeof import("../src/sync/relay-client.ts").RelayError;

async function setup() {
  vi.resetModules();
  const store = (await import("../src/state/store.ts")).store;
  const sync = await import("../src/sync/sync-store.ts");
  const actions = await import("../src/sync/actions.ts");
  const client = await import("../src/sync/relay-client.ts");
  relayError = () => client.RelayError;
  const relay = new FakeRelay();
  return { store, syncStore: sync.syncStore, actions, relay, client };
}

const spec = (name: string): AliasToken => ({
  name, type: "color", scopes: ["ALL_SCOPES"], description: "", flex: "free", values: { light: "brand-1/600", dark: "brand-1/600" },
});

function withSpecific(set: TokenSet, name: string): TokenSet {
  return upsertSpecific(set, spec(name));
}

describe("sync", () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("removing a specific adds a tombstone; recreating drops it; reset and importSet clear it", async () => {
    const { store } = await setup();
    store.replaceSet(withSpecific(store.get().set, "text/a"));
    store.replaceSet(withSpecific(store.get().set, "text/b"));
    store.removeSpecific("text/a");
    expect(store.get().removedSpecifics).toEqual(["text/a"]);
    expect(store.get().set.specific["text/a"]).toBeUndefined();
    expect(JSON.parse(localStorage.getItem(REMOVED_KEY)!)).toEqual(["text/a"]);
    store.replaceSet(withSpecific(store.get().set, "text/a"));
    expect(store.get().removedSpecifics).toEqual([]);
    store.removeSpecific("text/b");
    store.reset();
    expect(store.get().removedSpecifics).toEqual([]);
    store.replaceSet(withSpecific(store.get().set, "text/c"));
    store.removeSpecific("text/c");
    store.importSet(loadSeed());
    expect(store.get().removedSpecifics).toEqual([]);
    store.replaceSet(withSpecific(store.get().set, "text/d"));
    store.removeSpecific("text/d");
    store.clearTombstones(["text/d", "zzz"]);
    expect(store.get().removedSpecifics).toEqual([]);
  });

  it("loads persisted tombstones and survives a blocked localStorage", async () => {
    localStorage.setItem(REMOVED_KEY, JSON.stringify(["text/x"]));
    expect((await setup()).store.get().removedSpecifics).toEqual(["text/x"]);
    localStorage.setItem(REMOVED_KEY, "{broken");
    expect((await setup()).store.get().removedSpecifics).toEqual([]);
  });

  it("specific only in Figma never becomes a removal", async () => {
    const { store, syncStore, actions, relay } = await setup();
    const snap = withSpecific(store.get().set, "text/so-no-figma");
    relay.handler = () => reply("tokens-snapshot", { tokens: toDtcg(snap), warnings: ["w"] });
    actions.startSync(relay);
    relay.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(syncStore.get().banner?.diff.specific.added).toEqual(["text/so-no-figma"]);
    actions.keepDraft();
    expect(store.get().removedSpecifics).toEqual([]);
    expect(syncStore.get().banner).toBeNull();
    expect(syncStore.get().openingSnapshot).toBe("resolved");
    expect(syncStore.get().synced?.specific["text/so-no-figma"]).toBeDefined();
  });

  it("opening snapshot: no diff resolves silently; diff shows banner; no-collection resolves", async () => {
    // sem diff
    let t = await setup();
    t.relay.handler = (c) => { expect(c.type).toBe("get-tokens-snapshot"); expect(c.timeoutMs).toBe(15000); return reply("tokens-snapshot", { tokens: toDtcg(t.store.get().set), warnings: [] }); };
    t.actions.startSync(t.relay);
    expect(t.syncStore.get().openingSnapshot).toBe("pending");
    t.relay.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.syncStore.get()).toMatchObject({ openingSnapshot: "resolved", banner: null });
    expect(t.syncStore.get().synced).not.toBeNull();
    // com diff
    t = await setup();
    t.relay.handler = () => reply("tokens-snapshot", { tokens: toDtcg(setBaseValue(loadSeed(), "brand-1/600", "#16a34b")), warnings: [] });
    t.actions.startSync(t.relay);
    t.relay.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.syncStore.get().openingSnapshot).toBe("pending");
    expect(t.syncStore.get().banner?.diff.total).toBeGreaterThan(0);
    // no-collection
    t = await setup();
    t.relay.handler = () => fail("no-collection");
    t.actions.startSync(t.relay);
    t.relay.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.syncStore.get()).toMatchObject({ openingSnapshot: "resolved", banner: null, synced: null });
    // plugin desconectado
    t = await setup();
    t.actions.startSync(t.relay);
    t.relay.open({ plugin: "disconnected" });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.relay.calls).toHaveLength(0);
    expect(t.syncStore.get().openingSnapshot).toBe("resolved");
  });

  it("importFromFigma keeps local disabledGroups", async () => {
    const { store, syncStore, actions, relay } = await setup();
    actions.startSync(relay);
    const local = { ...store.get().set, disabledGroups: ["brand-2"] } as unknown as TokenSet;
    store.replaceSet(local);
    const snap = setBaseValue(loadSeed(), "brand-1/600", "#16a34b");
    actions.importFromFigma(snap);
    expect(store.get().set.disabledGroups).toEqual(local.disabledGroups);
    expect(store.get().set.base).toEqual(snap.base);
    expect(syncStore.get()).toMatchObject({ banner: null, openingSnapshot: "resolved" });
    expect(syncStore.get().synced).toBe(snap);
  });

  it("send ack updates synced from ack.tokens and clears sent tombstones", async () => {
    const { store, syncStore, actions, relay } = await setup();
    actions.startSync(relay);
    relay.open();
    store.replaceSet(withSpecific(withSpecific(store.get().set, "text/a"), "text/b"));
    store.removeSpecific("text/a");
    store.removeSpecific("text/b");
    const confirmed = setBaseValue(loadSeed(), "brand-1/600", "#16a34c");
    relay.handler = () => reply("ack", { for: "upsert-tokens", tokens: toDtcg(confirmed), warnings: [] });
    const p = actions.sendToFigma({ remove: ["text/a"] });
    expect(syncStore.get().sending).toBe(true);
    const res = await p;
    expect(res.kind).toBe("ack");
    const up = relay.calls.filter((c) => c.type === "upsert-tokens");
    expect(up[0]).toMatchObject({ timeoutMs: 35000 });
    expect((up[0]!.payload as { remove: unknown }).remove).toEqual({ specific: ["text/a"] });
    expect(store.get().removedSpecifics).toEqual(["text/b"]);
    expect(syncStore.get().synced?.base).toEqual(confirmed.base);
    expect(syncStore.get()).toMatchObject({ sending: false });
    expect(syncStore.get().result?.kind).toBe("ack");
  });

  it("plugin-offline error keeps tombstones and synced", async () => {
    const { store, syncStore, actions, relay } = await setup();
    actions.startSync(relay);
    relay.open();
    const before = syncStore.get().synced;
    store.replaceSet(withSpecific(store.get().set, "text/a"));
    store.removeSpecific("text/a");
    relay.handler = () => fail("plugin-offline");
    const res = await actions.sendToFigma({ remove: ["text/a"] });
    expect(res).toMatchObject({ kind: "error", error: { code: "plugin-offline" } });
    expect(store.get().removedSpecifics).toEqual(["text/a"]);
    expect(syncStore.get().synced).toBe(before);
    expect(syncStore.get().sending).toBe(false);
  });

  it("send while plugin offline returns queued immediately", async () => {
    const { actions, relay, syncStore } = await setup();
    actions.startSync(relay);
    relay.open({ plugin: "disconnected" });
    const res = await actions.sendToFigma({ remove: [] }); // handler nunca resolve
    expect(res).toEqual({ kind: "queued" });
    expect(relay.calls).toHaveLength(1);
    expect(syncStore.get()).toMatchObject({ sending: false, result: { kind: "queued" } });
  });

  it("timeout result after 35s", async () => {
    const { actions, relay } = await setup();
    actions.startSync(relay);
    relay.open();
    relay.handler = () => new Promise((_, rej) => setTimeout(() => rej(new (relayError())({ code: "timeout", message: "t" })), 35000));
    const p = actions.sendToFigma({ remove: [] });
    await vi.advanceTimersByTimeAsync(35000);
    expect(await p).toEqual({ kind: "timeout" });
  });

  it("auto-send debounces 2s, never removes, waits for opening snapshot and plugin", async () => {
    const { store, syncStore, actions, relay } = await setup();
    actions.startSync(relay);
    actions.setAutoSend(true);
    expect(localStorage.getItem("vortex-builder:auto-send:v1")).not.toBeNull();
    // snapshot pendente: socket aberto, resposta do snapshot só depois
    let resolveSnap!: (e: Envelope) => void;
    relay.handler = (c) => c.type === "get-tokens-snapshot"
      ? new Promise<Envelope>((r) => { resolveSnap = r; })
      : reply("ack", { for: "upsert-tokens", tokens: toDtcg(store.get().set), warnings: [] });
    relay.open();
    store.replaceSet(setBaseValue(store.get().set, "brand-1/600", "#16a34d"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(relay.calls.filter((c) => c.type === "upsert-tokens")).toHaveLength(0);
    resolveSnap({ id: "x", type: "tokens-snapshot", payload: { tokens: toDtcg(loadSeed()), warnings: [] } });
    await vi.advanceTimersByTimeAsync(0);
    expect(syncStore.get().openingSnapshot).toBe("pending"); // diff -> banner
    actions.keepDraft();
    await vi.advanceTimersByTimeAsync(0);
    expect(relay.calls.filter((c) => c.type === "upsert-tokens")).toHaveLength(1);
    // 3 edições em 1 s -> 1 request após 2 s
    relay.calls.length = 0;
    store.replaceSet(setBaseValue(store.get().set, "brand-1/600", "#16a341"));
    await vi.advanceTimersByTimeAsync(500);
    store.replaceSet(setBaseValue(store.get().set, "brand-1/600", "#16a342"));
    await vi.advanceTimersByTimeAsync(500);
    store.replaceSet(setBaseValue(store.get().set, "brand-1/600", "#16a343"));
    await vi.advanceTimersByTimeAsync(1999);
    expect(relay.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(relay.calls).toHaveLength(1);
    const payload = relay.calls[0]!.payload as { remove: { specific: string[] } };
    expect(payload.remove.specific).toEqual([]);
    // plugin offline: nada é enviado; ao voltar, envia
    relay.calls.length = 0;
    relay.open({ plugin: "disconnected" });
    store.replaceSet(setBaseValue(store.get().set, "brand-1/600", "#16a344"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(relay.calls).toHaveLength(0);
    relay.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(relay.calls.filter((c) => c.type === "upsert-tokens")).toHaveLength(1);
  });

  it("auto-send stays off when disabled", async () => {
    const { store, actions, relay } = await setup();
    actions.startSync(relay);
    relay.open({ plugin: "disconnected" });
    await vi.advanceTimersByTimeAsync(0);
    relay.open();
    store.replaceSet(setBaseValue(store.get().set, "brand-1/600", "#16a34d"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(relay.calls).toHaveLength(0);
  });

  it("lastTokens.at change refreshes synced via GET /tokens.json", async () => {
    const { syncStore, actions, relay } = await setup();
    const confirmed = setBaseValue(loadSeed(), "brand-1/600", "#16a34c");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => toDtcg(confirmed) }));
    vi.stubGlobal("fetch", fetchMock);
    actions.startSync(relay);
    relay.open({ plugin: "disconnected", lastTokens: { at: "t1" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).not.toHaveBeenCalled();
    relay.open({ plugin: "disconnected", lastTokens: { at: "t2" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("http://localhost:3055/tokens.json");
    expect(syncStore.get().synced?.base).toEqual(confirmed.base);
  });

  it("relayHttpUrl maps ws schemes", async () => {
    const { client } = await setup();
    expect(client.relayHttpUrl("ws://h:1")).toBe("http://h:1");
    expect(client.relayHttpUrl("wss://h")).toBe("https://h");
  });

  it("buildPayload includes DTCG, removals and the MUI module", async () => {
    const { actions } = await setup();
    const { toMuiModule } = await import("../src/export/mui-module.ts");
    const set = loadSeed();
    expect(actions.buildPayload(set, ["text/a"])).toEqual({ tokens: toDtcg(set), remove: { specific: ["text/a"] }, muiModule: toMuiModule(set) });
  });

  it("works with no relay (closed)", async () => {
    const { syncStore } = await setup();
    expect(syncStore.get().relay).toEqual({ socket: "closed", status: null });
    expect(removeSpecific).toBeTypeOf("function");
  });
});
