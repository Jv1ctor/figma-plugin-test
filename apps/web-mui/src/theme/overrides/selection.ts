// Seleção: Checkbox, Radio, Switch, Slider (spec §8: marcado border/selected, desmarcado border/strong,
// botão do switch background/surface-raised). Lacunas mantidas: hover translúcido e elevação do botão do Switch
// e do polegar do Slider.
import type { Components, Theme } from "@mui/material/styles";
import { vx } from "../vx.ts";

type Overrides = Components<Omit<Theme, "components">>;

const COLORS = ["primary", "secondary", "error", "warning", "info", "success"] as const;

/** Checkbox e Radio: o ícone é desenhado com currentColor. Disabled = aparência habilitada de cada cor. */
function checkable(checked: string[]) {
  const sel = (suffix = "") => checked.map((s) => `${s}${suffix}`).join(", ");
  return {
    root: ({ theme }: { theme: Omit<Theme, "components"> }) => ({
      color: vx("border-strong"),
      "&.Mui-disabled": { color: vx("border-strong") },
      variants: COLORS.map((color) => {
        const on = color === "primary" ? vx("border-selected") : theme.vars.palette[color].main;
        return { props: { color }, style: { [sel()]: { color: on }, [sel(".Mui-disabled")]: { color: on } } };
      }),
    }),
  };
}

export const selection: Overrides = {
  MuiCheckbox: { styleOverrides: checkable(["&.Mui-checked", "&.MuiCheckbox-indeterminate"]) },
  MuiRadio: { styleOverrides: checkable(["&.Mui-checked"]) },
  MuiSwitch: {
    styleOverrides: {
      root: {
        // O .Mui-disabled fica no switchBase, irmão do trilho: a opacidade vai no root, uma vez só.
        "&:has(> .Mui-disabled)": { opacity: vx("opacity-disabled") },
        // Dentro de um FormControlLabel desabilitado, quem esmaece é o FormControlLabel.
        ".Mui-disabled &:has(> .Mui-disabled)": { opacity: 1 },
      },
      switchBase: {
        "&.Mui-disabled": { opacity: 1 },
        "&.Mui-disabled + .MuiSwitch-track": { opacity: 1 },
        variants: [{
          props: { color: "primary" as const },
          style: { "&.Mui-checked + .MuiSwitch-track": { backgroundColor: vx("border-selected"), opacity: 1 } },
        }],
      },
      track: { backgroundColor: vx("border-strong"), opacity: 1, borderRadius: vx("radius-full") },
      thumb: { backgroundColor: vx("background-surface-raised"), borderRadius: vx("radius-full") },
    },
  },
  MuiSlider: {
    styleOverrides: {
      root: {
        borderRadius: vx("radius-full"),
        variants: [{
          props: { color: "primary" as const },
          style: { color: vx("border-selected"), "&.Mui-disabled": { color: vx("border-selected") } },
        }],
      },
      rail: {
        variants: [{ props: { track: "normal" as const }, style: { backgroundColor: vx("border-strong"), opacity: 1 } }],
      },
      thumb: { borderRadius: vx("radius-full") },
    },
  },
};
