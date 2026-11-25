/// <reference types="@figma/plugin-typings" />
import type { Envelope, TokensAckPayload } from "@token-bridge/protocol";
import { handleMessage } from "./handle.ts";

figma.showUI(__html__, { width: 260, height: 120, themeColors: true });

/**
 * Serialize all work: two overlapping upserts would both see "variable missing"
 * and create duplicates.
 */
let chain: Promise<unknown> = Promise.resolve();
const enqueue = (job: () => Promise<void>) => (chain = chain.then(job, job));

function notify(msg: Envelope, res: Envelope) {
  if (res.type === "error") {
    const err = res.payload as { code: string; message: string };
    if (msg.type === "upsert-theme" && err.code === "invalid") return; // shadcn: validation errors never notified
    figma.notify(`Token Bridge: ${err.message}`, { error: true, timeout: 4000 });
  } else if (res.type === "ack" && msg.type === "upsert-theme") {
    const ack = res.payload as { theme: string; clamped: unknown[] };
    const clamped = ack.clamped.length ? ` · ${ack.clamped.length} fora do sRGB` : "";
    figma.notify(`Tema "${ack.theme}" aplicado${clamped}`, { timeout: 1200 });
  } else if (res.type === "ack" && msg.type === "upsert-tokens") {
    const ack = res.payload as TokensAckPayload;
    figma.notify(`Vortex aplicado · ${ack.variables.updated} atualizadas · ${ack.warnings.length} avisos`, { timeout: 1200 });
  }
}

figma.ui.onmessage = (msg: Envelope) => {
  if (!msg || typeof msg.type !== "string") return;
  enqueue(async () => {
    const res = await handleMessage(msg);
    if (!res) return;
    figma.ui.postMessage(res);
    // snapshot reads are silent; only writes notify
    if (msg.type !== "get-snapshot" && msg.type !== "get-tokens-snapshot") notify(msg, res);
  });
};
