// Ações: Button, IconButton, ButtonGroup, ToggleButton, Fab (spec §8). Lacunas mantidas: Outlined/Text coloridos,
// Contained warning/info/success/inherit, hover translúcido das ações coloridas e elevação do Contained e do Fab.
import type { Components, Theme } from "@mui/material/styles";
import { vx } from "../vx.ts";

type Overrides = Components<Omit<Theme, "components">>;

const DISABLED = ".Mui-disabled";

/** Contained com fundo, hover e pressed da ação Vortex `kind`. */
function contained(color: "primary" | "secondary" | "error", kind: "primary" | "secondary" | "danger") {
  return {
    props: { variant: "contained" as const, color },
    style: {
      "--variant-containedBg": vx(`background-action-${kind}`),
      "--variant-containedColor": vx(`text-on-action-${kind}`),
      "@media (hover: hover)": { "&:hover": { "--variant-containedBg": vx(`background-action-${kind}-hover`) } },
      "&:active": { "--variant-containedBg": vx(`background-action-${kind}-pressed`) },
    },
  };
}

/** Outlined e Text Primary = ação terciária neutra. */
const TERTIARY = {
  "--variant-textColor": vx("text-primary"),
  "--variant-outlinedColor": vx("text-primary"),
  "--variant-outlinedBorder": vx("border-strong"),
  "& .MuiButton-startIcon, & .MuiButton-endIcon": { color: vx("icon-primary") },
  "@media (hover: hover)": {
    "&:hover": {
      "--variant-textBg": vx("background-action-tertiary-hover"),
      "--variant-outlinedBg": vx("background-action-tertiary-hover"),
      "--variant-outlinedBorder": vx("border-strong"),
    },
  },
  "&:active": {
    "--variant-textBg": vx("background-action-tertiary-pressed"),
    "--variant-outlinedBg": vx("background-action-tertiary-pressed"),
  },
};

export const actions: Overrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: vx("radius-x-small"),
        variants: [
          contained("primary", "primary"),
          contained("secondary", "secondary"),
          contained("error", "danger"),
          { props: { variant: "outlined", color: "primary" }, style: TERTIARY },
          { props: { variant: "text", color: "primary" }, style: TERTIARY },
          // Espessura: borda 1 → border-width/default
          { props: { variant: "outlined" }, style: { borderWidth: vx("border-width-default") } },
          // Espaço: só onde o padding do MUI é um passo Vortex (16 e 8 na horizontal, tamanho medium)
          { props: { variant: "contained", size: "medium" }, style: { paddingInline: vx("space-medium") } },
          { props: { variant: "outlined", size: "medium" }, style: { paddingInline: `calc(${vx("space-medium")} - ${vx("border-width-default")})` } },
          { props: { variant: "text", size: "medium" }, style: { paddingInline: vx("space-x-small") } },
          // Disabled = aparência habilitada (a opacidade vem do CssBaseline)
          { props: { variant: "text" }, style: { [`&${DISABLED}`]: { color: "var(--variant-textColor)" } } },
          {
            props: { variant: "outlined" },
            style: { [`&${DISABLED}`]: { color: "var(--variant-outlinedColor)", border: `${vx("border-width-default")} solid var(--variant-outlinedBorder)` } },
          },
          {
            props: { variant: "contained" },
            style: { [`&${DISABLED}`]: { color: "var(--variant-containedColor)", backgroundColor: "var(--variant-containedBg)" } },
          },
          // `color="inherit"` não define as vars --variant-*Color: volta a herdar
          { props: { color: "inherit" }, style: { [`&${DISABLED}`]: { color: "inherit", borderColor: "currentColor" } } },
        ],
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: vx("radius-full"),
        variants: [
          ...(["default", "primary"] as const).map((color) => ({
            props: { color },
            style: {
              color: vx("icon-primary"),
              "@media (hover: hover)": { "&:hover": { backgroundColor: vx("background-action-tertiary-hover") } },
              "&:active": { backgroundColor: vx("background-action-tertiary-pressed") },
              [`&${DISABLED}`]: { color: vx("icon-primary") },
            },
          })),
          { props: { size: "medium" }, style: { padding: vx("space-x-small") } },
          { props: { size: "large" }, style: { padding: vx("space-small") } },
        ],
      },
    },
  },
  MuiButtonGroup: {
    styleOverrides: { root: { borderRadius: vx("radius-x-small") } },
  },
  MuiToggleButtonGroup: {
    styleOverrides: { root: { borderRadius: vx("radius-x-small") } },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: vx("radius-x-small"),
        borderWidth: vx("border-width-default"),
        // Disabled = aparência habilitada: o MUI troca cor e borda
        [`&${DISABLED}`]: { color: theme.vars.palette.action.active, border: `${vx("border-width-default")} solid ${theme.vars.palette.divider}` },
        [`&${DISABLED}.Mui-selected`]: { color: theme.vars.palette.text.primary },
      }),
    },
  },
  MuiFab: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: vx("radius-full"),
        // Disabled = aparência habilitada da cor escolhida
        [`&${DISABLED}`]: { color: theme.vars.palette.grey[900], backgroundColor: theme.vars.palette.grey[300] },
        variants: (["primary", "secondary", "error", "warning", "info", "success"] as const).map((color) => ({
          props: { color },
          style: { [`&${DISABLED}`]: { color: theme.vars.palette[color].contrastText, backgroundColor: theme.vars.palette[color].main } },
        })),
      }),
    },
  },
};
