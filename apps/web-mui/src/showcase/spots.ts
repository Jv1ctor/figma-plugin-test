// Liga cada peça da vitrine aos tokens semantic que ela consome (fonte: tabela "Correspondências" da spec §8).

type Group = "display" | "heading" | "body" | "label";
type Size = "large" | "medium" | "small";

/** Variáveis de um estilo de texto (`typography/<grupo>/<tamanho>`). */
const text = (group: Group, ...sizes: Size[]): string[] => [
  `typography/${group}/font-family`,
  ...sizes.flatMap((s) => ["font-size", "line-height", "font-weight", "letter-spacing"].map((p) => `typography/${group}/${s}/${p}`)),
];
const shadow = (role: "raised" | "overlay"): string[] =>
  ["offset-x", "offset-y", "blur", "spread", "color"].map((p) => `shadow/${role}/${p}`);

const LABEL = text("label", "medium");
const DISABLED = ["opacity/disabled"];
const FIELD = ["border/strong", "border-width/default", "radius/x-small", "text/primary", "text/secondary", ...text("body", "medium", "small")];
const SELECTION = ["border/selected", "border/strong", "text/primary", ...text("body", "medium")];
const SURFACE = ["background/surface", "radius/medium", ...shadow("raised")];
const RAISED = ["background/surface-raised", "radius/small", ...shadow("raised")];
const CHIP = ["radius/full", "space/small", ...text("body", "small")];
const TERTIARY = ["text/primary", "icon/primary", "border/strong", "border-width/default", "background/action/tertiary-hover", "background/action/tertiary-pressed"];
const action = (kind: "primary" | "secondary" | "danger"): string[] => [
  `background/action/${kind}`, `background/action/${kind}-hover`, `background/action/${kind}-pressed`, `text/on-action-${kind}`,
  "radius/x-small", "space/medium", ...LABEL,
];
const strong = (palette: string): string[] => [`background/${palette}/strong`, `text/on-${palette}-strong`];

export const SPOTS = {
  // Painel
  "typography-display": ["text/primary", ...text("display", "large", "medium", "small")],
  "typography-heading": ["text/primary", ...text("heading", "large", "medium", "small")],
  "typography-body": ["text/primary", "text/secondary", ...text("body", "medium", "small")],
  "card": [...SURFACE, "space/medium", "space/large", "text/primary", "text/secondary", ...text("heading", "small"), ...text("body", "small")],
  "chip-default": ["background/neutral/subtle", "text/primary", ...CHIP],
  "chip-primary": ["background/accent-1/strong", "text/on-accent-1-strong", ...CHIP],
  "chip-secondary": ["background/accent-2/strong", "text/on-accent-2-strong", ...CHIP],
  "chip-danger": [...strong("danger"), ...CHIP],
  "chip-warning": [...strong("warning"), ...CHIP],
  "chip-success": [...strong("success"), ...CHIP],
  "chip-information": [...strong("information"), ...CHIP],
  "avatar": ["background/neutral/strong", "text/on-neutral-strong", "radius/full"],
  "avatar-group": ["background/neutral/strong", "text/on-neutral-strong", "radius/full", "border-width/strong"],
  "badge-primary": ["background/accent-1/strong", "text/on-accent-1-strong", "radius/full"],
  "badge-secondary": ["background/accent-2/strong", "text/on-accent-2-strong", "radius/full"],
  "badge-danger": [...strong("danger"), "radius/full"],
  "progress": [], // cor do Progress é Lacuna: fica com o MUI, nenhum token
  "tabs": ["border/selected", "border-width/selected", "background/selected", "text/primary", "text/secondary", "space/small", "space/medium", ...LABEL],
  "table": ["border/subtle", "border-width/default", "radius/none", "space/medium", "text/primary", ...text("body", "small")],
  // Cadastro
  "textfield-empty": [...FIELD],
  "textfield-filled": [...FIELD],
  "textfield-focus": [...FIELD, "border/focus", "border-width/focus"],
  "textfield-error": [...FIELD, "border/danger", "text/danger"],
  "textfield-disabled": [...FIELD, ...DISABLED],
  "select": [...FIELD, ...RAISED, ...text("label", "medium")],
  "autocomplete": [...FIELD, ...RAISED, "icon/primary"],
  "checkbox": [...SELECTION, "space/x-small"],
  "radio": [...SELECTION, "space/x-small"],
  "button-contained-primary": action("primary"),
  "button-contained-secondary": action("secondary"),
  "button-contained-danger": action("danger"),
  "button-outlined": [...TERTIARY, "radius/x-small", "space/medium", ...LABEL],
  "button-text": [...TERTIARY, "radius/x-small", "space/x-small", ...LABEL],
  "button-disabled": [...action("primary"), ...TERTIARY, ...DISABLED],
  "icon-button": ["icon/primary", "background/action/tertiary-hover", "background/action/tertiary-pressed", "radius/full", "space/x-small"],
  "link": ["text/link", ...text("body", "small")],
} satisfies Record<string, string[]>;

export type SpotId = keyof typeof SPOTS;
