import { envelope, type Envelope, type ErrorPayload, type MessageType, type StatusPayload } from "@token-bridge/protocol";

export const RELAY_URL = (import.meta.env.VITE_RELAY_URL as string | undefined) ?? "ws://localhost:3055";

/** `ws:` -> `http:`, `wss:` -> `https:` (o relay serve HTTP na mesma porta). */
export function relayHttpUrl(ws: string): string {
  return ws.replace(/^ws(s?):/, "http$1:");
}

export interface RelayState {
  socket: "connecting" | "open" | "closed";
  status: StatusPayload | null;
}

export interface RelayPort {
  readonly state: RelayState;
  subscribe(fn: () => void): () => void;
  request(type: MessageType, payload?: unknown, timeoutMs?: number): Promise<Envelope>;
}

export class RelayError extends Error {
  constructor(readonly payload: ErrorPayload) {
    super(payload.message);
  }
}

interface Pending { resolve: (m: Envelope) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }

/** Cliente WebSocket do relay: reconecta com backoff e casa request/response por id. */
class RelayClient implements RelayPort {
  private ws: WebSocket | null = null;
  private backoff = 500;
  private listeners = new Set<() => void>();
  private pending = new Map<string, Pending>();
  state: RelayState = { socket: "connecting", status: null };

  constructor(private url: string) {
    this.connect();
  }

  private set(patch: Partial<RelayState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  private connect(): void {
    this.set({ socket: "connecting" });
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = 500;
      ws.send(JSON.stringify(envelope("hello", { role: "web" })));
      this.set({ socket: "open" });
    };
    ws.onmessage = (ev) => {
      let msg: Envelope;
      try {
        msg = JSON.parse(String(ev.data)) as Envelope;
      } catch {
        return; // quadro inválido: ignora
      }
      if (msg.type === "status") this.set({ status: msg.payload as StatusPayload });
      const p = this.pending.get(msg.id);
      if (!p || msg.type === "status") return;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.type === "error") p.reject(new RelayError(msg.payload as ErrorPayload));
      else p.resolve(msg);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.set({ socket: "closed", status: null });
      for (const [id, p] of this.pending) {
        clearTimeout(p.timer);
        p.reject(new RelayError({ code: "unknown", message: "conexão com o relay caiu" }));
        this.pending.delete(id);
      }
      setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, 8000);
    };
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  request(type: MessageType, payload?: unknown, timeoutMs = 6000): Promise<Envelope> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new RelayError({ code: "unknown", message: "relay desconectado (pnpm dev está rodando?)" }));
    }
    const msg = envelope(type as never, payload as never) as Envelope;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(msg.id);
        reject(new RelayError({ code: "timeout", message: `sem resposta em ${timeoutMs / 1000}s` }));
      }, timeoutMs);
      this.pending.set(msg.id, { resolve, reject, timer });
      ws.send(JSON.stringify(msg));
    });
  }
}

export function createRelayClient(url: string): RelayPort {
  return new RelayClient(url);
}
