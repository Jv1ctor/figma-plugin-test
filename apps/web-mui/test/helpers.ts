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
