import type { AliasValue, TokenSet } from "./types.ts";

export interface LayerDiff { added: string[]; changed: string[]; removed: string[] }
export interface SetDiff {
  base: LayerDiff; semantic: LayerDiff; specific: LayerDiff; styles: LayerDiff; total: number;
}

const aliasKey = (v: AliasValue): string => (typeof v === "string" ? v : `${v.color}|${v.opacity}`);

/** Chave comparável: type, scopes e valor (ignora description, flex e disabledGroups). */
type Sig = Record<string, string>;

function diffMaps(from: Record<string, string>, to: Record<string, string>): LayerDiff {
  const names = (pred: (n: string) => boolean, src: Record<string, string>) => Object.keys(src).filter(pred).sort();
  return {
    added: names((n) => !(n in from), to),
    removed: names((n) => !(n in to), from),
    changed: names((n) => n in to && from[n] !== to[n], from),
  };
}

function layerSigs(set: TokenSet, layer: "base" | "semantic" | "specific"): Sig {
  const out: Sig = {};
  for (const t of Object.values(set[layer])) {
    const value = "value" in t ? String(t.value) : `${aliasKey(t.values.light)}||${aliasKey(t.values.dark)}`;
    out[t.name] = JSON.stringify([t.type, [...t.scopes], value]);
  }
  return out;
}

function styleSigs(set: TokenSet): Sig {
  const out: Sig = {};
  for (const s of set.textStyles) {
    out[`text:${s.name}`] = JSON.stringify([s.fontSize, s.lineHeight, s.fontWeight, s.letterSpacing, s.fontFamily]);
  }
  for (const s of set.shadowStyles) {
    out[`shadow:${s.name}`] = JSON.stringify([s.offsetX, s.offsetY, s.blur, s.spread, s.color]);
  }
  return out;
}

export function diffSets(from: TokenSet, to: TokenSet): SetDiff {
  const base = diffMaps(layerSigs(from, "base"), layerSigs(to, "base"));
  const semantic = diffMaps(layerSigs(from, "semantic"), layerSigs(to, "semantic"));
  const specific = diffMaps(layerSigs(from, "specific"), layerSigs(to, "specific"));
  const styles = diffMaps(styleSigs(from), styleSigs(to));
  const total = [base, semantic, specific, styles]
    .reduce((n, d) => n + d.added.length + d.changed.length + d.removed.length, 0);
  return { base, semantic, specific, styles, total };
}
