import type { Mode, TokenSet } from "@token-bridge/tokens";
import { collectRules, declKey, declsFor, extractVars, winners, type CollectedRule, type Decl, type InspectState, type Pseudo } from "./collect.ts";
import { propertyLabel } from "./labels.ts";
import { createTokenLookup } from "./tokens.ts";

export type { InspectState };

export interface InspectRow {
  state: InspectState;
  property: string;
  label: string;
  token: string;
  layer: "semantic" | "specific" | "base"; // "base" = violação, exibida como aviso
  value: string;
  inherited: boolean;
  pseudo?: Pseudo;
}
export interface InspectResult { component: string; spot?: string; rows: InspectRow[] }

const STATE_ORDER: InspectState[] = ["rest", "hover", "active", "focus", "disabled"];
const INHERITED = ["color", "font-size", "font-weight", "font-family"];
const MAX_DEPTH = 8;

function componentOf(el: Element): string {
  let cur: Element | null = el;
  for (let i = 0; cur && i <= 3; i++, cur = cur.parentElement) {
    // O MUI ordena as classes da base para a mais específica: a última `Mui*-root` nomeia o componente.
    const hits = (cur.getAttribute("class") ?? "").split(/\s+/).filter((c) => /^Mui[A-Za-z]+-root$/.test(c));
    if (hits.length) return hits[hits.length - 1]!;
  }
  return el.tagName.toLowerCase();
}

export function introspect(el: Element, opts: { doc: Document; set: TokenSet; mode: Mode; root: Element; rules?: CollectedRule[] }): InspectResult {
  const { doc, set, mode, root } = opts;
  const rules = opts.rules ?? collectRules(doc);
  const lookup = createTokenLookup(set, mode);
  const boundary = root.contains(el) ? root : doc.body; // portais MUI ficam fora de `root`
  const declCache = new Map<Element, Map<string, Decl>>();
  const winnersOf = (e: Element): Map<string, Decl> => {
    let w = declCache.get(e);
    if (!w) declCache.set(e, (w = winners(declsFor(e, rules))));
    return w;
  };
  // Propriedades personalizadas herdam no documento todo (ex.: `--mui-shadows-N` em :root).
  const varScopeOf = (e: Element): Element[] => {
    const out: Element[] = [];
    for (let p: Element | null = e; p; p = p.parentElement) out.push(p);
    return out;
  };
  const ancestorsOf = (e: Element): Element[] => {
    const out: Element[] = [];
    if (e === boundary) return out;
    for (let p = e.parentElement; p; p = p.parentElement) {
      out.push(p);
      if (p === boundary) break;
    }
    return out;
  };

  /** Nomes `--vx-*` a que um valor chega, seguindo indireções (`--variant-*`) no elemento e nos ancestrais. */
  const vxVars = (value: string, from: Element, state: InspectState, pseudo: Pseudo | undefined, depth = 0): string[] => {
    const out: string[] = [];
    for (const { name, fallback } of extractVars(value)) {
      if (name.startsWith("--vx-")) { out.push(name); continue; }
      let resolved: string[] | undefined;
      if (depth < MAX_DEPTH) {
        for (const e of varScopeOf(from)) {
          const w = winnersOf(e);
          const d = w.get(declKey(state, pseudo, name)) ?? w.get(declKey("rest", pseudo, name)) ?? w.get(declKey("rest", undefined, name));
          if (d) { resolved = vxVars(d.value, e, state, pseudo, depth + 1); break; }
        }
      }
      out.push(...(resolved ?? (fallback ? vxVars(fallback, from, state, pseudo, depth + 1) : [])));
    }
    return out;
  };

  const rows: InspectRow[] = [];
  const seen = new Set<string>();
  const emit = (d: Decl, from: Element, inherited: boolean, state: InspectState = d.state): void => {
    const label = propertyLabel(d.prop);
    if (!label) return;
    const base = state === d.state ? [] : vxVars(d.value, from, d.state, d.pseudo);
    for (const v of vxVars(d.value, from, state, d.pseudo)) {
      if (base.includes(v)) continue; // estado derivado só mostra o que a variável de variante trocou
      const ref = lookup(v);
      const key = `${state}|${d.pseudo ?? ""}|${d.prop}|${ref.token}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        state, property: d.prop, label: d.pseudo ? `${label} (${d.pseudo === "before" ? "antes" : "depois"})` : label,
        token: ref.token, layer: ref.layer, value: ref.value, inherited, ...(d.pseudo ? { pseudo: d.pseudo } : {}),
      });
    }
  };

  const own = winnersOf(el);
  // Estados que só trocam uma variável de variante (`:hover { --variant-containedBg: … }`) valem para as
  // propriedades de repouso que a usam.
  const varStates = new Set<InspectState>();
  for (const d of own.values()) if (d.prop.startsWith("--") && !d.prop.startsWith("--vx-") && d.state !== "rest") varStates.add(d.state);
  for (const d of own.values()) {
    emit(d, el, false);
    if (d.state === "rest") for (const s of varStates) if (!own.has(declKey(s, d.pseudo, d.prop))) emit(d, el, false, s);
  }
  for (const prop of INHERITED) {
    if (own.has(declKey("rest", undefined, prop))) continue;
    for (const anc of ancestorsOf(el)) {
      const d = winnersOf(anc).get(declKey("rest", undefined, prop));
      if (d) { emit(d, anc, true); break; }
    }
  }

  rows.sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state));
  const spot = (el.closest("[data-spot]") as HTMLElement | null)?.dataset.spot;
  return { component: componentOf(el), ...(spot ? { spot } : {}), rows };
}
