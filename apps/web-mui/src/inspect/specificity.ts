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
