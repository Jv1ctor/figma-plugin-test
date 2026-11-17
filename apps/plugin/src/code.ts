/// <reference types="@figma/plugin-typings" />
import { validateTheme, type Envelope, type ErrorPayload, type Theme } from "@token-bridge/protocol";
import { BridgeError, readSnapshot, upsertTheme } from "./variables.ts";

figma.showUI(__html__, { width: 260, height: 120, themeColors: true });

const reply = (msg: Envelope) => figma.ui.postMessage(msg);

const toError = (id: string, e: unknown): Envelope<"error", ErrorPayload> => ({
  id,
  type: "error",
  payload:
    e instanceof BridgeError
      ? { code: e.code, message: e.message }
      : { code: "figma", message: e instanceof Error ? e.message : String(e) },
});

/**
 * Serialize all work: two overlapping upserts would both see "variable missing"
 * and create duplicates.
 */
let chain: Promise<unknown> = Promise.resolve();
const enqueue = (job: () => Promise<void>) => (chain = chain.then(job, job));

async function handle(msg: Envelope) {
  switch (msg.type) {
    case "upsert-theme": {
      const errors = validateTheme(msg.payload);
      if (errors.length) return reply({ id: msg.id, type: "error", payload: { code: "invalid", message: errors.join("; ") } });
      try {
        const ack = await upsertTheme(msg.payload as Theme);
        reply({ id: msg.id, type: "ack", payload: ack });
        const clamped = ack.clamped.length ? ` · ${ack.clamped.length} fora do sRGB` : "";
        figma.notify(`Tema "${ack.theme}" aplicado${clamped}`, { timeout: 1200 });
      } catch (e) {
        const err = toError(msg.id, e);
        reply(err);
        figma.notify(`Token Bridge: ${err.payload!.message}`, { error: true, timeout: 4000 });
      }
      return;
    }
    case "get-snapshot": {
      try {
        reply({ id: msg.id, type: "snapshot", payload: await readSnapshot() });
      } catch (e) {
        reply(toError(msg.id, e));
      }
      return;
    }
  }
}

figma.ui.onmessage = (msg: Envelope) => {
  if (!msg || typeof msg.type !== "string") return;
  enqueue(() => handle(msg));
};
