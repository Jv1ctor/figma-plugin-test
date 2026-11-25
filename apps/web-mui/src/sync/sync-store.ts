import { useSyncExternalStore } from "react";
import type { ErrorPayload, TokensAckPayload } from "@token-bridge/protocol";
import type { SetDiff, TokenSet } from "@token-bridge/tokens";
import type { RelayState } from "./relay-client.ts";

export type SyncResult =
  | { kind: "ack"; ack: TokensAckPayload }
  | { kind: "queued" }
  | { kind: "timeout" }
  | { kind: "error"; error: ErrorPayload };

export interface SyncState {
  relay: RelayState;
  /** Última versão confirmada pelo Figma (releitura), nunca o que foi enviado. */
  synced: TokenSet | null;
  autoSend: boolean;
  openingSnapshot: "pending" | "resolved";
  banner: { diff: SetDiff; snapshot: TokenSet; warnings: string[] } | null;
  sending: boolean;
  result: SyncResult | null;
}

export const AUTO_SEND_KEY = "vortex-builder:auto-send:v1";

function readAutoSend(): boolean {
  try {
    return localStorage.getItem(AUTO_SEND_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAutoSend(on: boolean): void {
  try {
    localStorage.setItem(AUTO_SEND_KEY, on ? "1" : "0");
  } catch {
    // conveniência apenas
  }
}

let state: SyncState = {
  relay: { socket: "closed", status: null },
  synced: null,
  autoSend: readAutoSend(),
  openingSnapshot: "pending",
  banner: null,
  sending: false,
  result: null,
};
const listeners = new Set<() => void>();

export const syncStore = {
  get(): SyncState {
    return state;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  update(patch: Partial<SyncState> | ((s: SyncState) => Partial<SyncState>)): void {
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    for (const fn of listeners) fn();
  },
};

export function useSync<T>(select: (s: SyncState) => T): T {
  return useSyncExternalStore(syncStore.subscribe, () => select(syncStore.get()));
}
