import type { Flex, Layer, OptionalGroup, TokenSet } from "./types.ts";

export const COLOR_PALETTES: readonly string[] = [
  "brand-1", "brand-2", "brand-3", "brand-4", "neutral", "danger", "warning", "success", "information",
];

const DATA_GROUPS = [1, 2, 3, 4, 5, 6].map((n) => `data-${n}`);
const LOCKED_GROUPS = new Set([
  "danger", "warning", "success", "information",
  "space", "radius", "border-width", "opacity", "font-size", "line-height", "font-weight", "letter-spacing",
]);
const TYPOGRAPHY_PARTS = new Set(["font-size", "line-height", "font-weight", "letter-spacing", "font-family"]);

/** "brand-1/600" → "brand-1" */
export function baseGroupOf(baseName: string): string {
  const i = baseName.indexOf("/");
  return i < 0 ? baseName : baseName.slice(0, i);
}

/** Nível de flexibilidade de um token da base (spec §5.2). */
export function flexOfBase(name: string): Flex {
  const g = baseGroupOf(name);
  if (LOCKED_GROUPS.has(g)) return "locked";
  if (g === "neutral" || g.startsWith("data-")) return "adjustable";
  return "free"; // brand-1..4, font-family
}

/** Grupos da base aceitos por um token semantic/specific (spec §6, "Grupo certo"). */
export function allowedBaseGroups(_layer: "semantic" | "specific", tokenName: string): string[] {
  const parts = tokenName.split("/");
  const head = parts[0];
  const last = parts[parts.length - 1];
  switch (head) {
    case "text": case "icon": case "background": case "border":
      return [...COLOR_PALETTES];
    case "data": return [...DATA_GROUPS];
    case "space": case "radius": case "border-width": case "opacity":
      return [head === "space" ? "space" : head];
    case "typography":
      return TYPOGRAPHY_PARTS.has(last) ? [last] : [];
    case "shadow":
      if (last === "color") return [...COLOR_PALETTES, "opacity"];
      return ["offset-x", "offset-y", "blur", "spread"].includes(last) ? ["space"] : [];
    default: return [];
  }
}

function optionalGroupOfBase(group: string): OptionalGroup | undefined {
  if (/^brand-[234]$/.test(group)) return group as OptionalGroup;
  if (/^data-[1-6]$/.test(group)) return "data";
  return undefined;
}

function optionalGroupOfAlias(name: string): OptionalGroup | undefined {
  let m = /^background\/accent-([234])\//.exec(name) ?? /^(?:text|icon)\/on-accent-([234])-strong$/.exec(name);
  if (m) return `brand-${m[1]}` as OptionalGroup;
  if (name.startsWith("data/")) return "data";
  return undefined;
}

/** Token desligado por pertencer a um grupo opcional desligado, ou depender dele (spec §5.2). */
export function isDisabled(set: TokenSet, layer: Layer, name: string): boolean {
  const group = layer === "base" ? optionalGroupOfBase(baseGroupOf(name)) : optionalGroupOfAlias(name);
  return group !== undefined && set.disabledGroups.includes(group);
}
