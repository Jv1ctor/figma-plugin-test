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
const CHIP = ["radius/full", "space/small", "space/x-small", "typography/body/font-family"]; // padding: medium = small, small = x-small; só a família do corpo
const TERTIARY_TEXT = ["text/primary", "icon/primary", "background/action/tertiary-hover", "background/action/tertiary-pressed"];
const TERTIARY = [...TERTIARY_TEXT, "border/strong", "border-width/default"];
const action = (kind: "primary" | "secondary" | "danger"): string[] => [
  `background/action/${kind}`, `background/action/${kind}-hover`, `background/action/${kind}-pressed`, `text/on-action-${kind}`,
  "radius/x-small", "space/medium", ...LABEL,
];
const STATUS_NAMES = ["danger", "warning", "information", "success"];
const ALERT_BASE = ["radius/xx-small", "space/medium", ...text("body", "small")];
const strong = (palette: string): string[] => [`background/${palette}/strong`, `text/on-${palette}-strong`];

const CATEGORICAL = [1, 2, 3, 4, 5, 6].map((n) => `data/categorical-${n}`);
const SEQUENTIAL = [1, 2, 3, 4, 5].map((n) => `data/sequential-${n}`);
const CHART_AXES = ["border/subtle", "border-width/default", "text/secondary", ...text("body", "small")];

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
  "icon-button": ["icon/primary", "background/action/tertiary-hover", "background/action/tertiary-pressed", "radius/full", "space/x-small", ...DISABLED],
  "link": ["text/link", ...text("body", "small")],
  // Configurações
  "switch": ["border/selected", "border/strong", "background/surface-raised", "radius/full", ...DISABLED],
  "slider": ["border/selected", "border/strong", "radius/full", ...DISABLED],
  "list": ["text/primary", "text/secondary", ...text("body", "medium", "small"), ...DISABLED],
  "accordion": ["background/surface", "border/subtle", "radius/medium", "space/x-small", "space/medium", "text/primary", ...text("body", "medium"), ...shadow("raised"), ...DISABLED],
  "divider": ["border/subtle", "border-width/default"],
  "alert-standard": [...ALERT_BASE, "text/primary", ...STATUS_NAMES.flatMap((p) => [`background/${p}/subtle`, `icon/${p}`])],
  "alert-filled": [...ALERT_BASE, ...STATUS_NAMES.flatMap(strong)],
  "alert-outlined": [...ALERT_BASE, "text/primary", "border-width/default", ...STATUS_NAMES.flatMap((p) => [`border/${p}`, `icon/${p}`])],
  "breadcrumbs": ["text/link", "text/secondary", "text/primary", ...text("body", "medium")],
  "pagination": ["radius/full", "border-width/selected", "border/selected", "background/selected", "text/primary", ...text("body", "small"), ...DISABLED],
  "stepper": ["background/selected", "border/selected", "border-width/selected", "border/subtle", "border-width/default", "text/primary", ...text("body", "small")],
  "toggle-button": ["radius/x-small", "border-width/default", "text/primary", ...DISABLED],
  "button-group": ["radius/x-small", "border/strong", "border-width/default", "space/medium", ...TERTIARY_TEXT, ...LABEL],
  "fab": ["radius/full", "background/action/primary"],
  // Overlays
  "dialog": [...action("primary"), ...action("danger"), ...TERTIARY_TEXT, "background/surface-raised", "radius/large", "space/x-small", "space/medium", "space/large", "text/primary", "text/secondary", ...shadow("overlay"), ...text("heading", "small"), ...text("body", "medium"), "background/backdrop", "opacity/backdrop"],
  "menu": [...TERTIARY, "radius/x-small", "space/medium", "background/surface-raised", "radius/small", "space/x-small", "text/primary", ...shadow("raised"), ...LABEL, ...DISABLED],
  "popover": [...TERTIARY, "radius/x-small", "space/medium", ...LABEL, "background/surface-raised", "radius/small", ...shadow("raised")],
  "snackbar": [...TERTIARY, "radius/x-small", "space/medium", ...LABEL, "background/inverse", "text/on-inverse", "radius/small", ...shadow("raised"), ...text("body", "small")],
  "tooltip": ["icon/primary", "background/action/tertiary-hover", "background/action/tertiary-pressed", "radius/full", "space/x-small", "background/inverse", "text/on-inverse", "radius/xx-small", "space/xx-small", "space/x-small"],
  "drawer": [...TERTIARY, "radius/x-small", "space/medium", ...LABEL, "background/surface-raised", ...shadow("overlay"), "background/backdrop", "opacity/backdrop", "text/primary", ...text("heading", "medium"), ...text("body", "medium"), ...DISABLED],
  // Gráficos
  "chart-bar": [...CATEGORICAL, ...CHART_AXES, "background/surface-raised", ...shadow("raised"), "text/primary"],
  "chart-line": [...CATEGORICAL.slice(0, 3), ...CHART_AXES, "background/surface-raised", ...shadow("raised"), "text/primary"],
  "chart-heatmap": [...SEQUENTIAL, "text/secondary", ...text("body", "small")],
  "chart-legend": [...CATEGORICAL, "text/secondary", ...text("body", "small")],
} satisfies Record<string, string[]>;

export type SpotId = keyof typeof SPOTS;
