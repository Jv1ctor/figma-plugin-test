import type { TokenSet } from "../types.ts";
import { brokenRefWarnings, contrastWarnings, formatRatio } from "./contrast.ts";
import { structureWarnings } from "./structure.ts";
import type { ValidateOptions, Warning } from "./types.ts";

export * from "./types.ts";
export { formatRatio };
export { parsePar } from "./par.ts";
export { checkSpecificName } from "./naming.ts";

export function validate(set: TokenSet, opts: ValidateOptions = {}): Warning[] {
  return [...brokenRefWarnings(set), ...contrastWarnings(set), ...structureWarnings(set, opts)];
}
