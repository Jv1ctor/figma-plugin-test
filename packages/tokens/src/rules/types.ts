import type { Mode } from "../types.ts";

export type RuleId = "contrast-text" | "contrast-icon" | "contrast-control" | "contrast-focus" | "contrast-data"
  | "feedback-palette" | "wrong-group" | "size-order" | "line-height" | "focus-width" | "neutral" | "data-palettes"
  | "font-weight" | "specific-name" | "broken-ref" | "disabled-group-in-use";
export interface Warning { id: string; token: string; mode?: Mode; rule: RuleId; message: string; actual?: string; expected?: string; against?: string }
export interface ValidateOptions { fontWeights?: Record<string, number[]> } // família → pesos disponíveis
