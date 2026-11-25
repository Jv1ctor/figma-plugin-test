import { muiPaletteValues } from "@token-bridge/tokens";
import type { TokenSet } from "@token-bridge/tokens";
import themeSource from "virtual:vortex-theme-source";

/** Módulo TS autônomo: só depende de @mui/material e de ./vortex.css (spec §10). */
export function toMuiModule(set: TokenSet): string {
  const palette = { light: muiPaletteValues(set, "light"), dark: muiPaletteValues(set, "dark") };
  return [
    "// @ts-nocheck",
    "// Gerado pelo Vortex Builder. Use junto de vortex.css; não edite à mão.",
    "// A fonte Satoshi não vem embutida (licença): instale-a no app ou passe `fontUrl` apontando para o seu arquivo,",
    "// ex.: createVortexTheme(vortexPalette, { fontUrl: \"/caminho/Satoshi-Variable.woff2\" }).",
    "// Renderize <CssBaseline /> para valer o @font-face, o body, o anel de foco e as regras de disabled.",
    'import "./vortex.css";',
    themeSource.trim(),
    `export const vortexPalette = ${JSON.stringify(palette, null, 2)};`,
    "export const theme = createVortexTheme(vortexPalette, { fontUrl: null });",
    "",
  ].join("\n");
}
