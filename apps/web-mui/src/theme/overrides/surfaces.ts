// Superfícies: Paper, Card, Menu, Popover, Dialog, Drawer, Accordion (spec §8). A sombra vem de theme.shadows
// (elevação 1–11 → shadow/raised; 12+ → shadow/overlay). Lacuna mantida: larguras do Dialog pelos breakpoints.
import type { Components, Theme } from "@mui/material/styles";
import { textStyle, vx } from "../vx.ts";

type Overrides = Components<Omit<Theme, "components">>;
type PaperState = { ownerState: { variant?: string; elevation?: number } };

const SURFACE = { backgroundColor: vx("background-surface") };

export const surfaces: Overrides = {
  MuiPaper: {
    styleOverrides: {
      root: {
        ...SURFACE,
        backgroundImage: "none", // sem a sobreposição clara do MUI no escuro: a superfície Vortex já é a cor final
        variants: [
          {
            props: ({ ownerState }: PaperState) => ownerState.variant === "elevation" && (ownerState.elevation ?? 1) > 0,
            style: { backgroundColor: vx("background-surface-raised") },
          },
          { props: { square: false }, style: { borderRadius: vx("radius-medium") } },
          { props: { variant: "outlined" as const }, style: { border: `${vx("border-width-default")} solid ${vx("border-subtle")}` } },
        ],
      },
    },
  },
  // O Card agrupa conteúdo sobre a página: surface (com shadow/raised pela elevação 1) e radius/medium do Paper.
  MuiCard: { styleOverrides: { root: SURFACE } },
  MuiCardHeader: { styleOverrides: { root: { padding: vx("space-medium") } } },
  MuiCardContent: {
    styleOverrides: { root: { padding: vx("space-medium"), "&:last-child": { paddingBottom: vx("space-large") } } },
  },
  MuiPopover: { styleOverrides: { paper: { borderRadius: vx("radius-small") } } },
  MuiMenu: {
    styleOverrides: {
      paper: { borderRadius: vx("radius-small") },
      list: { paddingBlock: vx("space-x-small") },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        ...textStyle("label", "medium"), // menu → label/*
        paddingInline: vx("space-medium"),
        "&.Mui-disabled": { opacity: vx("opacity-disabled") }, // o MUI usa a própria opacidade
        variants: [{ props: { dense: true }, style: textStyle("label", "small") }],
      },
    },
  },
  MuiDialog: { styleOverrides: { paper: { borderRadius: vx("radius-large") } } },
  MuiDialogTitle: { styleOverrides: { root: { padding: `${vx("space-medium")} ${vx("space-large")}` } } },
  MuiDialogContent: { styleOverrides: { root: { paddingInline: vx("space-large") } } },
  MuiDialogActions: { styleOverrides: { root: { padding: vx("space-x-small") } } },
  MuiAccordion: {
    styleOverrides: {
      root: {
        ...SURFACE,
        "&::before": { backgroundColor: vx("border-subtle") },
        "&.Mui-disabled": SURFACE, // disabled = aparência habilitada (o MUI troca o fundo)
        variants: [{
          props: { square: false },
          style: {
            "&:first-of-type": { borderTopLeftRadius: vx("radius-medium"), borderTopRightRadius: vx("radius-medium") },
            "&:last-of-type": { borderBottomLeftRadius: vx("radius-medium"), borderBottomRightRadius: vx("radius-medium") },
          },
        }],
      },
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      // O Accordion desabilitado já esmaece: o resumo, aninhado, não esmaece de novo.
      root: { paddingInline: vx("space-medium"), "&.Mui-disabled": { opacity: 1 } },
    },
  },
  MuiAccordionDetails: {
    styleOverrides: { root: { padding: `${vx("space-x-small")} ${vx("space-medium")} ${vx("space-medium")}` } },
  },
};
