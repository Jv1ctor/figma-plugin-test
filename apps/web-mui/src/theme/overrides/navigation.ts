// Navegação: Tabs, Pagination, Stepper, Link (spec §8: aba, página e passo selecionados → border/selected,
// background/selected, text/primary; conector do Stepper → border/subtle; Link → text/link).
import type { Components, Theme } from "@mui/material/styles";
import { vx } from "../vx.ts";

type Overrides = Components<Omit<Theme, "components">>;

const SELECTED = { color: vx("text-primary"), backgroundColor: vx("background-selected") };
const SELECTED_BORDER = `${vx("border-width-selected")} solid ${vx("border-selected")}`;

export const navigation: Overrides = {
  MuiTabs: {
    styleOverrides: {
      indicator: {
        variants: [
          { props: { indicatorColor: "primary" as const }, style: { backgroundColor: vx("border-selected") } },
          { props: { vertical: false }, style: { height: vx("border-width-selected") } },
          { props: { vertical: true }, style: { width: vx("border-width-selected") } },
        ],
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        padding: `${vx("space-small")} ${vx("space-medium")}`,
        variants: [{
          props: { textColor: "primary" as const },
          style: {
            "&.Mui-selected": SELECTED,
            "&.Mui-disabled": { color: vx("text-secondary") }, // disabled = aparência habilitada
          },
        }],
      },
    },
  },
  MuiPaginationItem: {
    styleOverrides: {
      root: {
        borderRadius: vx("radius-full"),
        "&.Mui-selected": { ...SELECTED, border: SELECTED_BORDER },
        // O MUI aplica a própria opacidade (e zera a do item selecionado): volta para a do Vortex
        "&.Mui-disabled": { opacity: vx("opacity-disabled") },
        "&.Mui-selected.Mui-disabled": { ...SELECTED, border: SELECTED_BORDER, opacity: vx("opacity-disabled") },
        variants: [
          { props: { shape: "rounded" as const }, style: { borderRadius: vx("radius-xx-small") } }, // 4 px: por valor igual
          { props: { variant: "outlined" as const }, style: { borderWidth: vx("border-width-default") } },
        ],
      },
    },
  },
  MuiStepIcon: {
    styleOverrides: {
      root: {
        overflow: "visible",
        "&.Mui-active": {
          color: vx("background-selected"),
          "& circle": { stroke: vx("border-selected"), strokeWidth: vx("border-width-selected") },
          "& .MuiStepIcon-text": { fill: vx("text-primary") },
        },
        "&.Mui-completed": { color: vx("border-selected") },
      },
    },
  },
  MuiStepLabel: {
    styleOverrides: {
      // Passo futuro de um Stepper linear vem com .Mui-disabled, mas não é um controle desabilitado.
      root: { "&.Mui-disabled": { opacity: 1 } },
      label: { "&.Mui-active, &.Mui-completed": { color: vx("text-primary") } },
    },
  },
  MuiStepConnector: {
    styleOverrides: {
      line: { borderColor: vx("border-subtle") },
      lineHorizontal: { borderTopWidth: vx("border-width-default") },
      lineVertical: { borderLeftWidth: vx("border-width-default") },
    },
  },
  MuiLink: {
    styleOverrides: {
      root: {
        variants: [{ props: { color: "primary" as const }, style: { color: vx("text-link"), "--Link-underlineColor": vx("text-link") } }],
      },
    },
  },
};
