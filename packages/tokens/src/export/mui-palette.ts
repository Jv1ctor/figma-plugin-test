import { isDisabled } from "../groups.ts";
import { resolve } from "../resolve.ts";
import type { Mode, TokenSet } from "../types.ts";

export interface MuiPaletteValues {
  primary: string; secondary: string | null; error: string; warning: string; info: string; success: string;
  textPrimary: string; textSecondary: string; backgroundDefault: string; backgroundPaper: string; divider: string;
}

/** Valores resolvidos para a `palette` do MUI (spec §8). Hex de 6 dígitos; ausente vira #000000. */
export function muiPaletteValues(set: TokenSet, mode: Mode): MuiPaletteValues {
  const hex = (name: string): string => {
    const r = resolve(set, "semantic", name, mode);
    return r.kind === "color" ? r.hex : "#000000";
  };
  return {
    primary: hex("background/action/primary"),
    secondary: isDisabled(set, "semantic", "background/accent-2/strong") ? null : hex("background/accent-2/strong"),
    error: hex("background/danger/strong"),
    warning: hex("background/warning/strong"),
    info: hex("background/information/strong"),
    success: hex("background/success/strong"),
    textPrimary: hex("text/primary"),
    textSecondary: hex("text/secondary"),
    backgroundDefault: hex("background/canvas"),
    backgroundPaper: hex("background/surface"),
    divider: hex("border/subtle"),
  };
}
