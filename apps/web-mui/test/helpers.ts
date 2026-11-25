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

/** Especificidade de um seletor simples (sem vírgula). `:not(x)` conta como `x`; pseudo-elementos contam como tipo. */
export function specificity(selector: string): Specificity {
  let s = selector.replace(/:not\(([^)]*)\)/g, " $1 ");
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
