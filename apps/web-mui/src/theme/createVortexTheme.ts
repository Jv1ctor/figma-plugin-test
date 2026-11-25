// Só importa @mui/material e os módulos de ./ (a Task 14 embute o tema no export do MUI).
import { createTheme, type PaletteOptions, type Theme } from "@mui/material/styles";
import type {} from "@mui/material/themeCssVarsAugmentation"; // tipa theme.vars, colorSchemes etc.
import { actions } from "./overrides/actions.ts";
import { chartsOverrides } from "./overrides/charts.ts";
import { dataDisplay } from "./overrides/data-display.ts";
import { feedback } from "./overrides/feedback.ts";
import { inputs } from "./overrides/inputs.ts";
import { navigation } from "./overrides/navigation.ts";
import { selection } from "./overrides/selection.ts";
import { surfaces } from "./overrides/surfaces.ts";
import { textStyle, vx } from "./vx.ts";

/** Mesmo formato de `MuiPaletteValues` de @token-bridge/tokens: hex resolvidos do tema atual (spec §8, Lacunas). */
export interface VortexPaletteValues {
  primary: string; secondary: string | null; error: string; warning: string; info: string; success: string;
  textPrimary: string; textSecondary: string; backgroundDefault: string; backgroundPaper: string; divider: string;
}

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

const SHADOWS = [
  "none",
  ...Array<string>(11).fill(vx("shadow-raised")),
  ...Array<string>(13).fill(vx("shadow-overlay")),
] as Theme["shadows"];

/**
 * Anel de foco Vortex com vão (spec §8). O MUI zera `outline` com uma classe (0,1,0) injetada depois do baseline,
 * então o seletor global precisa de mais especificidade: `html :focus-visible:not(…)` = (0,2,1). O <input> dos
 * campos fica de fora: o foco do campo é a borda (Task 10).
 */
const FOCUS_RING = { outline: `${vx("border-width-focus")} solid ${vx("border-focus")}`, outlineOffset: "2px" };

/*
 * Disabled (spec §8): aparência habilitada + opacity/disabled uma vez por componente. O MUI põe .Mui-disabled no
 * root e também nas partes de dentro (input, rótulo do FormControlLabel, controle dentro dele), então a regra
 * aninhada neutraliza o empilhamento (0,4³ → 0,4). Componentes com opacidade própria no MUI a trocam nos overrides.
 */
function baseline(fontUrl: string | null): string {
  const src = fontUrl === null
    ? 'local("Satoshi Variable")'
    : `local("Satoshi Variable"), url("${fontUrl}") format("woff2")`;
  return `
@font-face {
  font-family: "Satoshi Variable";
  src: ${src};
  font-weight: 300 900;
  font-style: normal;
  font-display: swap;
}
body { background: ${vx("background-canvas")}; color: ${vx("text-primary")}; }
html :focus-visible:not(.MuiInputBase-input) { outline: ${FOCUS_RING.outline}; outline-offset: ${FOCUS_RING.outlineOffset}; }
.Mui-disabled { opacity: ${vx("opacity-disabled")}; }
.Mui-disabled .Mui-disabled { opacity: 1; }
`;
}

/** `fontUrl`: arquivo da Satoshi (o builder passa o dele); sem ele, só a fonte instalada (export MUI, que não embute a fonte). */
export function createVortexTheme(
  palette: { light: VortexPaletteValues; dark: VortexPaletteValues },
  opts: { fontUrl?: string | null } = {},
): Theme {
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
      MuiButtonBase: {
        defaultProps: { disableRipple: true },
        // Foco por teclado detectado pelo MUI: cobre o SwitchBase, cujo :focus-visible nativo cai no <input> invisível.
        styleOverrides: { root: { "&.Mui-focusVisible": FOCUS_RING } },
      },
      MuiCssBaseline: { styleOverrides: baseline(opts.fontUrl ?? null) },
      ...actions,
      ...inputs,
      ...selection,
      ...navigation,
      ...dataDisplay({ accent2: palette.light.secondary !== null }),
      ...surfaces,
      ...feedback,
      ...chartsOverrides,
    },
  });
}
