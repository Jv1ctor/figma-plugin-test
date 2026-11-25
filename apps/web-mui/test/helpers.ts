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

export type Specificity = [number, number, number];

/** Especificidade de um seletor simples (sem vírgula). `:not(x)` e `:has(x)` contam como `x`; pseudo-elementos contam como tipo. */
export function specificity(selector: string): Specificity {
  let s = selector.replace(/:(?:not|has)\(([^)]*)\)/g, " $1 ");
  const pseudoElements = (s.match(/::[\w-]+/g) ?? []).length;
  s = s.replace(/::[\w-]+/g, " ");
  const a = (s.match(/#[\w-]+/g) ?? []).length;
  const b = (s.match(/\.[\w-]+|\[[^\]]*\]|:[\w-]+/g) ?? []).length;
  s = s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|:[\w-]+/g, " ");
  const c = (s.match(/[a-zA-Z][\w-]*/g) ?? []).length + pseudoElements;
  return [a, b, c];
}

export const beats = (x: Specificity, y: Specificity): boolean =>
  x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : x[2] > y[2];

/** Divide uma lista de seletores nas vírgulas de primeiro nível (ignora as de dentro de `:not(…)`/`:has(…)`). */
export function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

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
