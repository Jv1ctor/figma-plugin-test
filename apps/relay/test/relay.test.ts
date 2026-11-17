import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { buildTheme, envelope, type AckPayload, type Envelope, type Role, type Theme } from "@token-bridge/protocol";
import { createRelay } from "../src/relay.ts";
import { silentLogger } from "../src/log.ts";

const theme = buildTheme({ base: "zinc", primary: "blue", radius: 0.5 });

/** Minimal client that records every message it gets. */
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

/** A fake plugin that acks every upsert. */
async function fakePlugin(port: number) {
  const p = await connect(port, "plugin");
  const received: Envelope[] = [];
  p.ws.on("message", (d) => {
    const m = JSON.parse(d.toString()) as Envelope<string, Theme>;
    received.push(m);
    if (m.type === "upsert-theme") {
      const ack: AckPayload = { for: "upsert-theme", theme: m.payload!.name, created: 0, updated: 63, unchanged: 0, clamped: [], durationMs: 1 };
      p.send({ id: m.id, type: "ack", payload: ack });
    }
    if (m.type === "get-snapshot") p.send({ id: m.id, type: "snapshot", payload: theme });
  });
  return { ...p, received };
}

let relay: ReturnType<typeof createRelay>;
let port: number;
beforeEach(async () => {
  relay = createRelay({ port: 0, ackTimeoutMs: 300, log: silentLogger });
  port = await relay.listen();
});
afterEach(() => relay.close());

const status = (m: Envelope) => m.type === "status";

describe("relay", () => {
  it("tells web clients whether the plugin is connected", async () => {
    const web = await connect(port, "web");
    expect((await web.next(status)).payload).toMatchObject({ plugin: "disconnected" });
    const plugin = await fakePlugin(port);
    expect((await web.next(status)).payload).toMatchObject({ plugin: "connected" });
    plugin.close();
    expect((await web.next(status)).payload).toMatchObject({ plugin: "disconnected" });
    web.close();
  });

  it("routes upsert-theme web → plugin and the ack back with the same id", async () => {
    const plugin = await fakePlugin(port);
    const web = await connect(port, "web");
    const req = envelope("upsert-theme", theme);
    web.send(req);
    const ack = await web.next((m) => m.type === "ack");
    expect(ack.id).toBe(req.id);
    expect(plugin.received.some((m) => m.id === req.id)).toBe(true);
    plugin.close(), web.close();
  });

  it("routes get-snapshot and errors immediately when the plugin is offline", async () => {
    const web = await connect(port, "web");
    const req = envelope("get-snapshot");
    web.send(req);
    expect(await web.next((m) => m.id === req.id)).toMatchObject({ type: "error", payload: { code: "plugin-offline" } });
    const plugin = await fakePlugin(port);
    const req2 = envelope("get-snapshot");
    web.send(req2);
    expect(await web.next((m) => m.id === req2.id)).toMatchObject({ type: "snapshot", payload: { name: theme.name } });
    plugin.close(), web.close();
  });

  it("queues only the last upsert while offline and replays it on reconnect", async () => {
    const web = await connect(port, "web");
    const first = envelope("upsert-theme", { ...theme, name: "first" });
    const last = envelope("upsert-theme", { ...theme, name: "last" });
    web.send(first);
    web.send(last);
    // The superseded one is answered with an error so the sender isn't left hanging.
    expect(await web.next((m) => m.id === first.id)).toMatchObject({ type: "error", payload: { code: "plugin-offline" } });
    expect(relay.status().queued).toBe(true);

    const plugin = await fakePlugin(port);
    const ack = await web.next((m) => m.type === "ack");
    expect(ack.id).toBe(last.id);
    expect((ack.payload as AckPayload).theme).toBe("last");
    expect((ack.payload as AckPayload).replayed).toBe(true);
    expect(plugin.received.filter((m) => m.type === "upsert-theme").map((m) => m.id)).toEqual([last.id]);
    expect(relay.status()).toMatchObject({ queued: false, lastApplied: { name: "last" } });
    plugin.close(), web.close();
  });

  it("rejects invalid themes before they reach the plugin", async () => {
    const plugin = await fakePlugin(port);
    const agent = await connect(port, "agent");
    const req = envelope("upsert-theme", { name: "broken" } as unknown as Theme);
    agent.send(req);
    expect(await agent.next((m) => m.id === req.id)).toMatchObject({ type: "error", payload: { code: "invalid" } });
    expect(plugin.received.some((m) => m.type === "upsert-theme")).toBe(false);
    plugin.close(), agent.close();
  });

  it("requires hello before anything else", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((r) => ws.once("open", r));
    const reply = new Promise<Envelope>((r) => ws.once("message", (d) => r(JSON.parse(d.toString()))));
    ws.send(JSON.stringify(envelope("upsert-theme", theme)));
    expect(await reply).toMatchObject({ type: "error", payload: { code: "invalid" } });
    ws.close();
  });

  describe("HTTP", () => {
    const post = (body: unknown) =>
      fetch(`http://127.0.0.1:${port}/theme`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

    it("POST /theme → 200 with the plugin ack", async () => {
      const plugin = await fakePlugin(port);
      const res = await post(theme);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ type: "ack", payload: { theme: theme.name, updated: 63 } });
      plugin.close();
    });

    it("POST /theme → 202 immediately when offline, applied on reconnect", async () => {
      const t0 = Date.now();
      const res = await post(theme);
      expect(res.status).toBe(202);
      expect(Date.now() - t0).toBeLessThan(250);
      const plugin = await fakePlugin(port);
      await new Promise((r) => setTimeout(r, 50));
      expect(plugin.received.filter((m) => m.type === "upsert-theme")).toHaveLength(1);
      plugin.close();
    });

    it("POST /theme → 504 when the plugin never answers", async () => {
      const silent = await connect(port, "plugin");
      const res = await post(theme);
      expect(res.status).toBe(504);
      silent.close();
    });

    it("POST /theme → 400 on invalid JSON or schema", async () => {
      expect((await post("{nope")).status).toBe(400);
      const plugin = await fakePlugin(port);
      expect((await post({ name: "x" })).status).toBe(400);
      plugin.close();
    });

    it("GET /snapshot proxies the plugin snapshot", async () => {
      const plugin = await fakePlugin(port);
      const res = await fetch(`http://127.0.0.1:${port}/snapshot`);
      expect(await res.json()).toMatchObject({ type: "snapshot", payload: { name: theme.name } });
      plugin.close();
    });
  });
});
