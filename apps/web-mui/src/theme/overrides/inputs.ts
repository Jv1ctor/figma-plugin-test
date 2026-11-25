// Campos: TextField (OutlinedInput, InputBase, rótulo, ajuda), FormControlLabel, Autocomplete (spec §8).
// Lacunas mantidas: campo Filled e borda de hover dos campos.
import type { Components, Theme } from "@mui/material/styles";
import { textStyle, vx } from "../vx.ts";

type Overrides = Components<Omit<Theme, "components">>;

const OUTLINE = ".MuiOutlinedInput-notchedOutline";

export const inputs: Overrides = {
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: vx("radius-x-small"),
        // Ordem importa (mesma especificidade): foco, depois disabled, depois erro, que vence os dois.
        [`&.Mui-focused ${OUTLINE}`]: { borderColor: vx("border-focus"), borderWidth: vx("border-width-focus") },
        [`&.Mui-disabled ${OUTLINE}`]: { borderColor: vx("border-strong") },
        [`&.Mui-error ${OUTLINE}`]: { borderColor: vx("border-danger") },
      },
      notchedOutline: { borderColor: vx("border-strong"), borderWidth: vx("border-width-default") },
    },
  },
  MuiInputBase: {
    styleOverrides: {
      // Disabled = aparência habilitada (o MUI apaga o texto com text.disabled)
      root: { "&.Mui-disabled": { color: vx("text-primary") } },
      input: { "&.Mui-disabled": { WebkitTextFillColor: vx("text-primary") } },
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      root: {
        "&.Mui-disabled": { color: vx("text-secondary") },
        "&.Mui-error": { color: vx("text-danger") },
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        "&.Mui-disabled": { color: vx("text-secondary") },
        "&.Mui-error": { color: vx("text-danger") },
      },
    },
  },
  MuiFormControlLabel: {
    styleOverrides: {
      root: { "& .MuiFormControlLabel-label.Mui-disabled": { color: "inherit" } },
    },
  },
  MuiAutocomplete: {
    styleOverrides: {
      // A lista de opções é um menu: superfície que flutua, raio de menu e texto de menu
      paper: { backgroundColor: vx("background-surface-raised"), backgroundImage: "none", borderRadius: vx("radius-small"), boxShadow: vx("shadow-raised") },
      option: textStyle("label", "medium"),
      // Mesmo styled do MUI (o listbox), para vencer o `opacity: disabledOpacity` dele pela ordem
      listbox: { '& .MuiAutocomplete-option[aria-disabled="true"]': { opacity: vx("opacity-disabled") } },
    },
  },
};
