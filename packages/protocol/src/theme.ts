export const TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

export type Token = (typeof TOKENS)[number];
export type ThemeMode = "light" | "dark";
export const MODES: readonly ThemeMode[] = ["light", "dark"];

export interface Theme {
  name: string;
  /** rem */
  radius: number;
  light: Record<Token, string>;
  dark: Record<Token, string>;
}

/** Figma-side naming, shared so every consumer agrees on it. */
export const FIGMA_COLLECTION = "shadcn/theme";
export const RADIUS_VARIABLE = "radius/base";
export const colorVariableName = (token: Token) => `color/${token}`;
export const REM_PX = 16;
