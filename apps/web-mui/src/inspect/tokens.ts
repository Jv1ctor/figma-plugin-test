import { resolve, type Layer, type Mode, type Resolved, type TokenSet } from "@token-bridge/tokens";

export interface TokenRef {
  token: string;
  layer: Layer;
  value: string;
}

const slug = (name: string): string => name.replace(/\//g, "-");
const hex2 = (n: number): string => Math.round(n * 255).toString(16).padStart(2, "0");

function format(set: TokenSet, layer: Layer, name: string, r: Resolved): string {
  switch (r.kind) {
    case "missing": return "—";
    case "string": return r.value;
    case "color": return r.alpha < 1 ? `${r.hex}${hex2(r.alpha)}` : r.hex;
    case "number": {
      if (name.startsWith("opacity/")) return `${Math.round(r.value * 100)}%`;
      const type = layer === "base" ? set.base[name]?.type : set[layer][name]?.type;
      return type === "dimension" ? `${r.value} px` : String(r.value);
    }
  }
}

/** Mapeia o nome de uma variável `--vx-…` ao token (specific, depois semantic, depois base) com o valor resolvido no modo. */
export function createTokenLookup(set: TokenSet, mode: Mode): (cssVar: string) => TokenRef {
  const bySlug = new Map<string, { layer: Layer; name: string }>();
  for (const name of Object.keys(set.base)) bySlug.set(`base-${slug(name)}`, { layer: "base", name });
  for (const name of Object.keys(set.semantic)) bySlug.set(slug(name), { layer: "semantic", name });
  for (const name of Object.keys(set.specific)) bySlug.set(slug(name), { layer: "specific", name });
  const shadows = new Map(set.shadowStyles.map((s) => [slug(s.name), s.name]));
  return (cssVar) => {
    const key = cssVar.replace(/^--vx-/, "");
    const hit = bySlug.get(key);
    if (hit) return { token: hit.name, layer: hit.layer, value: format(set, hit.layer, hit.name, resolve(set, hit.layer, hit.name, mode)) };
    const shadow = shadows.get(key);
    if (shadow) return { token: shadow, layer: "semantic", value: "sombra" };
    return { token: key, layer: "semantic", value: "—" };
  };
}
