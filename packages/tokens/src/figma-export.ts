import { isDisabled } from "./groups.ts";
import type { RawFigmaExport, RawValue, RawVariable } from "./raw.ts";
import type { AliasToken, AliasValue, BaseToken, Layer, Mode, TokenSet } from "./types.ts";
import { MODES } from "./types.ts";

/** "#rrggbb[aa]" → canais 0..1 (inverso de `toHex` em raw.ts). */
function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const ch = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return { r: ch(1), g: ch(3), b: ch(5), a: hex.length > 7 ? ch(7) : 1 };
}

const rawType = (t: { type: string }): RawVariable["type"] =>
  t.type === "color" ? "COLOR" : t.type === "fontFamily" ? "STRING" : "FLOAT";

function baseRaw(t: BaseToken): RawValue {
  if (typeof t.value === "number") return { number: t.value };
  return t.type === "color" ? { color: hexToRgba(t.value) } : { string: t.value };
}

function aliasRaw(v: AliasValue): RawValue {
  return typeof v === "string" ? { alias: v } : { composite: { color: v.color, opacity: v.opacity } };
}

function variables(set: TokenSet, layer: Layer): RawVariable[] {
  const tokens: Array<BaseToken | AliasToken> = Object.values(set[layer]);
  return tokens
    .filter((t) => !isDisabled(set, layer, t.name))
    .map((t) => {
      const values: Record<string, RawValue> = {};
      if (layer === "base") values.value = baseRaw(t as BaseToken);
      else for (const m of MODES as readonly Mode[]) values[m] = aliasRaw((t as AliasToken).values[m]);
      return { name: t.name, type: rawType(t), scopes: [...t.scopes], description: t.description, values };
    });
}

/** Inverso de `fromFigmaExport`: o conjunto de tokens no formato lido do Figma. */
export function toFigmaExport(set: TokenSet, opts: { fileKey?: string } = {}): RawFigmaExport {
  return {
    fileKey: opts.fileKey ?? "",
    exportedAt: new Date().toISOString(),
    collections: [
      { name: "base", modes: ["value"], variables: variables(set, "base") },
      { name: "semantic", modes: ["light", "dark"], variables: variables(set, "semantic") },
      { name: "specific", modes: ["light", "dark"], variables: variables(set, "specific") },
    ],
    textStyles: set.textStyles.map(({ name, description, ...bindings }) => ({ name, description, bindings })),
    effectStyles: set.shadowStyles.map(({ name, description, ...bindings }) => ({ name, description, bindings })),
  };
}
