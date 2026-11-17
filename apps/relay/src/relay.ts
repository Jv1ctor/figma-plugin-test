import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import {
  envelope, makeId, parseEnvelope, validateTheme, ROLES,
  type AckPayload, type Envelope, type ErrorPayload, type Role, type StatusPayload, type Theme,
} from "@token-bridge/protocol";
import { c, consoleLogger, type Logger } from "./log.ts";

export interface RelayOptions {
  port?: number;
  host?: string;
  /** How long POST /theme and GET /snapshot wait for the plugin. */
  ackTimeoutMs?: number;
  log?: Logger;
}

type Client = WebSocket & { role?: Role; label?: string; alive?: boolean };

/** Where a reply from the plugin should go. */
type Origin =
  | { kind: "ws"; socket: Client }
  | { kind: "http"; resolve: (msg: Envelope) => void };

const PLUGIN_BOUND = new Set(["upsert-theme", "get-snapshot"]);
const PLUGIN_REPLIES = new Set(["ack", "error", "snapshot"]);

export function createRelay(opts: RelayOptions = {}) {
  const log = opts.log ?? consoleLogger;
  const ackTimeoutMs = opts.ackTimeoutMs ?? 5000;

  let plugin: Client | null = null;
  const others = new Set<Client>();
  const pending = new Map<string, { origin: Origin; type: string; sentAt: number }>();
  /** Only the latest theme matters: an older one would be overwritten anyway. */
  let queuedTheme: Envelope<"upsert-theme", Theme> | null = null;
  let lastApplied: StatusPayload["lastApplied"];
  /** Ids of themes delivered from the offline queue (their acks get `replayed: true`). */
  const replayed = new Set<string>();
  let seq = 0;

  const pluginOnline = () => plugin?.readyState === WebSocket.OPEN;

  const status = (): StatusPayload => ({
    plugin: pluginOnline() ? "connected" : "disconnected",
    queued: queuedTheme !== null,
    lastApplied,
  });

  const send = (socket: WebSocket, msg: Envelope) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
  };

  const broadcastStatus = () => {
    const msg = envelope("status", status());
    for (const s of others) if (s.role === "web") send(s, msg);
  };

  const describe = (msg: Envelope): string => {
    const p = msg.payload as Record<string, unknown> | undefined;
    switch (msg.type) {
      case "upsert-theme":
      case "snapshot":
        return `${c.bold(msg.type)} "${(p as unknown as Theme)?.name}"`;
      case "ack": {
        const a = p as unknown as AckPayload;
        const clamp = a.clamped.length ? c.yellow(` · ${a.clamped.length} clamped`) : "";
        return `${c.green("ack")} "${a.theme}" · ${a.created} criadas, ${a.updated} atualizadas, ${a.unchanged} iguais${clamp} · ${a.durationMs}ms`;
      }
      case "error":
        return `${c.red("error")} [${(p as unknown as ErrorPayload)?.code}] ${(p as unknown as ErrorPayload)?.message}`;
      default:
        return c.bold(msg.type);
    }
  };
  const shortId = (id: string) => c.dim(`#${id.slice(0, 8)}`);

  const replyError = (origin: Origin, id: string, error: ErrorPayload) => {
    const msg = envelope("error", error, id);
    if (origin.kind === "ws") send(origin.socket, msg);
    else origin.resolve(msg);
  };

  /** Route a web/agent/http request to the plugin (or queue it). */
  const forwardToPlugin = (msg: Envelope, origin: Origin, from: string): "sent" | "queued" | "rejected" => {
    if (msg.type === "upsert-theme") {
      const errors = validateTheme(msg.payload);
      if (errors.length) {
        log(from, `${describe(msg)} ${shortId(msg.id)} ${c.red("rejeitado")}: ${errors.join("; ")}`);
        replyError(origin, msg.id, { code: "invalid", message: errors.join("; ") });
        return "rejected";
      }
    }

    pending.set(msg.id, { origin, type: msg.type, sentAt: Date.now() });

    if (pluginOnline()) {
      log(from, `${describe(msg)} ${shortId(msg.id)} → plugin`);
      send(plugin!, msg);
      return "sent";
    }

    if (msg.type === "upsert-theme") {
      if (queuedTheme) {
        log("relay", `fila: descartando ${shortId(queuedTheme.id)} (substituído)`);
        const prev = pending.get(queuedTheme.id);
        pending.delete(queuedTheme.id);
        if (prev) replyError(prev.origin, queuedTheme.id, { code: "plugin-offline", message: "substituído por um tema mais novo antes do plugin reconectar" });
      }
      queuedTheme = msg as Envelope<"upsert-theme", Theme>;
      log(from, `${describe(msg)} ${shortId(msg.id)} ${c.yellow("→ fila (plugin offline)")}`);
      broadcastStatus();
      return "queued";
    }
    pending.delete(msg.id);
    log(from, `${describe(msg)} ${shortId(msg.id)} ${c.red("✗ plugin offline")}`);
    replyError(origin, msg.id, { code: "plugin-offline", message: "plugin do Figma não está conectado" });
    return "rejected";
  };

  const handlePluginReply = (msg: Envelope) => {
    const entry = pending.get(msg.id);
    pending.delete(msg.id);

    const fromQueue = replayed.delete(msg.id);
    if (fromQueue && msg.payload && typeof msg.payload === "object") (msg.payload as AckPayload).replayed = true;

    if (msg.type === "ack") {
      const ack = msg.payload as AckPayload;
      lastApplied = { name: ack.theme, at: new Date().toISOString() };
    }

    if (!entry) {
      const why = fromQueue ? "aplicado da fila; quem enviou já recebeu 202" : "origem desconhecida, descartado";
      log("plugin", `${describe(msg)} ${shortId(msg.id)} ${c.dim(`(${why})`)}`);
    } else if (entry.origin.kind === "ws") {
      const s = entry.origin.socket;
      const alive = s.readyState === WebSocket.OPEN;
      log("plugin", `${describe(msg)} ${shortId(msg.id)} → ${s.label}${alive ? "" : c.dim(" (desconectado)")}`);
      send(s, msg);
    } else {
      log("plugin", `${describe(msg)} ${shortId(msg.id)} → http`);
      entry.origin.resolve(msg);
    }

    if (msg.type === "ack") broadcastStatus();
  };

  const attachPlugin = (socket: Client) => {
    if (plugin && plugin !== socket && plugin.readyState === WebSocket.OPEN) {
      log("relay", c.yellow(`novo plugin conectou; fechando ${plugin.label}`));
      plugin.close(4000, "substituído por outra instância do plugin");
    }
    plugin = socket;
    broadcastStatus();
    if (queuedTheme) {
      const msg = queuedTheme;
      queuedTheme = null;
      log("relay", `reenviando tema da fila ${describe(msg)} ${shortId(msg.id)} → plugin`);
      replayed.add(msg.id);
      send(socket, msg);
      broadcastStatus();
    }
  };

  // ---------------------------------------------------------------- WebSocket

  const server = createServer((req, res) => void handleHttp(req, res));
  const wss = new WebSocketServer({ server });

  wss.on("connection", (socket: Client, req) => {
    socket.alive = true;
    socket.label = `conn${++seq}`;
    log("relay", c.dim(`${socket.label} conectou (${req.socket.remoteAddress}) — aguardando hello`));

    socket.on("pong", () => (socket.alive = true));

    socket.on("message", (data) => {
      let msg: Envelope;
      try {
        msg = parseEnvelope(data.toString());
      } catch (e) {
        log(socket.label!, c.red(`mensagem inválida: ${(e as Error).message}`));
        send(socket, envelope("error", { code: "invalid", message: (e as Error).message }));
        return;
      }

      if (msg.type === "hello") {
        const role = (msg.payload as { role?: Role })?.role;
        if (!role || !ROLES.includes(role)) {
          send(socket, envelope("error", { code: "invalid", message: `role inválido: ${role}` }, msg.id));
          return;
        }
        socket.role = role;
        socket.label = `${role}#${socket.label!.replace("conn", "")}`;
        log(role, c.green(`hello → ${socket.label}`));
        if (role === "plugin") {
          others.delete(socket);
          attachPlugin(socket);
        } else {
          others.add(socket);
          send(socket, envelope("status", status()));
        }
        return;
      }

      if (!socket.role) {
        send(socket, envelope("error", { code: "invalid", message: "envie hello { role } antes de qualquer mensagem" }, msg.id));
        return;
      }

      if (socket.role === "plugin") {
        if (PLUGIN_REPLIES.has(msg.type)) handlePluginReply(msg);
        else log("plugin", c.dim(`ignorado: ${msg.type}`));
        return;
      }

      if (PLUGIN_BOUND.has(msg.type)) forwardToPlugin(msg, { kind: "ws", socket }, socket.role);
      else if (msg.type === "status") send(socket, envelope("status", status(), msg.id));
      else send(socket, envelope("error", { code: "invalid", message: `tipo não suportado: ${msg.type}` }, msg.id));
    });

    socket.on("close", (code) => {
      log(socket.role ?? "relay", c.dim(`${socket.label} desconectou (${code})`));
      others.delete(socket);
      if (plugin === socket) {
        plugin = null;
        // In-flight requests will never be answered by this plugin instance.
        for (const [id, entry] of pending) {
          if (queuedTheme?.id === id) continue;
          pending.delete(id);
          replyError(entry.origin, id, { code: "plugin-offline", message: "plugin desconectou antes de responder" });
        }
        broadcastStatus();
      }
    });
  });

  // Drop sockets that stopped answering pings (e.g. Figma closed without a FIN).
  const heartbeat = setInterval(() => {
    for (const s of wss.clients as Set<Client>) {
      if (!s.alive) {
        s.terminate();
        continue;
      }
      s.alive = false;
      s.ping();
    }
  }, 15_000);

  // --------------------------------------------------------------------- HTTP

  const json = (res: ServerResponse, code: number, body: unknown) => {
    res.writeHead(code, {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    });
    res.end(JSON.stringify(body, null, 2) + "\n");
  };

  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolve, reject) => {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1_000_000) reject(new Error("body muito grande"));
      });
      req.on("end", () => resolve(body));
      req.on("error", reject);
    });

  /**
   * Send to plugin and wait for its reply (or timeout). If the plugin is offline the
   * theme is queued and we return right away: no point holding the caller for 5s.
   */
  const requestPlugin = (msg: Envelope) =>
    new Promise<{ msg: Envelope | null; queued: boolean }>((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(msg.id);
        log("http", c.yellow(`timeout ${ackTimeoutMs}ms ${shortId(msg.id)}`));
        resolve({ msg: null, queued: false });
      }, ackTimeoutMs);
      const outcome = forwardToPlugin(
        msg,
        { kind: "http", resolve: (reply) => (clearTimeout(timer), resolve({ msg: reply, queued: false })) },
        "http",
      );
      if (outcome === "queued") {
        clearTimeout(timer);
        // Keep the theme queued, but nobody is listening for its ack any more.
        pending.delete(msg.id);
        resolve({ msg: null, queued: true });
      }
    });

  async function handleHttp(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      });
      return res.end();
    }

    if (req.method === "GET" && url.pathname === "/status") return json(res, 200, status());

    if (req.method === "POST" && url.pathname === "/theme") {
      let theme: unknown;
      try {
        theme = JSON.parse(await readBody(req));
      } catch (e) {
        return json(res, 400, { type: "error", payload: { code: "invalid", message: `JSON inválido: ${(e as Error).message}` } });
      }
      const { msg, queued } = await requestPlugin(envelope("upsert-theme", theme as Theme, makeId()));
      if (!msg) {
        return json(res, queued ? 202 : 504, {
          type: "error",
          payload: queued
            ? { code: "plugin-offline", message: `plugin offline; tema na fila e será aplicado quando o plugin reconectar` }
            : { code: "timeout", message: `plugin não respondeu em ${ackTimeoutMs}ms` },
        });
      }
      const code = msg.type === "ack" ? 200 : (msg.payload as ErrorPayload).code === "invalid" ? 400 : 502;
      return json(res, code, msg);
    }

    if (req.method === "GET" && url.pathname === "/snapshot") {
      const { msg } = await requestPlugin(envelope("get-snapshot", undefined, makeId()));
      if (!msg) return json(res, 504, { type: "error", payload: { code: "timeout", message: `plugin não respondeu em ${ackTimeoutMs}ms` } });
      return json(res, msg.type === "snapshot" ? 200 : 502, msg);
    }

    json(res, 404, { error: "rotas: POST /theme · GET /snapshot · GET /status · WS /" });
  }

  return {
    listen: () =>
      new Promise<number>((resolve, reject) => {
        server.once("error", reject);
        server.listen(opts.port ?? 3055, opts.host ?? process.env.HOST ?? "127.0.0.1", () => {
          const addr = server.address();
          resolve(typeof addr === "object" && addr ? addr.port : (opts.port ?? 3055));
        });
      }),
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(heartbeat);
        for (const s of wss.clients) s.terminate();
        wss.close();
        server.close(() => resolve());
      }),
    status,
  };
}
