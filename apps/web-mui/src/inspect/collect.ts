import { beats, specificity, splitSelectors, type Specificity } from "./specificity.ts";

export type InspectState = "rest" | "hover" | "active" | "focus" | "disabled";
export type Pseudo = "before" | "after";

/** Uma declaração aplicada a um elemento. rank: 1 atributo SVG, 2 folha, 3 inline. */
export interface Decl {
  prop: string;
  value: string;
  state: InspectState;
  pseudo?: Pseudo;
  rank: 1 | 2 | 3;
  spec: Specificity;
  order: number;
}

interface RuleSelector { matchSel: string; state: InspectState; pseudo?: Pseudo; gate?: "focusable" | "mui"; spec: Specificity }
export interface CollectedRule { selectors: RuleSelector[]; decls: Array<[string, string]>; order: number }

const STATES: Array<[Exclude<InspectState, "rest">, RegExp]> = [
  ["disabled", /\.Mui-disabled(?![\w-])/g],
  ["focus", /:focus-visible(?![\w-])|:focus(?![\w-])|\.Mui-focusVisible(?![\w-])/g],
  ["active", /:active(?![\w-])|\.Mui-active(?![\w-])/g],
  ["hover", /:hover(?![\w-])/g],
];
const FUNCTIONAL = /:(?:not|is|where|has)\((?:[^()]|\([^()]*\))*\)/g;
const ATTRIBUTE = /\[[^\]]*\]/g;
const FOCUSABLE = 'button, a[href], input, select, textarea, [contenteditable], [tabindex]:not([tabindex^="-"])';
// Raízes de layout e texto nunca assumem .Mui-disabled / :active: o gate `mui` não as inclui.
const MUI_ROOT = /(?:^|\s)Mui(?!(?:Box|Stack|Grid|Container|Typography|Paper|Card|Divider|Toolbar|AppBar)-)[A-Za-z]+-root(?:\s|$)/;

/**
 * Remove estados e pseudo-elementos do seletor; devolve o seletor para `matches`, o estado, o pseudo e, quando o
 * sujeito é só um estado (`.Mui-disabled`, `:focus-visible:not(…)`), a condição para o elemento poder assumi-lo.
 * Compostos de ancestrais que seriam só estado descartam o seletor (não viram `*`).
 */
function parseSelector(raw: string): Omit<RuleSelector, "spec"> | null {
  const masked: string[] = [];
  const mask = (m: string): string => `\u0000${masked.push(m) - 1}\u0000`;
  const s = raw.replace(FUNCTIONAL, mask).replace(ATTRIBUTE, mask);
  const parts = s.split(/(\s*[>+~]\s*|\s+)/); // compostos nas posições pares, combinadores nas ímpares
  let pseudo: Pseudo | undefined;
  let state: InspectState = "rest";
  let gate: RuleSelector["gate"];
  for (let i = 0; i < parts.length; i += 2) {
    const subject = i === parts.length - 1;
    let c = parts[i]!;
    if (subject) {
      c = c.replace(/::?(before|after)(?![\w-])/g, (_, p: Pseudo) => { pseudo = p; return ""; });
      if (/::[\w-]+/.test(c)) return null;
    }
    let found = false;
    let focusState = false;
    for (const [name, re] of STATES) {
      if (re.test(c)) {
        found = true;
        if (state === "rest") state = name;
        if (name === "focus") focusState = true;
        c = c.replace(re, "");
      }
      re.lastIndex = 0;
    }
    if (found && !/[\w#.*-]/.test(c.replace(/\u0000\d+\u0000/g, ""))) { // composto só de estado
      if (!subject) return null;
      if (focusState) gate = "focusable";
      else if (state === "disabled" || state === "active") gate = "mui";
      c = `*${c}`;
    } else if (c === "") c = "*";
    parts[i] = c;
  }
  const out = parts.join("").replace(/\u0000(\d+)\u0000/g, (_, i: string) => masked[Number(i)]!);
  return { matchSel: out.trim(), state, pseudo, gate };
}

/** Divide o corpo de declarações em pares nome/valor, respeitando parênteses e aspas. */
export function parseDeclarations(body: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  let depth = 0;
  let quote = "";
  let cur = "";
  const flush = (): void => {
    const i = cur.indexOf(":");
    if (i > 0) {
      const name = cur.slice(0, i).trim();
      const value = cur.slice(i + 1).replace(/!important\s*$/i, "").trim();
      if (name && value) out.push([name.startsWith("--") ? name : name.toLowerCase(), value]);
    }
    cur = "";
  };
  for (const ch of body) {
    if (quote) { if (ch === quote) quote = ""; }
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) { flush(); continue; }
    cur += ch;
  }
  flush();
  return out;
}

function bodyOf(cssText: string): string {
  const open = cssText.indexOf("{");
  const close = cssText.lastIndexOf("}");
  return open < 0 ? "" : cssText.slice(open + 1, close < 0 ? undefined : close);
}

function mediaMatches(doc: Document, text: string): boolean {
  const mm = doc.defaultView?.matchMedia;
  if (typeof mm !== "function") return true;
  try { return mm.call(doc.defaultView, text).matches; } catch { return true; }
}

/** Regras de estilo de primeiro nível e de `@media` que casam, na ordem do documento. Folhas inacessíveis são ignoradas. */
export function collectRules(doc: Document): CollectedRule[] {
  const out: CollectedRule[] = [];
  const visit = (rules: CSSRuleList): void => {
    for (const rule of Array.from(rules)) {
      if ("selectorText" in rule) {
        const r = rule as CSSStyleRule;
        const selectors: RuleSelector[] = [];
        for (const raw of splitSelectors(r.selectorText)) {
          const parsed = parseSelector(raw);
          if (parsed) selectors.push({ ...parsed, spec: specificity(raw) });
        }
        if (selectors.length) out.push({ selectors, decls: parseDeclarations(bodyOf(r.cssText)), order: out.length });
      } else if ("media" in rule && "cssRules" in rule) {
        if (mediaMatches(doc, (rule as CSSMediaRule).media.mediaText)) visit((rule as CSSMediaRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(doc.styleSheets)) {
    try { visit(sheet.cssRules); } catch { /* folha cross-origin ou inacessível */ }
  }
  return out;
}

/** Todas as declarações que se aplicam diretamente a `el`: folhas, `style` inline e atributos SVG fill/stroke. */
export function declsFor(el: Element, rules: CollectedRule[]): Decl[] {
  const out: Decl[] = [];
  for (const rule of rules) {
    const best = new Map<string, RuleSelector>(); // melhor seletor casado por (estado, pseudo)
    for (const sel of rule.selectors) {
      let hit = false;
      try { hit = el.matches(sel.matchSel); } catch { hit = false; } // pseudo-classe que o motor não conhece
      if (hit && sel.gate === "focusable") hit = el.matches(FOCUSABLE);
      if (hit && sel.gate === "mui") hit = MUI_ROOT.test(el.getAttribute("class") ?? "");
      if (!hit) continue;
      const k = `${sel.state}|${sel.pseudo ?? ""}`;
      const cur = best.get(k);
      if (!cur || !beats(cur.spec, sel.spec)) best.set(k, sel);
    }
    for (const sel of best.values()) {
      for (const [prop, value] of rule.decls) out.push({ prop, value, state: sel.state, pseudo: sel.pseudo, rank: 2, spec: sel.spec, order: rule.order });
    }
  }
  for (const attr of ["fill", "stroke"]) {
    const v = el.getAttribute(attr);
    if (v) out.push({ prop: attr, value: v, state: "rest", rank: 1, spec: [0, 0, 0], order: -1 });
  }
  const inline = el.getAttribute("style");
  if (inline) for (const [prop, value] of parseDeclarations(inline)) out.push({ prop, value, state: "rest", rank: 3, spec: [0, 0, 0], order: Infinity });
  return out;
}

function wins(a: Decl, b: Decl): boolean {
  if (a.rank !== b.rank) return a.rank > b.rank;
  if (a.spec.join() !== b.spec.join()) return beats(a.spec, b.spec);
  return a.order >= b.order;
}

export const declKey = (state: InspectState, pseudo: Pseudo | undefined, prop: string): string => `${state}|${pseudo ?? ""}|${prop}`;

/** Declaração vencedora por (estado, pseudo, propriedade). */
export function winners(decls: Decl[]): Map<string, Decl> {
  const m = new Map<string, Decl>();
  for (const d of decls) {
    const k = declKey(d.state, d.pseudo, d.prop);
    const cur = m.get(k);
    if (!cur || wins(d, cur)) m.set(k, d);
  }
  return m;
}

/** `var(--nome[, fallback])` de primeiro nível dentro de um valor. */
export function extractVars(value: string): Array<{ name: string; fallback?: string }> {
  const out: Array<{ name: string; fallback?: string }> = [];
  let i = 0;
  while ((i = value.indexOf("var(", i)) >= 0) {
    let depth = 1;
    let j = i + 4;
    while (j < value.length && depth > 0) { if (value[j] === "(") depth++; else if (value[j] === ")") depth--; j++; }
    const inner = value.slice(i + 4, j - 1);
    const comma = inner.indexOf(",");
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    if (name.startsWith("--")) out.push({ name, fallback: comma < 0 ? undefined : inner.slice(comma + 1).trim() });
    i = j;
  }
  return out;
}
