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
const CHIP = ["radius/full", "space/x-small", "typography/body/font-family"]; // o Chip só lê a família do corpo; padding small = x-small
const TERTIARY_TEXT = ["text/primary", "icon/primary", "background/action/tertiary-hover", "background/action/tertiary-pressed"];
const TERTIARY = [...TERTIARY_TEXT, "border/strong", "border-width/default"];
const action = (kind: "primary" | "secondary" | "danger"): string[] => [
  `background/action/${kind}`, `background/action/${kind}-hover`, `background/action/${kind}-pressed`, `text/on-action-${kind}`,
  "radius/x-small", "space/medium", ...LABEL,
];
const STATUS_NAMES = ["danger", "warning", "information", "success"];
const ALERT_BASE = ["radius/xx-small", "space/medium", "text/primary"];
const strong = (palette: string): string[] => [`background/${palette}/strong`, `text/on-${palette}-strong`];

export const SPOTS = {
  // Painel
  "typography-display": ["text/primary", ...text("display", "large", "medium", "small")],
  "typography-heading": ["text/primary", ...text("heading", "large", "medium", "small")],
  "typography-body": ["text/primary", "text/secondary", ...text("body", "medium", "small")],
  "card": [...SURFACE, "space/medium", "space/large", "text/primary", "text/secondary", ...text("heading", "small"), ...text("heading", "medium"), ...text("heading", "large"), ...text("body", "small")],
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
  "tabs": ["border/selected", "border-width/selected", "background/selected", "text/primary", "text/secondary", "space/small", "space/medium", ...DISABLED, ...LABEL],
  "table": ["border/subtle", "border-width/default", "radius/none", "space/medium", "text/primary", ...text("body", "small")],
  // Cadastro
  "textfield-empty": [...FIELD],
  "textfield-filled": [...FIELD],
  "textfield-focus": [...FIELD, "border/focus", "border-width/focus"],
  "textfield-error": [...FIELD, "border/danger", "text/danger"],
  "textfield-disabled": [...FIELD, ...DISABLED],
  "select": [...FIELD, ...RAISED, ...text("label", "medium")],
  "autocomplete": [...FIELD, ...RAISED, "icon/primary", ...LABEL],
  "checkbox": [...SELECTION, ...DISABLED, "text/secondary", ...text("body", "small")], // + FormHelperText
  "radio": [...SELECTION, ...DISABLED, "text/secondary"], // + FormLabel (body/medium já em SELECTION)
  "button-contained-primary": action("primary"),
  "button-contained-secondary": action("secondary"),
  "button-contained-danger": action("danger"),
  "button-outlined": [...TERTIARY, "radius/x-small", "space/medium", ...LABEL],
  "button-text": [...TERTIARY_TEXT, "radius/x-small", "space/x-small", ...LABEL],
  "button-disabled": [...action("primary"), ...TERTIARY, ...DISABLED],
  "icon-button": ["icon/primary", "background/action/tertiary-hover", "background/action/tertiary-pressed", "radius/full", "space/x-small"],
  "link": ["text/link", ...text("body", "small")],
  // Configurações
  "switch": ["border/selected", "border/strong", "background/surface-raised", "radius/full", ...DISABLED],
  "slider": ["border/selected", "border/strong", "radius/full", ...DISABLED],
  "list": ["text/primary", "text/secondary", ...text("body", "medium", "small"), ...DISABLED],
  "accordion": ["background/surface", "border/subtle", "radius/medium", "space/x-small", "space/medium", "text/primary", ...text("body", "medium")],
  "divider": ["border/subtle", "border-width/default"],
  "alert-standard": [...ALERT_BASE, ...STATUS_NAMES.flatMap((p) => [`background/${p}/subtle`, `icon/${p}`])],
  "alert-filled": [...ALERT_BASE, ...STATUS_NAMES.flatMap(strong)],
  "alert-outlined": [...ALERT_BASE, "border-width/default", ...STATUS_NAMES.flatMap((p) => [`border/${p}`, `icon/${p}`])],
  "breadcrumbs": ["text/link", "text/secondary", ...text("body", "small")],
  "pagination": ["radius/full", "radius/xx-small", "border-width/default", "border-width/selected", "border/selected", "background/selected", "text/primary", ...DISABLED],
  "stepper": ["background/selected", "border/selected", "border-width/selected", "border/subtle", "border-width/default", "text/primary"],
  "toggle-button": ["radius/x-small", "border-width/default", "text/primary"],
  "button-group": ["radius/x-small", "border/strong", "border-width/default", "text/primary", ...LABEL],
  "fab": ["radius/full", "background/action/primary", "background/action/primary-hover", "background/action/primary-pressed", "text/on-action-primary"],
  // Overlays
  "dialog": ["background/surface-raised", "radius/large", "space/x-small", "space/medium", "space/large", "text/primary", ...shadow("overlay"), ...text("heading", "small"), ...text("body", "medium"), "background/backdrop", "opacity/backdrop"],
  "menu": ["background/surface-raised", "radius/small", "space/x-small", "space/medium", "text/primary", ...shadow("raised"), ...DISABLED],
  "popover": ["background/surface-raised", "radius/small", ...shadow("raised")],
  "snackbar": ["background/inverse", "text/on-inverse", "radius/small", "space/medium"],
  "tooltip": ["background/inverse", "text/on-inverse", "radius/xx-small", "space/xx-small", "space/x-small"],
  "drawer": ["background/surface-raised", ...shadow("overlay"), "background/backdrop", "opacity/backdrop"],
} satisfies Record<string, string[]>;

export type SpotId = keyof typeof SPOTS;
