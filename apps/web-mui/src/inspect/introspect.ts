import type { Mode, TokenSet } from "@token-bridge/tokens";
import { collectRules, declKey, declsFor, extractVars, winners, type Decl, type InspectState, type Pseudo } from "./collect.ts";
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
    const hit = (cur.getAttribute("class") ?? "").split(/\s+/).find((c) => /^Mui[A-Za-z]+-root$/.test(c));
    if (hit) return hit;
  }
  return el.tagName.toLowerCase();
}

export function introspect(el: Element, opts: { doc: Document; set: TokenSet; mode: Mode; root: Element }): InspectResult {
  const { doc, set, mode, root } = opts;
  const rules = collectRules(doc);
  const lookup = createTokenLookup(set, mode);
  const boundary = root.contains(el) ? root : doc.body; // portais MUI ficam fora de `root`
  const declCache = new Map<Element, Map<string, Decl>>();
  const winnersOf = (e: Element): Map<string, Decl> => {
    let w = declCache.get(e);
    if (!w) declCache.set(e, (w = winners(declsFor(e, rules))));
    return w;
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
        for (const e of [from, ...ancestorsOf(from)]) {
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
  const emit = (d: Decl, from: Element, inherited: boolean): void => {
    const label = propertyLabel(d.prop);
    if (!label) return;
    for (const v of vxVars(d.value, from, d.state, d.pseudo)) {
      const ref = lookup(v);
      const key = `${d.state}|${d.pseudo ?? ""}|${d.prop}|${ref.token}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        state: d.state, property: d.prop, label: d.pseudo ? `${label} (${d.pseudo === "before" ? "antes" : "depois"})` : label,
        token: ref.token, layer: ref.layer, value: ref.value, inherited, ...(d.pseudo ? { pseudo: d.pseudo } : {}),
      });
    }
  };

  const own = winnersOf(el);
  for (const d of own.values()) emit(d, el, false);
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
