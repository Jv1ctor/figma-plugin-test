// Autocontido: só importa @mui/material (a Task 14 embute este arquivo no export do tema MUI).
import { createTheme, type PaletteOptions, type Theme } from "@mui/material/styles";
import type {} from "@mui/material/themeCssVarsAugmentation"; // tipa theme.vars, colorSchemes etc.

/** Mesmo formato de `MuiPaletteValues` de @token-bridge/tokens: hex resolvidos do tema atual (spec §8, Lacunas). */
export interface VortexPaletteValues {
  primary: string; secondary: string | null; error: string; warning: string; info: string; success: string;
  textPrimary: string; textSecondary: string; backgroundDefault: string; backgroundPaper: string; divider: string;
}

const vx = (name: string): string => `var(--vx-${name})`;

function toPalette(v: VortexPaletteValues): PaletteOptions {
  return {
    primary: { main: v.primary },
    // brand-2 desligado: secondary fica com o padrão do MUI
    ...(v.secondary === null ? {} : { secondary: { main: v.secondary } }),
    error: { main: v.error },
    warning: { main: v.warning },
    info: { main: v.info },
    success: { main: v.success },
    text: { primary: v.textPrimary, secondary: v.textSecondary },
    background: { default: v.backgroundDefault, paper: v.backgroundPaper },
    divider: v.divider,
  };
}

/** Estilo de texto Vortex (`typography/<grupo>/<tamanho>/*`) em vars. */
function textStyle(group: "display" | "heading" | "body" | "label", size: "large" | "medium" | "small") {
  const t = (prop: string) => vx(`typography-${group}-${size}-${prop}`);
  return {
    fontFamily: vx(`typography-${group}-font-family`),
    fontSize: t("font-size"),
    lineHeight: t("line-height"),
    fontWeight: t("font-weight"),
    letterSpacing: t("letter-spacing"),
  };
}

const SHADOWS = [
  "none",
  ...Array<string>(11).fill(vx("shadow-raised")),
  ...Array<string>(13).fill(vx("shadow-overlay")),
] as Theme["shadows"];

const BASELINE = `
@font-face {
  font-family: "Satoshi Variable";
  src: local("Satoshi Variable"), url("/fonts/Satoshi-Variable.woff2") format("woff2");
  font-weight: 300 900;
  font-style: normal;
  font-display: swap;
}
body { background: ${vx("background-canvas")}; color: ${vx("text-primary")}; }
:focus-visible { outline: ${vx("border-width-focus")} solid ${vx("border-focus")}; outline-offset: 2px; }
.Mui-disabled { opacity: ${vx("opacity-disabled")}; }
`;

export function createVortexTheme(palette: { light: VortexPaletteValues; dark: VortexPaletteValues }): Theme {
  return createTheme({
    cssVariables: { colorSchemeSelector: '[data-mode="%s"]' },
    colorSchemes: {
      light: { palette: toPalette(palette.light) },
      dark: { palette: toPalette(palette.dark) },
    },
    typography: {
      fontFamily: `${vx("typography-body-font-family")}, system-ui, sans-serif`,
      h1: textStyle("display", "large"),
      h2: textStyle("display", "medium"),
      h3: textStyle("display", "small"),
      h4: textStyle("heading", "large"),
      h5: textStyle("heading", "medium"),
      h6: textStyle("heading", "small"),
      body1: textStyle("body", "medium"),
      body2: textStyle("body", "small"),
      caption: textStyle("body", "small"),
      button: { ...textStyle("label", "medium"), textTransform: "none" },
    },
    shadows: SHADOWS,
    components: {
      MuiButtonBase: { defaultProps: { disableRipple: true } },
      MuiCssBaseline: { styleOverrides: BASELINE },
    },
  });
}
