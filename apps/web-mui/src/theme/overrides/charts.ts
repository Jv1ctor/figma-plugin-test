// Gráficos (MUI X Charts, MIT): eixos e grade em border/subtle, rótulos em text/secondary, tooltip como superfície elevada.
import type {} from "@mui/x-charts/themeAugmentation";
import type { Components, Theme } from "@mui/material/styles";
import { textStyle, vx } from "../vx.ts";

type Overrides = Components<Omit<Theme, "components">>;

const SUBTLE = { stroke: vx("border-subtle"), strokeWidth: vx("border-width-default") };
const LABEL = { fill: vx("text-secondary"), ...textStyle("body", "small") };

const axis = {
  root: {
    "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": SUBTLE,
    "& .MuiChartsAxis-tickLabel, & .MuiChartsAxis-label": LABEL,
  },
};

export const chartsOverrides: Overrides = {
  MuiChartsAxis: { styleOverrides: axis },
  MuiChartsXAxis: { styleOverrides: axis },
  MuiChartsYAxis: { styleOverrides: axis },
  MuiChartsGrid: { styleOverrides: { root: { "& .MuiChartsGrid-line": SUBTLE } } },
  MuiChartsLegend: { styleOverrides: { root: { "& text, & .MuiChartsLegend-label": LABEL } } },
  MuiChartsTooltip: {
    styleOverrides: {
      paper: {
        backgroundColor: vx("background-surface-raised"),
        color: vx("text-primary"),
        boxShadow: vx("shadow-raised"),
        borderRadius: vx("radius-small"),
      },
      cell: { color: vx("text-primary"), ...textStyle("body", "small") },
    },
  },
};
