import { diffSets, parseDtcg, toDtcg } from "@token-bridge/tokens";
import type { TokenSet } from "@token-bridge/tokens";
import type { TokensAckPayload, TokensSnapshotPayload, UpsertTokensPayload } from "@token-bridge/protocol";
import { toMuiModule } from "../export/mui-module.ts";
import { store } from "../state/store.ts";
import { RELAY_URL, RelayError, relayHttpUrl, type RelayPort } from "./relay-client.ts";
import { syncStore, writeAutoSend, type SyncResult } from "./sync-store.ts";

export const SEND_TIMEOUT_MS = 35_000;
export const SNAPSHOT_TIMEOUT_MS = 15_000;
export const AUTO_SEND_DEBOUNCE_MS = 2_000;

let port: RelayPort | null = null;
let sendSeq = 0;
/** Incrementa a cada atualização de `synced` (ack ou GET): respostas GET antigas são descartadas. */
let syncedEpoch = 0;

export function buildPayload(set: TokenSet, remove: string[]): UpsertTokensPayload {
  return { tokens: toDtcg(set), remove: { specific: remove }, muiModule: toMuiModule(set) };
}

const toError = (e: unknown): SyncResult =>
  e instanceof RelayError
    ? e.payload.code === "timeout" ? { kind: "timeout" } : { kind: "error", error: e.payload }
    : { kind: "error", error: { code: "unknown", message: e instanceof Error ? e.message : String(e) } };

const pluginConnected = (): boolean =>
  syncStore.get().relay.socket === "open" && syncStore.get().relay.status?.plugin === "connected";

export async function fetchSnapshot(): Promise<{ set: TokenSet; warnings: string[] }> {
  if (!port) throw new RelayError({ code: "unknown", message: "sync não iniciado" });
  const res = await port.request("get-tokens-snapshot", undefined, SNAPSHOT_TIMEOUT_MS);
  const payload = res.payload as TokensSnapshotPayload;
  return { set: parseDtcg(payload.tokens), warnings: payload.warnings };
}

export async function sendToFigma(opts: { remove: string[]; auto?: boolean }): Promise<SyncResult> {
  const relay = port;
  const seq = ++sendSeq;
  const latest = () => seq === sendSeq;
  const finish = (result: SyncResult): SyncResult => {
    if (latest()) syncStore.update({ sending: false, result });
    return result;
  };
  if (!relay || syncStore.get().relay.socket !== "open") {
    return finish({ kind: "error", error: { code: "unknown", message: "Relay offline: nada foi enviado" } });
  }
  const payload = buildPayload(store.get().set, opts.remove);
  syncStore.update({ sending: true });
  if (!pluginConnected()) {
    // O relay enfileira e só responde quando o plugin volta: não aguarda.
    relay.request("upsert-tokens", payload, SEND_TIMEOUT_MS).catch(() => {});
    return finish({ kind: "queued" });
  }
  try {
    const res = await relay.request("upsert-tokens", payload, SEND_TIMEOUT_MS);
    const ack = res.payload as TokensAckPayload;
    const synced = parseDtcg(ack.tokens);
    store.clearTombstones(opts.remove); // aplicado no Figma, mesmo que um envio mais novo exista
    if (latest()) {
      syncedEpoch++;
      syncStore.update({ synced });
    }
    return finish({ kind: "ack", ack });
  } catch (e) {
    return finish(toError(e));
  }
}

export function importFromFigma(snapshot: TokenSet): void {
  store.importSet(snapshot);
  syncStore.update({ synced: snapshot, banner: null, openingSnapshot: "resolved" });
}

export function keepDraft(): void {
  const banner = syncStore.get().banner;
  if (!banner) return;
  syncStore.update({ synced: banner.snapshot, banner: null, openingSnapshot: "resolved" });
}

export function setAutoSend(on: boolean): void {
  writeAutoSend(on);
  syncStore.update({ autoSend: on });
}

export function startSync(relay: RelayPort): () => void {
  port = relay;
  let openingStarted = false;
  let baselineAt: string | undefined | null = null; // null = ainda não visto
  let lastSet = store.get().set;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const mirror = () => {
    syncStore.update({ relay: relay.state });
    const { socket, status } = relay.state;
    if (socket === "open" && status) {
      openOnce(status.plugin);
      watchLastTokens(status.lastTokens?.at);
    }
    flush();
  };

  const openOnce = (plugin: "connected" | "disconnected") => {
    if (openingStarted) return;
    openingStarted = true;
    if (plugin === "disconnected") {
      syncStore.update({ openingSnapshot: "resolved" });
      return;
    }
    fetchSnapshot().then(
      ({ set, warnings }) => {
        const diff = diffSets(store.get().set, set, { ignoreDisabledOf: store.get().set });
        if (diff.total === 0) syncStore.update({ synced: set, openingSnapshot: "resolved" });
        else syncStore.update({ banner: { diff, snapshot: set, warnings } });
      },
      () => syncStore.update({ openingSnapshot: "resolved" }),
    );
  };

  const watchLastTokens = (at: string | undefined) => {
    if (baselineAt === null) {
      baselineAt = at;
      return;
    }
    if (at === baselineAt) return;
    baselineAt = at;
    if (at === undefined) return;
    const epoch = ++syncedEpoch;
    fetch(`${relayHttpUrl(RELAY_URL)}/tokens.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: unknown) => {
        if (epoch === syncedEpoch) syncStore.update({ synced: parseDtcg(json) });
      })
      .catch(() => {});
  };

  const ready = () => {
    const s = syncStore.get();
    return s.autoSend && s.openingSnapshot === "resolved" && !s.sending && pluginConnected();
  };

  const flush = () => {
    if (!pending || !ready()) return;
    pending = false;
    void sendToFigma({ remove: [], auto: true });
  };

  const onStore = () => {
    const set = store.get().set;
    if (set === lastSet) return;
    lastSet = set;
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending = true;
      flush();
    }, AUTO_SEND_DEBOUNCE_MS);
  };

  const offRelay = relay.subscribe(mirror);
  const offSync = syncStore.subscribe(flush);
  const offStore = store.subscribe(onStore);
  mirror();

  return () => {
    offRelay();
    offSync();
    offStore();
    clearTimeout(timer);
    if (port === relay) port = null;
  };
}
