import { MODES, TOKENS, type Theme, type ThemeMode, type Token } from "./theme.ts";

export type Role = "plugin" | "web" | "agent";
export const ROLES: readonly Role[] = ["plugin", "web", "agent"];

export interface Envelope<T extends string = string, P = unknown> {
  id: string;
  type: T;
  payload?: P;
}

export interface HelloPayload {
  role: Role;
}

export interface StatusPayload {
  plugin: "connected" | "disconnected";
  /** An upsert-theme is waiting for the plugin to come back. */
  queued: boolean;
  /** An upsert-tokens is waiting for the plugin to come back. */
  tokensQueued: boolean;
  lastApplied?: { name: string; at: string };
  lastTokens?: { at: string };
}

/** A W3C DTCG token document. Declared locally so protocol does not depend on @token-bridge/tokens. */
export type DtcgDocument = Record<string, unknown>;

export interface ClampedToken {
  token: Token | "radius";
  mode: ThemeMode;
  from: string;
}

export interface AckPayload {
  /** Which request this acknowledges. */
  for: "upsert-theme";
  theme: string;
  created: number;
  updated: number;
  unchanged: number;
  clamped: ClampedToken[];
  /** True when the relay delivered this from its offline queue. */
  replayed?: boolean;
  durationMs: number;
}

export interface UpsertTokensPayload {
  tokens: DtcgDocument;
  remove?: { specific: string[] };
  muiModule?: string;
}

export interface TokensSnapshotPayload {
  tokens: DtcgDocument;
  warnings: string[];
}

export interface TokensAckPayload {
  /** Which request this acknowledges. */
  for: "upsert-tokens";
  variables: { created: number; updated: number; unchanged: number; removed: number };
  styles: { created: number; updated: number; unchanged: number };
  warnings: string[];
  /** Re-read from Figma after writing (ack.tokens), never the payload that was sent. */
  tokens: DtcgDocument;
  /** True when the relay delivered this from its offline queue. */
  replayed?: boolean;
  durationMs: number;
}

export type AnyAckPayload = AckPayload | TokensAckPayload;

export interface ErrorPayload {
  code: "plugin-offline" | "timeout" | "invalid" | "mode-limit" | "figma" | "no-collection" | "unknown";
  message: string;
}

export type Message =
  | Envelope<"hello", HelloPayload>
  | Envelope<"status", StatusPayload>
  | Envelope<"upsert-theme", Theme>
  | Envelope<"get-snapshot", undefined>
  | Envelope<"snapshot", Theme>
  | Envelope<"upsert-tokens", UpsertTokensPayload>
  | Envelope<"get-tokens-snapshot", undefined>
  | Envelope<"tokens-snapshot", TokensSnapshotPayload>
  | Envelope<"ack", AnyAckPayload>
  | Envelope<"error", ErrorPayload>;

export type MessageType = Message["type"];

export function makeId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  return g.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function envelope<M extends Message>(type: M["type"], payload?: M["payload"], id = makeId()): M {
  return { id, type, payload } as M;
}

export function parseEnvelope(raw: string): Envelope {
  const data = JSON.parse(raw) as Envelope;
  if (!data || typeof data !== "object" || typeof data.id !== "string" || typeof data.type !== "string") {
    throw new Error("envelope inválido: esperado { id: string, type: string, payload? }");
  }
  return data;
}

/** Returns a list of human-readable problems; empty means valid. */
export function validateTheme(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return ["tema deve ser um objeto"];
  const t = input as Partial<Theme>;
  if (typeof t.name !== "string" || !t.name.trim()) errors.push("name: string obrigatória");
  if (typeof t.radius !== "number" || !Number.isFinite(t.radius) || t.radius < 0) {
    errors.push("radius: número >= 0 (rem)");
  }
  for (const mode of MODES) {
    const values = t[mode];
    if (!values || typeof values !== "object") {
      errors.push(`${mode}: objeto Record<Token, string> obrigatório`);
      continue;
    }
    const missing = TOKENS.filter((tok) => typeof (values as Record<string, unknown>)[tok] !== "string");
    if (missing.length) errors.push(`${mode}: tokens ausentes: ${missing.join(", ")}`);
    const unknown = Object.keys(values).filter((k) => !(TOKENS as readonly string[]).includes(k));
    if (unknown.length) errors.push(`${mode}: tokens desconhecidos: ${unknown.join(", ")}`);
  }
  return errors;
}

/** Returns a list of human-readable problems; empty means valid. */
export function validateUpsertTokensShape(input: unknown): string[] {
  if (!input || typeof input !== "object") return ["payload deve ser um objeto"];
  const p = input as Partial<UpsertTokensPayload>;
  const errors: string[] = [];
  if (!p.tokens || typeof p.tokens !== "object" || Array.isArray(p.tokens)) errors.push("tokens: objeto DTCG obrigatório");
  if (p.remove !== undefined) {
    const specific = (p.remove as Partial<{ specific: unknown }> | null)?.specific;
    if (!Array.isArray(specific) || specific.some((n) => typeof n !== "string")) errors.push("remove.specific: lista de strings");
  }
  if (p.muiModule !== undefined && typeof p.muiModule !== "string") errors.push("muiModule: string");
  return errors;
}
