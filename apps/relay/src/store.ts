import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DtcgDocument } from "@token-bridge/protocol";
import { c, type Logger } from "./log.ts";

/** Last token set confirmed by Figma (a re-read, never a payload that was sent). */
export interface LastTokens {
  at: string;
  tokens: DtcgDocument;
  muiModule?: string;
}

const FILE = "last-tokens.json";

export function loadLast(dir: string, log: Logger): LastTokens | null {
  let raw: string;
  try {
    raw = readFileSync(join(dir, FILE), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    log("relay", c.red(`não consegui ler ${FILE}: ${(e as Error).message}`));
    return null;
  }
  try {
    const v = JSON.parse(raw) as Partial<LastTokens>;
    if (!v || typeof v.at !== "string" || !v.tokens || typeof v.tokens !== "object") throw new Error("formato inesperado");
    return { at: v.at, tokens: v.tokens, ...(typeof v.muiModule === "string" ? { muiModule: v.muiModule } : {}) };
  } catch (e) {
    log("relay", c.red(`${FILE} corrompido, ignorando: ${(e as Error).message}`));
    return null;
  }
}

export function saveLast(dir: string, last: LastTokens): void {
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `${FILE}.tmp`);
  writeFileSync(tmp, JSON.stringify(last, null, 2) + "\n");
  renameSync(tmp, join(dir, FILE));
}
