import seed from "../seed/vortex.tokens.json";
import { parseDtcg } from "./dtcg.ts";
import type { TokenSet } from "./types.ts";

/** Seed Vortex embutido. Fica isolado aqui para a entrada `figma` não puxar o JSON. */
export function loadSeed(): TokenSet {
  return parseDtcg(seed);
}
