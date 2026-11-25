/** Concatena as regras CSSOM de #vx-runtime (o textContent não reflete edições via CSSOM). */
export function cssText(doc: Document = document): string {
  const el = doc.getElementById("vx-runtime") as HTMLStyleElement | null;
  if (!el?.sheet) return "";
  return Array.from(el.sheet.cssRules, (r) => r.cssText).join("\n");
}

/** Concatena o CSS gerado pelo Emotion em document.head. */
export function emotionCss(doc: Document = document): string {
  return Array.from(doc.head.querySelectorAll("style[data-emotion]"), (s) => {
    const sheet = (s as HTMLStyleElement).sheet;
    const fromRules = sheet ? Array.from(sheet.cssRules, (r) => r.cssText).join("\n") : "";
    return `${s.textContent ?? ""}\n${fromRules}`;
  }).join("\n");
}

/** Regras de estilo de primeiro nível geradas pelo Emotion. */
export function emotionStyleRules(doc: Document = document): CSSStyleRule[] {
  return Array.from(doc.head.querySelectorAll("style[data-emotion]")).flatMap((s) => {
    const sheet = (s as HTMLStyleElement).sheet;
    return sheet ? Array.from(sheet.cssRules).filter((r): r is CSSStyleRule => "selectorText" in r) : [];
  });
}

import { beats, specificity, splitSelectors, type Specificity } from "../src/inspect/specificity.ts";

export { beats, specificity, splitSelectors };
export type { Specificity };

/**
 * Valor declarado que vence a cascata para `prop` em `el`, só com as regras de primeiro nível do Emotion
 * (sem @media): maior especificidade e, no empate, a última regra. O jsdom não resolve a cascata sozinho.
 */
export function winningValue(el: Element, prop: string, doc: Document = document): string | undefined {
  let best: { spec: Specificity; value: string } | undefined;
  for (const rule of emotionStyleRules(doc)) {
    const value = rule.style.getPropertyValue(prop);
    if (!value) continue;
    for (const sel of splitSelectors(rule.selectorText)) {
      let hit = false;
      try { hit = el.matches(sel); } catch { hit = false; } // pseudo-classe que o jsdom não conhece
      if (!hit) continue;
      const spec = specificity(sel);
      if (!best || !beats(best.spec, spec)) best = { spec, value: value.trim() };
    }
  }
  return best?.value;
}
