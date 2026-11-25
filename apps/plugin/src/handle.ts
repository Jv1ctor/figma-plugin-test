import {
  validateTheme, validateUpsertTokensShape,
  type Envelope, type ErrorPayload, type Theme, type UpsertTokensPayload,
} from "@token-bridge/protocol";
import { fromFigmaExport, parseDtcg, toDtcg, TokenFormatError } from "@token-bridge/tokens/figma";
import { BridgeError, readSnapshot, upsertTheme } from "./variables.ts";
import { capWarnings, readVortex, upsertVortex } from "./vortex.ts";

const invalid = (id: string, message: string): Envelope => ({ id, type: "error", payload: { code: "invalid", message } });

export const toError = (id: string, e: unknown): Envelope<"error", ErrorPayload> => ({
  id,
  type: "error",
  payload:
    e instanceof BridgeError
      ? { code: e.code, message: e.message }
      : { code: "figma", message: e instanceof Error ? e.message : String(e) },
});

/** Pure message handling (no figma.ui / notify) so it can be tested without the UI. */
export async function handleMessage(msg: Envelope): Promise<Envelope | undefined> {
  switch (msg.type) {
    case "upsert-theme": {
      const errors = validateTheme(msg.payload);
      if (errors.length) return invalid(msg.id, errors.join("; "));
      try {
        return { id: msg.id, type: "ack", payload: await upsertTheme(msg.payload as Theme) };
      } catch (e) {
        return toError(msg.id, e);
      }
    }
    case "get-snapshot": {
      try {
        return { id: msg.id, type: "snapshot", payload: await readSnapshot() };
      } catch (e) {
        return toError(msg.id, e);
      }
    }
    case "upsert-tokens": {
      const errors = validateUpsertTokensShape(msg.payload);
      if (errors.length) return invalid(msg.id, errors.join("; "));
      const p = msg.payload as UpsertTokensPayload;
      let set;
      try {
        set = parseDtcg(p.tokens);
      } catch (e) {
        if (e instanceof TokenFormatError) return invalid(msg.id, e.message);
        return toError(msg.id, e);
      }
      try {
        const started = Date.now();
        const written = await upsertVortex(set, p.remove?.specific ?? []);
        const { raw, warnings } = await readVortex();
        return {
          id: msg.id,
          type: "ack",
          payload: {
            for: "upsert-tokens",
            variables: written.variables,
            styles: written.styles,
            warnings: capWarnings([...written.warnings, ...warnings]),
            tokens: toDtcg(fromFigmaExport(raw)),
            durationMs: Date.now() - started,
          },
        };
      } catch (e) {
        return toError(msg.id, e);
      }
    }
    case "get-tokens-snapshot": {
      try {
        const { raw, warnings } = await readVortex();
        return { id: msg.id, type: "tokens-snapshot", payload: { tokens: toDtcg(fromFigmaExport(raw)), warnings } };
      } catch (e) {
        return toError(msg.id, e);
      }
    }
  }
  return undefined;
}
