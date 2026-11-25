import { MODE_ATTR, type CssVarMap } from "@token-bridge/tokens";

type Block = keyof CssVarMap;
const BLOCKS: readonly Block[] = ["root", "light", "dark"];

/** Mesmos seletores de `toCss` (e do `colorSchemeSelector` do tema MUI). O escuro vem por último para vencer o `:root`. */
const SELECTORS: Record<Block, string> = {
  root: ":root",
  light: `:root, [${MODE_ATTR}="light"]`,
  dark: `[${MODE_ATTR}="dark"]`,
};

export const RUNTIME_STYLE_ID = "vx-runtime";

/**
 * Folha de estilo viva com as vars Vortex. `sync` compara com o último map
 * e só escreve (setProperty/removeProperty) as variáveis que mudaram.
 */
export class RuntimeSheet {
  private readonly styles: Record<Block, CSSStyleDeclaration>;
  private last: CssVarMap = { root: {}, light: {}, dark: {} };

  constructor(doc: Document = document) {
    let el = doc.getElementById(RUNTIME_STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = doc.createElement("style");
      el.id = RUNTIME_STYLE_ID;
      doc.head.prepend(el);
    }
    el.textContent = BLOCKS.map((b) => `${SELECTORS[b]} {}`).join("\n");
    const rules = el.sheet!.cssRules;
    this.styles = {
      root: (rules[0] as CSSStyleRule).style,
      light: (rules[1] as CSSStyleRule).style,
      dark: (rules[2] as CSSStyleRule).style,
    };
  }

  sync(map: CssVarMap): void {
    for (const block of BLOCKS) {
      const prev = this.last[block];
      const next = map[block];
      const style = this.styles[block];
      for (const name of Object.keys(prev)) if (!(name in next)) style.removeProperty(name);
      for (const [name, value] of Object.entries(next)) if (prev[name] !== value) style.setProperty(name, value);
    }
    this.last = { root: { ...map.root }, light: { ...map.light }, dark: { ...map.dark } };
  }
}
