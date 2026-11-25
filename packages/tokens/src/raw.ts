import { flexOfBase } from "./groups.ts";
import type {
  AliasToken, AliasValue, BaseToken, Mode, ShadowStyle, TextStyle, TokenSet, TokenType,
} from "./types.ts";
import { MODES } from "./types.ts";

export type RawValue =
  | { alias: string }
  | { color: { r: number; g: number; b: number; a: number } }
  | { number: number }
  | { string: string }
  | { composite: { color: string; opacity: string } };

export interface RawVariable {
  name: string;
  type: "COLOR" | "FLOAT" | "STRING";
  scopes: string[];
  description: string;
  values: Record<string, RawValue>;
}

export interface RawFigmaExport {
  fileKey: string;
  exportedAt: string;
  collections: Array<{
    name: "base" | "semantic" | "specific";
    modes: string[];
    variables: RawVariable[];
  }>;
  textStyles: Array<{
    name: string;
    description: string;
    bindings: { fontSize: string; lineHeight: string; fontWeight: string; letterSpacing: string; fontFamily: string };
  }>;
  effectStyles: Array<{
    name: string;
    description: string;
    bindings: { offsetX: string; offsetY: string; blur: string; spread: string; color: string };
  }>;
}

function typeOf(v: RawVariable): TokenType {
  if (v.type === "COLOR") return "color";
  if (v.type === "STRING") return "fontFamily";
  const segs = v.name.split("/");
  const group = segs[0];
  const last = segs[segs.length - 1];
  if (group === "font-weight" || last === "font-weight") return "fontWeight";
  if (group === "opacity" || group === "letter-spacing" || last === "letter-spacing") return "number";
  return "dimension";
}

function toHex(c: { r: number; g: number; b: number; a: number }): string {
  const h = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${c.a < 1 ? h(c.a) : ""}`;
}

function baseValue(name: string, raw: RawValue | undefined): string | number {
  if (raw && "color" in raw && typeof raw.color === "object") return toHex(raw.color);
  if (raw && "number" in raw) return raw.number;
  if (raw && "string" in raw) return raw.string;
  throw new Error(`base token "${name}" has no literal value`);
}

function aliasValue(name: string, mode: string, raw: RawValue | undefined): AliasValue {
  if (raw && "alias" in raw) return raw.alias;
  if (raw && "composite" in raw) return { color: raw.composite.color, opacity: raw.composite.opacity };
  throw new Error(`token "${name}" has no alias in mode "${mode}"`);
}

export function fromFigmaExport(raw: RawFigmaExport): TokenSet {
  const set: TokenSet = {
    base: {}, semantic: {}, specific: {}, textStyles: [], shadowStyles: [], disabledGroups: [],
  };
  for (const col of raw.collections) {
    for (const v of col.variables) {
      const meta = { type: typeOf(v), scopes: [...v.scopes], description: v.description };
      if (col.name === "base") {
        const mode = col.modes[0];
        const token: BaseToken = { name: v.name, ...meta, flex: flexOfBase(v.name), value: baseValue(v.name, v.values[mode]) };
        set.base[v.name] = token;
      } else {
        const values = {} as Record<Mode, AliasValue>;
        for (const m of MODES) values[m] = aliasValue(v.name, m, v.values[m]);
        const token: AliasToken = {
          name: v.name, ...meta, flex: col.name === "semantic" ? "adjustable" : "free", values,
        };
        set[col.name][v.name] = token;
      }
    }
  }
  set.textStyles = raw.textStyles.map((s): TextStyle => ({
    name: s.name, description: s.description, ...s.bindings,
  }));
  set.shadowStyles = raw.effectStyles.map((s): ShadowStyle => ({
    name: s.name, description: s.description,
    offsetX: s.bindings.offsetX, offsetY: s.bindings.offsetY, blur: s.bindings.blur,
    spread: s.bindings.spread, color: s.bindings.color,
  }));
  return set;
}
