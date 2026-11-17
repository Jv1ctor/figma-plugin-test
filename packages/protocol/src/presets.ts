import { cssToOklch, lightnessOf } from "./color.ts";
import type { Theme, Token } from "./theme.ts";

/** Tailwind v4 neutral ramps (the steps shadcn's themes actually use). */
type Ramp = Record<50 | 100 | 200 | 400 | 500 | 800 | 900 | 950, string>;

export const BASE_COLORS = {
  neutral: {
    50: "oklch(0.985 0 0)", 100: "oklch(0.97 0 0)", 200: "oklch(0.922 0 0)", 400: "oklch(0.708 0 0)",
    500: "oklch(0.556 0 0)", 800: "oklch(0.269 0 0)", 900: "oklch(0.205 0 0)", 950: "oklch(0.145 0 0)",
  },
  zinc: {
    50: "oklch(0.985 0 0)", 100: "oklch(0.967 0.001 286.375)", 200: "oklch(0.92 0.004 286.32)",
    400: "oklch(0.705 0.015 286.067)", 500: "oklch(0.552 0.016 285.938)", 800: "oklch(0.274 0.006 286.033)",
    900: "oklch(0.21 0.006 285.885)", 950: "oklch(0.141 0.005 285.823)",
  },
  slate: {
    50: "oklch(0.984 0.003 247.858)", 100: "oklch(0.968 0.007 247.896)", 200: "oklch(0.929 0.013 255.508)",
    400: "oklch(0.704 0.04 256.788)", 500: "oklch(0.554 0.046 257.417)", 800: "oklch(0.279 0.041 260.031)",
    900: "oklch(0.208 0.042 265.755)", 950: "oklch(0.129 0.042 264.695)",
  },
  stone: {
    50: "oklch(0.985 0.001 106.423)", 100: "oklch(0.97 0.001 106.424)", 200: "oklch(0.923 0.003 48.717)",
    400: "oklch(0.709 0.01 56.259)", 500: "oklch(0.553 0.013 58.071)", 800: "oklch(0.268 0.007 34.298)",
    900: "oklch(0.216 0.006 56.043)", 950: "oklch(0.147 0.004 49.25)",
  },
  gray: {
    50: "oklch(0.985 0.002 247.839)", 100: "oklch(0.967 0.003 264.542)", 200: "oklch(0.928 0.006 264.531)",
    400: "oklch(0.707 0.022 261.325)", 500: "oklch(0.551 0.027 264.364)", 800: "oklch(0.278 0.033 256.848)",
    900: "oklch(0.21 0.034 264.665)", 950: "oklch(0.13 0.028 261.692)",
  },
} satisfies Record<string, Ramp>;

export type BaseColor = keyof typeof BASE_COLORS;
export const BASE_COLOR_NAMES = Object.keys(BASE_COLORS) as BaseColor[];

interface Accent {
  light: string;
  dark: string;
  foreground: string;
}

/** Primary accents, as on ui.shadcn.com/themes. */
export const PRIMARY_COLORS = {
  red: { light: "oklch(0.637 0.237 25.331)", dark: "oklch(0.637 0.237 25.331)", foreground: "oklch(0.971 0.013 17.38)" },
  rose: { light: "oklch(0.645 0.246 16.439)", dark: "oklch(0.645 0.246 16.439)", foreground: "oklch(0.969 0.015 12.422)" },
  orange: { light: "oklch(0.705 0.213 47.604)", dark: "oklch(0.646 0.222 41.116)", foreground: "oklch(0.98 0.016 73.684)" },
  green: { light: "oklch(0.723 0.219 149.579)", dark: "oklch(0.696 0.17 162.48)", foreground: "oklch(0.982 0.018 155.826)" },
  blue: { light: "oklch(0.623 0.214 259.815)", dark: "oklch(0.546 0.245 262.881)", foreground: "oklch(0.97 0.014 254.604)" },
  yellow: { light: "oklch(0.795 0.184 86.047)", dark: "oklch(0.795 0.184 86.047)", foreground: "oklch(0.421 0.095 57.708)" },
  violet: { light: "oklch(0.606 0.25 292.717)", dark: "oklch(0.541 0.281 293.009)", foreground: "oklch(0.969 0.016 293.756)" },
} satisfies Record<string, Accent>;

export type PrimaryPreset = keyof typeof PRIMARY_COLORS;
export const PRIMARY_NAMES = Object.keys(PRIMARY_COLORS) as PrimaryPreset[];

/** "base" = shadcn default (primary follows the neutral ramp), a preset name, or any CSS color. */
export type PrimaryChoice = "base" | PrimaryPreset | (string & {});

export const RADIUS_PRESETS = [0, 0.3, 0.5, 0.625, 0.75, 1] as const;

const CHARTS_LIGHT = [
  "oklch(0.646 0.222 41.116)", "oklch(0.6 0.118 184.704)", "oklch(0.398 0.07 227.392)",
  "oklch(0.828 0.189 84.429)", "oklch(0.769 0.188 70.08)",
];
const CHARTS_DARK = [
  "oklch(0.488 0.243 264.376)", "oklch(0.696 0.17 162.48)", "oklch(0.769 0.188 70.08)",
  "oklch(0.627 0.265 303.9)", "oklch(0.645 0.246 16.439)",
];

function resolveAccent(primary: PrimaryChoice): Accent | null {
  if (primary === "base") return null;
  if (primary in PRIMARY_COLORS) return PRIMARY_COLORS[primary as PrimaryPreset];
  // Custom color: same value in both modes, foreground picked by lightness.
  const value = cssToOklch(primary);
  const foreground = lightnessOf(value) > 0.7 ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";
  return { light: value, dark: value, foreground };
}

export function buildTheme(opts: { base: BaseColor; primary: PrimaryChoice; radius: number; name?: string }): Theme {
  const n = BASE_COLORS[opts.base];
  const accent = resolveAccent(opts.primary);
  const white = "oklch(1 0 0)";

  const light: Record<Token, string> = {
    background: white,
    foreground: n[950],
    card: white,
    "card-foreground": n[950],
    popover: white,
    "popover-foreground": n[950],
    primary: accent?.light ?? n[900],
    "primary-foreground": accent?.foreground ?? n[50],
    secondary: n[100],
    "secondary-foreground": n[900],
    muted: n[100],
    "muted-foreground": n[500],
    accent: n[100],
    "accent-foreground": n[900],
    destructive: "oklch(0.577 0.245 27.325)",
    border: n[200],
    input: n[200],
    ring: accent?.light ?? n[400],
    "chart-1": CHARTS_LIGHT[0]!,
    "chart-2": CHARTS_LIGHT[1]!,
    "chart-3": CHARTS_LIGHT[2]!,
    "chart-4": CHARTS_LIGHT[3]!,
    "chart-5": CHARTS_LIGHT[4]!,
    sidebar: n[50],
    "sidebar-foreground": n[950],
    "sidebar-primary": accent?.light ?? n[900],
    "sidebar-primary-foreground": accent?.foreground ?? n[50],
    "sidebar-accent": n[100],
    "sidebar-accent-foreground": n[900],
    "sidebar-border": n[200],
    "sidebar-ring": accent?.light ?? n[400],
  };

  const dark: Record<Token, string> = {
    background: n[950],
    foreground: n[50],
    card: n[900],
    "card-foreground": n[50],
    popover: n[900],
    "popover-foreground": n[50],
    primary: accent?.dark ?? n[200],
    "primary-foreground": accent?.foreground ?? n[900],
    secondary: n[800],
    "secondary-foreground": n[50],
    muted: n[800],
    "muted-foreground": n[400],
    accent: n[800],
    "accent-foreground": n[50],
    destructive: "oklch(0.704 0.191 22.216)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: accent?.dark ?? n[500],
    "chart-1": CHARTS_DARK[0]!,
    "chart-2": CHARTS_DARK[1]!,
    "chart-3": CHARTS_DARK[2]!,
    "chart-4": CHARTS_DARK[3]!,
    "chart-5": CHARTS_DARK[4]!,
    sidebar: n[900],
    "sidebar-foreground": n[50],
    "sidebar-primary": accent?.dark ?? "oklch(0.488 0.243 264.376)",
    "sidebar-primary-foreground": accent?.foreground ?? n[50],
    "sidebar-accent": n[800],
    "sidebar-accent-foreground": n[50],
    "sidebar-border": "oklch(1 0 0 / 10%)",
    "sidebar-ring": accent?.dark ?? n[500],
  };

  const primaryLabel = opts.primary === "base" ? "" : `-${opts.primary.startsWith("#") ? "custom" : opts.primary}`;
  return { name: opts.name ?? `${opts.base}${primaryLabel}`, radius: opts.radius, light, dark };
}
