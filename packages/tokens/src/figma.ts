// Entrada enxuta para o plugin do Figma (sem dados embutidos nem dependências de cor).
export { parseDtcg, toDtcg, TokenFormatError } from "./dtcg.ts";
export type { DtcgDocument } from "./dtcg.ts";
export { toFigmaExport } from "./figma-export.ts";
export { fromFigmaExport } from "./raw.ts";
export type { RawFigmaExport, RawVariable, RawValue } from "./raw.ts";
export { valueLine, withValueLine } from "./describe.ts";
export { cssVarName } from "./export/css.ts";
export { isDisabled } from "./groups.ts";
export type { TokenSet, Layer } from "./types.ts";
