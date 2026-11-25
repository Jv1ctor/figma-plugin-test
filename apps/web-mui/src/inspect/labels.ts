const SIDES = "(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?";
const BORDER_COLOR = new RegExp(`^border${SIDES}(?:-color)?$`);
const BORDER_WIDTH = new RegExp(`^border${SIDES}-width$`);
const BORDER_RADIUS = /^border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius$/;

/** Rótulo pt-BR de uma propriedade CSS (tabela da spec §5). `undefined` = ignorar a propriedade. */
export function propertyLabel(cssProperty: string): string | undefined {
  const p = cssProperty.toLowerCase();
  if (p === "background" || p === "background-color") return "fundo";
  if (p === "color") return "texto";
  if (p === "fill") return "preenchimento";
  if (p === "stroke") return "traço";
  if (BORDER_RADIUS.test(p)) return "raio";
  if (BORDER_WIDTH.test(p)) return "espessura da borda";
  if (BORDER_COLOR.test(p)) return "borda";
  if (p.startsWith("padding")) return "padding";
  if (p === "gap" || p === "row-gap" || p === "column-gap" || p.startsWith("margin")) return "espaçamento";
  if (p === "box-shadow") return "sombra";
  if (p === "opacity") return "opacidade";
  if (p.startsWith("outline")) return "foco";
  if (p === "font-size") return "tamanho da fonte";
  if (p === "line-height") return "altura de linha";
  if (p === "font-weight") return "peso";
  if (p === "font-family") return "família";
  if (p === "letter-spacing") return "espaçamento entre letras";
  return undefined;
}
