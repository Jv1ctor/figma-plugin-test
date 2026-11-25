import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import {
  buildTheme, envelope, type Envelope, type Role, type TokensAckPayload, type UpsertTokensPayload,
} from "@token-bridge/protocol";
import { loadSeed, toDtcg } from "@token-bridge/tokens";
import { createRelay } from "../src/relay.ts";
import { silentLogger } from "../src/log.ts";

const theme = buildTheme({ base: "zinc", primary: "blue", radius: 0.5 });
const fullDoc = toDtcg(loadSeed()) as Record<string, any>;
/** The same document minus one top-level group (so ack differs from payload). */
const smallerDoc = (() => {
  const d = structuredClone(fullDoc);
  const k = Object.keys(d).filter((x) => !x.startsWith("$")).pop()!;
  delete d[k];
  return d;
})();

async function connect(port: number, role: Role) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const inbox: Envelope[] = [];
  const waiters: Array<{ pred: (m: Envelope) => boolean; resolve: (m: Envelope) => void }> = [];
  ws.on("message", (d) => {
    const m = JSON.parse(d.toString()) as Envelope;
    inbox.push(m);
    for (const w of [...waiters]) if (w.pred(m)) waiters.splice(waiters.indexOf(w), 1), w.resolve(m);
  });
  await new Promise((r) => ws.once("open", r));
  ws.send(JSON.stringify(envelope("hello", { role })));
  const next = (pred: (m: Envelope) => boolean, ms = 2000) =>
    new Promise<Envelope>((resolve, reject) => {
      const hit = inbox.find(pred);
      if (hit) return inbox.splice(inbox.indexOf(hit), 1), resolve(hit);
      const t = setTimeout(() => reject(new Error("timeout esperando mensagem")), ms);
      waiters.push({ pred, resolve: (m) => (clearTimeout(t), inbox.splice(inbox.indexOf(m), 1), resolve(m)) });
    });
  return { ws, inbox, next, send: (m: Envelope) => ws.send(JSON.stringify(m)), close: () => ws.close() };
}

/** Fake plugin: acks upsert-tokens with the received doc minus one token. */
async function fakePlugin(port: number) {
  const p = await connect(port, "plugin");
  const received: Envelope[] = [];
  p.ws.on("message", (d) => {
    const m = JSON.parse(d.toString()) as Envelope<string, any>;
    received.push(m);
    if (m.type === "upsert-tokens") {
      const ack: TokensAckPayload = {
        for: "upsert-tokens",
        variables: { created: 1, updated: 2, unchanged: 3, removed: 0 },
        styles: { created: 0, updated: 0, unchanged: 0 },
        warnings: [],
        tokens: smallerDoc,
        durationMs: 1,
      };
      p.send({ id: m.id, type: "ack", payload: ack });
    }
    if (m.type === "get-tokens-snapshot") p.send({ id: m.id, type: "tokens-snapshot", payload: { tokens: smallerDoc, warnings: [] } });
  });
  return { ...p, received };
}

let relay: ReturnType<typeof createRelay>;
let port: number;
let dataDir: string;
const start = async (dir = dataDir) => {
  relay = createRelay({ port: 0, ackTimeoutMs: 300, log: silentLogger, dataDir: dir });
  port = await relay.listen();
};
beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "relay-data-"));
  await start();
});
afterEach(() => relay.close());

const status = (m: Envelope) => m.type === "status";
const payload = (muiModule?: string): UpsertTokensPayload => ({ tokens: fullDoc, ...(muiModule ? { muiModule } : {}) });
const lastFile = () => join(dataDir, "last-tokens.json");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const get = (path: string) => fetch(`http://127.0.0.1:${port}${path}`);

describe("tokens", () => {
  it("routes upsert-tokens to the plugin without muiModule", async () => {
    const plugin = await fakePlugin(port);
    const web = await connect(port, "web");
    const req = envelope("upsert-tokens", payload("export const x = 1;"));
    web.send(req);
    const ack = await web.next((m) => m.type === "ack");
    expect(ack.id).toBe(req.id);
    const got = plugin.received.find((m) => m.id === req.id)!;
    expect(got.payload).toHaveProperty("tokens");
    expect(got.payload).not.toHaveProperty("muiModule");
    plugin.close(), web.close();
  });

  it("rejects invalid DTCG with invalid", async () => {
    const plugin = await fakePlugin(port);
    const web = await connect(port, "web");
    web.send(envelope("upsert-tokens", { tokens: { foo: { $type: "color", $value: "nope" } } } as any));
    const err = await web.next((m) => m.type === "error");
    expect(err.payload).toMatchObject({ code: "invalid" });
    web.send(envelope("upsert-tokens", {} as any));
    expect((await web.next((m) => m.type === "error")).payload).toMatchObject({ code: "invalid" });
    expect(plugin.received.some((m) => m.type === "upsert-tokens")).toBe(false);
    plugin.close(), web.close();
  });

  it("persists ack.tokens, not the sent payload", async () => {
    const plugin = await fakePlugin(port);
    const web = await connect(port, "web");
    web.send(envelope("upsert-tokens", payload("export const mui = 1;")));
    await web.next((m) => m.type === "ack");
    const saved = JSON.parse(readFileSync(lastFile(), "utf8"));
    expect(saved.tokens).toEqual(smallerDoc);
    expect(saved.tokens).not.toEqual(fullDoc);
    expect(saved.muiModule).toBe("export const mui = 1;");
    expect(typeof saved.at).toBe("string");
    plugin.close(), web.close();
  });

  it("persists a late ack whose sender disconnected", async () => {
    const plugin = await connect(port, "plugin");
    const web = await connect(port, "web");
    const req = envelope("upsert-tokens", payload("late-mui"));
    web.send(req);
    await plugin.next((m) => m.type === "upsert-tokens");
    web.close();
    await wait(100);
    const ack: TokensAckPayload = {
      for: "upsert-tokens", variables: { created: 0, updated: 0, unchanged: 1, removed: 0 },
      styles: { created: 0, updated: 0, unchanged: 0 }, warnings: [], tokens: smallerDoc, durationMs: 1,
    };
    plugin.send({ id: req.id, type: "ack", payload: ack });
    await wait(150);
    expect(existsSync(lastFile())).toBe(true);
    expect(JSON.parse(readFileSync(lastFile(), "utf8")).muiModule).toBe("late-mui");
    plugin.close();
  });

  it("an ack or snapshot without a tokens object persists nothing and does not crash", async () => {
    const plugin = await connect(port, "plugin");
    const web = await connect(port, "web");
    const req = envelope("upsert-tokens", payload());
    web.send(req);
    await plugin.next((m) => m.type === "upsert-tokens");
    plugin.send({ id: req.id, type: "ack", payload: { for: "upsert-tokens", variables: {}, styles: {}, warnings: [], durationMs: 1 } as any });
    await wait(150);
    const req2 = envelope("get-tokens-snapshot", undefined as any);
    web.send(req2);
    await plugin.next((m) => m.type === "get-tokens-snapshot");
    plugin.send({ id: req2.id, type: "tokens-snapshot", payload: { tokens: null, warnings: [] } as any });
    await wait(150);
    expect(existsSync(lastFile())).toBe(false);
    expect((await get("/tokens.json")).status).toBe(404);
    plugin.close(), web.close();
  });

  it("queues tokens offline independently of themes", async () => {
    const web = await connect(port, "web");
    await web.next(status);
    web.send(envelope("upsert-theme", theme));
    const t1 = await web.next((m) => m.type === "status" && (m.payload as any).queued === true);
    expect(t1.payload).toMatchObject({ queued: true, tokensQueued: false });
    web.send(envelope("upsert-tokens", payload()));
    const s2 = await web.next((m) => m.type === "status" && (m.payload as any).tokensQueued === true);
    expect(s2.payload).toMatchObject({ queued: true, tokensQueued: true });

    const plugin = await fakePlugin(port);
    await web.next((m) => m.type === "status" && (m.payload as any).tokensQueued === false && (m.payload as any).plugin === "connected");
    await wait(100);
    const types = plugin.received.map((m) => m.type);
    expect(types).toContain("upsert-theme");
    expect(types).toContain("upsert-tokens");
    const ack = await web.next((m) => m.type === "ack" && (m.payload as any).for === "upsert-tokens");
    expect((ack.payload as any).replayed).toBe(true);
    plugin.close(), web.close();
  });

  it("a newer queued tokens upsert replaces the older and notifies its sender", async () => {
    const a = await connect(port, "web");
    const b = await connect(port, "web");
    a.send(envelope("upsert-tokens", payload()));
    await a.next((m) => m.type === "status" && (m.payload as any).tokensQueued === true);
    b.send(envelope("upsert-tokens", payload()));
    const err = await a.next((m) => m.type === "error");
    expect(err.payload).toMatchObject({ code: "plugin-offline" });
    a.close(), b.close();
  });

  it("tokens-snapshot persists and keeps previous muiModule", async () => {
    const plugin = await fakePlugin(port);
    const web = await connect(port, "web");
    web.send(envelope("upsert-tokens", payload("keep-me")));
    await web.next((m) => m.type === "ack");
    web.send(envelope("get-tokens-snapshot", undefined));
    const snap = await web.next((m) => m.type === "tokens-snapshot");
    expect((snap.payload as any).tokens).toEqual(smallerDoc);
    const saved = JSON.parse(readFileSync(lastFile(), "utf8"));
    expect(saved.muiModule).toBe("keep-me");
    expect(saved.tokens).toEqual(smallerDoc);
    plugin.close(), web.close();
  });

  it("GET routes serve 4 formats; 404 before first ack", async () => {
    for (const p of ["/tokens.json", "/tokens.css", "/tokens.tailwind.css", "/tokens.mui.ts"]) {
      const r = await get(p);
      expect(r.status).toBe(404);
      expect(await r.json()).toEqual({ error: "nenhum token confirmado pelo Figma ainda" });
    }
    const plugin = await fakePlugin(port);
    const web = await connect(port, "web");
    web.send(envelope("upsert-tokens", payload("export const theme = 'mui';")));
    await web.next((m) => m.type === "ack");

    const json = await get("/tokens.json");
    expect(json.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(json.headers.get("access-control-allow-origin")).toBe("*");
    expect(await json.json()).toEqual(smallerDoc);

    const css = await get("/tokens.css");
    expect(css.headers.get("content-type")).toBe("text/css; charset=utf-8");
    expect(await css.text()).toContain("--vx-text-primary");

    const tw = await get("/tokens.tailwind.css");
    expect(tw.headers.get("content-type")).toBe("text/css; charset=utf-8");
    expect(await tw.text()).toContain("@theme");

    const mui = await get("/tokens.mui.ts");
    expect(mui.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await mui.text()).toBe("export const theme = 'mui';");
    plugin.close(), web.close();
  });

  it("tokens.mui.ts is 404 when no muiModule was sent", async () => {
    const plugin = await fakePlugin(port);
    const web = await connect(port, "web");
    web.send(envelope("upsert-tokens", payload()));
    await web.next((m) => m.type === "ack");
    const r = await get("/tokens.mui.ts");
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: "módulo MUI não enviado" });
    plugin.close(), web.close();
  });

  it("boot reloads last-tokens.json", async () => {
    writeFileSync(lastFile(), JSON.stringify({ at: "2026-01-01T00:00:00.000Z", tokens: smallerDoc, muiModule: "m" }));
    await relay.close();
    await start();
    expect(await (await get("/tokens.json")).json()).toEqual(smallerDoc);
    expect(await (await get("/status")).json()).toMatchObject({ lastTokens: { at: "2026-01-01T00:00:00.000Z" } });
  });

  it("boot tolerates a corrupted file", async () => {
    writeFileSync(lastFile(), "{not json");
    await relay.close();
    await start();
    expect((await get("/tokens.json")).status).toBe(404);
  });
});
