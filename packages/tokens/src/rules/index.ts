import type { TokenSet } from "../types.ts";
import { brokenRefWarnings, contrastWarnings } from "./contrast.ts";
import type { ValidateOptions, Warning } from "./types.ts";

export * from "./types.ts";
export { parsePar } from "./par.ts";

export function validate(set: TokenSet, _opts: ValidateOptions = {}): Warning[] {
  return [...brokenRefWarnings(set), ...contrastWarnings(set)];
}
