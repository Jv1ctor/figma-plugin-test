import type { Warning } from "./types.ts";

/** Propriedades aceitas no 1º nível (spec Apêndice A). */
export const PROPERTY_VOCABULARY: readonly string[] = [
  "text", "icon", "background", "border", "space", "radius", "border-width", "opacity", "data", "typography", "shadow",
];
/** Propriedades que aceitam até 4 partes (campo do composto no fim). */
const COMPOSITE_PROPERTIES = new Set(["typography", "shadow"]);

/** Vocabulário do Apêndice A, como frases; as palavras (separadas por hífen) viram o conjunto de comparação. */
const VOCABULARY_PHRASES: readonly string[] = [
  "primary", "secondary", "tertiary", // ênfase texto/ícone
  "subtle", "strong", // ênfase fundo/borda
  "canvas", "surface", "surface-raised", "inverse", "backdrop", // superfície
  "action", // ação
  "danger", "warning", "success", "information", // feedback
  "accent-1", "accent-2", "accent-3", "accent-4", // destaque
  "neutral", // neutro
  "categorical-1", "sequential-1", // série de gráfico
  "hover", "pressed", "selected", "focus", // estados
  "link", "placeholder", "brand", // texto/ícone específicos
  "none", "xx-small", "x-small", "small", "medium", "large", "x-large", "xx-large", "full", // tamanho
  "default", "disabled", // espessura, opacidade
  "display", "heading", "body", "label", // tipografia
  "raised", "overlay", // sombra
  "font-size", "line-height", "font-weight", "letter-spacing", "font-family",
  "offset-x", "offset-y", "blur", "spread", "color", // campo do composto
  "on", // par sobre fundo forte: on-<fundo>
];
const VOCABULARY_WORDS = new Set(VOCABULARY_PHRASES.flatMap((p) => p.split("-")));

const COLOR_WORDS = new Set([
  "red", "orange", "yellow", "green", "blue", "purple", "pink", "black", "white", "gray", "grey", "brown", "cyan",
  "magenta", "teal", "violet", "indigo", "gold", "silver", "beige", "sepia", "navy", "lime", "amber",
  "vermelho", "laranja", "amarelo", "verde", "azul", "roxo", "rosa", "preto", "branco", "cinza", "marrom",
  "ciano", "dourado", "prata", "bege",
]);
const PALETTE_SEGMENT = /^(?:brand-[1-4]|data-[1-6])$/; // nomes de paleta numerados (brand/neutral/status sem número são vocabulário)

const COMPONENT_WORDS = new Set([
  "button", "card", "chip", "dialog", "menu", "tab", "table", "tooltip", "avatar", "badge", "alert",
  "snackbar", "drawer", "list", "input", "field",
]);

const NAME_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*){1,3}$/;

function make(name: string, key: string, message: string): Warning {
  const token = `specific:${name}`;
  return { id: `specific-name:${token}:${key}`, token, rule: "specific-name", message };
}

/**
 * Avisos de nome de um specific (spec §6). `semantic`, quando dado, ativa a checagem de colisão com um semantic existente.
 * Os avisos de formato começam com "Formato:"; os heurísticos usam o mesmo `rule` com outra mensagem.
 */
export function checkSpecificName(name: string, semantic?: Record<string, unknown>): Warning[] {
  const out: Warning[] = [];
  const parts = name.split("/");
  const head = parts[0];

  if (!NAME_FORMAT.test(name)) {
    out.push(make(name, "format", "Formato: use minúsculas, sem acento nem espaço, com `/` entre níveis e hífen dentro do nível (2 a 3 partes; até 4 em typography e shadow)."));
  } else if (parts.length > 3 && !COMPOSITE_PROPERTIES.has(head)) {
    out.push(make(name, "parts", "Formato: no máximo 3 partes (4 só em typography e shadow); estado vai no fim com hífen (ex.: primary-hover)."));
  }
  if (!PROPERTY_VOCABULARY.includes(head)) {
    out.push(make(name, "property", `Formato: o primeiro nível deve ser uma propriedade (${PROPERTY_VOCABULARY.join(", ")}).`));
  }
  if (semantic && name in semantic) {
    out.push(make(name, "semantic", `Formato: o nome é igual ao de um semantic existente (${name}).`));
  }

  const seen = new Set<string>();
  for (const segment of parts.slice(1)) {
    if (PALETTE_SEGMENT.test(segment) && !seen.has(segment)) {
      seen.add(segment);
      out.push(make(name, `color:${segment}`, `Palavra de cor "${segment}" (nome de paleta) descreve aparência; descreva o uso.`));
      continue;
    }
    for (const word of segment.split("-")) {
      if (/^\d+$/.test(word) || seen.has(word)) continue;
      seen.add(word);
      if (COLOR_WORDS.has(word)) {
        out.push(make(name, `color:${word}`, `Palavra de cor "${word}" descreve aparência; descreva o uso.`));
      } else if (COMPONENT_WORDS.has(word)) {
        out.push(make(name, `component:${word}`, `Palavra de componente "${word}" amarra o token a um componente; descreva o uso.`));
      } else if (!VOCABULARY_WORDS.has(word)) {
        out.push(make(name, `new:${word}`, `Palavra nova "${word}" fora do vocabulário; permitido, mas descreva o uso.`));
      }
    }
  }
  return out;
}
