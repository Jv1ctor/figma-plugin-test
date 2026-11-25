// Feedback: Alert, Snackbar, Tooltip, Backdrop (spec §8). Lacunas mantidas: título do Alert e cor do Progress.
import type { Components, Theme } from "@mui/material/styles";
import { STATUS, vx } from "../vx.ts";

type Overrides = Components<Omit<Theme, "components">>;

const INVERSE = { backgroundColor: vx("background-inverse"), color: vx("text-on-inverse") };

export const feedback: Overrides = {
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: vx("radius-xx-small"), // 4 px: por valor igual
        paddingInline: vx("space-medium"),
        variants: STATUS.flatMap(({ mui, vortex }) => [
          {
            props: { colorSeverity: mui, variant: "standard" as const },
            style: { backgroundColor: vx(`background-${vortex}-subtle`), color: vx("text-primary"), "& .MuiAlert-icon": { color: vx(`icon-${vortex}`) } },
          },
          {
            props: { colorSeverity: mui, variant: "filled" as const },
            style: { backgroundColor: vx(`background-${vortex}-strong`), color: vx(`text-on-${vortex}-strong`) },
          },
          {
            props: { colorSeverity: mui, variant: "outlined" as const },
            style: {
              border: `${vx("border-width-default")} solid ${vx(`border-${vortex}`)}`,
              color: vx("text-primary"),
              "& .MuiAlert-icon": { color: vx(`icon-${vortex}`) },
            },
          },
        ]),
      },
    },
  },
  MuiSnackbarContent: {
    styleOverrides: {
      root: { ...INVERSE, borderRadius: vx("radius-small"), paddingInline: vx("space-medium") },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: { ...INVERSE, borderRadius: vx("radius-xx-small"), padding: `${vx("space-xx-small")} ${vx("space-x-small")}` }, // 4 px: por valor igual
      arrow: { color: vx("background-inverse") },
    },
  },
  MuiBackdrop: {
    styleOverrides: {
      root: {
        variants: [{
          props: { invisible: false },
          // A Fade controla `opacity` inline; a opacidade da camada entra na cor, que dá o mesmo resultado.
          style: { backgroundColor: `color-mix(in srgb, ${vx("background-backdrop")} calc(${vx("opacity-backdrop")} * 100%), transparent)` },
        }],
      },
    },
  },
};
