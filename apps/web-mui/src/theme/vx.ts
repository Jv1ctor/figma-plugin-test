// Autocontido: sem imports (a Task 14 embute o tema no export do MUI).

/** `var(--vx-<nome>)` de um token semantic/specific, com `/` → `-` já aplicado. Nunca `--vx-base-*`. */
export const vx = (name: string): string => `var(--vx-${name})`;

export type TextGroup = "display" | "heading" | "body" | "label";
export type TextSize = "large" | "medium" | "small";

/** Estilo de texto Vortex (`typography/<grupo>/<tamanho>/*`) em vars. */
export function textStyle(group: TextGroup, size: TextSize) {
  const t = (prop: string) => vx(`typography-${group}-${size}-${prop}`);
  return {
    fontFamily: vx(`typography-${group}-font-family`),
    fontSize: t("font-size"),
    lineHeight: t("line-height"),
    fontWeight: t("font-weight"),
    letterSpacing: t("letter-spacing"),
  };
}

/** Paletas de feedback do Vortex pela cor do MUI. */
export const STATUS = [
  { mui: "error", vortex: "danger" },
  { mui: "warning", vortex: "warning" },
  { mui: "info", vortex: "information" },
  { mui: "success", vortex: "success" },
] as const;
