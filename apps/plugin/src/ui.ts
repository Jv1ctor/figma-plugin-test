/**
 * Plugin UI iframe: the only place with network access. It's a dumb bridge
 * WebSocket ⇄ postMessage plus a tiny status display. No figma.* here.
 */
import { envelope, type AckPayload, type TokensAckPayload, type Envelope, type ErrorPayload } from "@token-bridge/protocol/messages";

const RELAY_URL = "ws://localhost:3055";
const BACKOFF_MIN = 500;
const BACKOFF_MAX = 10_000;

const $ = (id: string) => document.getElementById(id)!;
const dot = $("dot");
const conn = $("conn");
const themeEl = $("theme");
const whenEl = $("when");
const detail = $("detail");

let ws: WebSocket | null = null;
let backoff = BACKOFF_MIN;
let countdown: ReturnType<typeof setInterval> | undefined;

function setConn(state: "on" | "wait" | "off", text: string) {
  dot.className = `dot ${state}`;
  conn.textContent = text;
}

function connect() {
  clearInterval(countdown);
  setConn("wait", "Conectando ao relay…");
  const socket = new WebSocket(RELAY_URL);
  ws = socket;

  socket.onopen = () => {
    backoff = BACKOFF_MIN;
    socket.send(JSON.stringify(envelope("hello", { role: "plugin" })));
    setConn("on", "Conectado · localhost:3055");
  };

  socket.onmessage = (ev) => {
    let msg: Envelope;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    if (msg.type === "upsert-theme" || msg.type === "get-snapshot" || msg.type === "upsert-tokens" || msg.type === "get-tokens-snapshot") {
      if (msg.type === "upsert-theme" || msg.type === "upsert-tokens") detail.textContent = "aplicando…";
      parent.postMessage({ pluginMessage: msg }, "*");
    }
  };

  socket.onclose = (ev) => {
    if (ws !== socket) return;
    ws = null;
    if (ev.code === 4000) {
      // The relay replaced us with another plugin instance: don't fight it.
      setConn("off", "Outra instância do plugin assumiu");
      return;
    }
    scheduleReconnect();
  };
  // onerror is always followed by onclose; nothing to do here.
  socket.onerror = () => {};
}

function scheduleReconnect() {
  const delay = backoff;
  backoff = Math.min(backoff * 2, BACKOFF_MAX);
  let left = Math.ceil(delay / 1000);
  setConn("off", `Desconectado · nova tentativa em ${left}s`);
  countdown = setInterval(() => {
    left -= 1;
    if (left > 0) setConn("off", `Desconectado · nova tentativa em ${left}s`);
  }, 1000);
  setTimeout(connect, delay);
}

const time = () => new Date().toLocaleTimeString("pt-BR", { hour12: false });

// Replies from the main thread go straight back to the relay.
window.onmessage = (ev: MessageEvent) => {
  const msg = ev.data?.pluginMessage as Envelope | undefined;
  if (!msg) return;

  if (msg.type === "ack" && (msg.payload as { for?: string }).for === "upsert-tokens") {
    const a = msg.payload as TokensAckPayload;
    themeEl.textContent = "Vortex";
    whenEl.textContent = `${time()} · ${a.durationMs}ms`;
    const v = a.variables;
    const n = a.warnings.length;
    detail.className = `ellipsis mono ${n ? "warn" : "muted"}`;
    detail.textContent = `${v.created} criadas · ${v.updated} atualiz. · ${v.unchanged} iguais` + (n ? ` · ${n} avisos` : "");
    detail.title = a.warnings.join("\n");
  } else if (msg.type === "ack") {
    const a = msg.payload as AckPayload;
    themeEl.textContent = a.theme;
    whenEl.textContent = `${time()} · ${a.durationMs}ms`;
    const parts = [`${a.created} criadas`, `${a.updated} atualiz.`, `${a.unchanged} iguais`];
    detail.className = `ellipsis mono ${a.clamped.length ? "warn" : "muted"}`;
    detail.textContent = parts.join(" · ") + (a.clamped.length ? ` · ${a.clamped.length} clamp` : "");
    detail.title = a.clamped.map((c) => `${c.mode}.${c.token}`).join(", ");
  } else if (msg.type === "error") {
    const e = msg.payload as ErrorPayload;
    detail.className = "ellipsis mono err";
    detail.textContent = `erro: ${e.message}`;
    detail.title = e.message;
  }

  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

connect();
