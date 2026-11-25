// Exibição de dados: Chip, Badge, Avatar, AvatarGroup, Divider, Table, List (spec §8).
// Lacunas mantidas: hover translúcido e foco do Chip.
import type { Components, Theme } from "@mui/material/styles";
import { STATUS, vx } from "../vx.ts";

type Overrides = Components<Omit<Theme, "components">>;
type ChipColor = "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success";

/** Fundo e texto de cada cor de Chip e Badge. `secondary` só entra com brand-2 ligado (accent-2). */
function markColors(accent2: boolean): Array<{ color: ChipColor; bg: string; fg: string }> {
  return [
    { color: "default", bg: vx("background-neutral-subtle"), fg: vx("text-primary") },
    { color: "primary", bg: vx("background-accent-1-strong"), fg: vx("text-on-accent-1-strong") },
    ...(accent2 ? [{ color: "secondary" as const, bg: vx("background-accent-2-strong"), fg: vx("text-on-accent-2-strong") }] : []),
    ...STATUS.map((s) => ({ color: s.mui, bg: vx(`background-${s.vortex}-strong`), fg: vx(`text-on-${s.vortex}-strong`) })),
  ];
}

type OwnerState = { ownerState: { children?: unknown; orientation?: string } };
const hasChildren = ({ ownerState }: OwnerState) => Boolean(ownerState.children);
const vertical = ({ ownerState }: OwnerState) => ownerState.orientation === "vertical";
const BORDER = `${vx("border-width-default")} solid ${vx("border-subtle")}`;

export function dataDisplay({ accent2 }: { accent2: boolean }): Overrides {
  const marks = markColors(accent2);
  return {
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: vx("radius-full"),
          "&.Mui-disabled": { opacity: vx("opacity-disabled") }, // o MUI usa a própria opacidade
          variants: [
            ...marks.map(({ color, bg, fg }) => ({ props: { variant: "filled" as const, color }, style: { backgroundColor: bg, color: fg } })),
            { props: { variant: "outlined" as const }, style: { borderWidth: vx("border-width-default") } },
          ],
        },
        label: {
          variants: [
            { props: { variant: "filled" as const, size: "medium" as const }, style: { paddingInline: vx("space-small") } },
            { props: { variant: "filled" as const, size: "small" as const }, style: { paddingInline: vx("space-x-small") } },
          ],
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          borderRadius: vx("radius-full"),
          variants: marks.map(({ color, bg, fg }) => ({ props: { color }, style: { backgroundColor: bg, color: fg } })),
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          borderRadius: vx("radius-full"),
          variants: [
            { props: { variant: "rounded" as const }, style: { borderRadius: vx("radius-xx-small") } }, // 4 px: por valor igual
            { props: { variant: "square" as const }, style: { borderRadius: vx("radius-none") } },
          ],
        },
        colorDefault: { backgroundColor: vx("background-neutral-strong"), color: vx("text-on-neutral-strong") },
      },
    },
    MuiAvatarGroup: {
      styleOverrides: { root: { "& .MuiAvatar-root": { borderWidth: vx("border-width-strong") } } }, // borda 2 → strong
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: vx("border-subtle"),
          variants: [
            { props: (p: OwnerState) => !hasChildren(p) && !vertical(p), style: { borderBottomWidth: vx("border-width-default") } },
            { props: (p: OwnerState) => !hasChildren(p) && vertical(p), style: { borderRightWidth: vx("border-width-default") } },
            {
              props: (p: OwnerState) => hasChildren(p) && !vertical(p),
              style: { "&::before, &::after": { borderTopColor: vx("border-subtle"), borderTopWidth: vx("border-width-default") } },
            },
            {
              props: (p: OwnerState) => hasChildren(p) && vertical(p),
              style: { "&::before, &::after": { borderLeftColor: vx("border-subtle"), borderLeftWidth: vx("border-width-default") } },
            },
          ],
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: { root: { borderRadius: vx("radius-none") } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: BORDER,
          variants: [
            { props: { size: "medium" as const, padding: "normal" as const }, style: { padding: vx("space-medium") } },
            { props: { size: "small" as const, padding: "normal" as const }, style: { paddingInline: vx("space-medium") } },
          ],
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: { root: { "&.Mui-disabled": { opacity: vx("opacity-disabled") } } },
    },
  };
}
