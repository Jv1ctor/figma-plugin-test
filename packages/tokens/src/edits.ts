import { COLOR_PALETTES, baseGroupOf, flexOfBase, isDisabled } from "./groups.ts";
import { SCALE_STEPS, generateScale } from "./color.ts";
import { valueLine, withValueLine } from "./describe.ts";
import { checkSpecificName } from "./rules/naming.ts";
import type { AliasToken, AliasValue, BaseToken, Mode, OptionalGroup, TokenSet } from "./types.ts";

export class EditError extends Error {}

const HEX = /^#[0-9a-f]{6}$/i;

function describeBase(set: TokenSet, name: string): BaseToken {
  const t = set.base[name]!;
  return { ...t, description: withValueLine(t.description, valueLine(set, "base", name)) };
}

function describeAlias(set: TokenSet, layer: "semantic" | "specific", name: string): AliasToken {
  const t = set[layer][name]!;
  return { ...t, description: withValueLine(t.description, valueLine(set, layer, name)) };
}

export function setBaseValue(set: TokenSet, name: string, value: string | number): TokenSet {
  const token = set.base[name];
  if (!token) throw new EditError(`Token da base inexistente: ${name}`);
  if (flexOfBase(name) === "locked") throw new EditError(`${name} é travado e não pode ser editado.`);
  let next: string | number = value;
  if (token.type === "color") {
    if (typeof value !== "string" || !HEX.test(value)) throw new EditError(`Cor inválida para ${name}: ${value}`);
    next = value.toLowerCase();
  } else if (token.type !== "fontFamily" && !Number.isFinite(Number(value))) {
    throw new EditError(`Valor inválido para ${name}: ${value}`);
  }
  const edited: TokenSet = { ...set, base: { ...set.base, [name]: { ...token, value: next } } };
  return { ...edited, base: { ...edited.base, [name]: describeBase(edited, name) } };
}

export function applyScale(set: TokenSet, palette: string, hex: string): TokenSet {
  const isPalette = COLOR_PALETTES.includes(palette) || /^data-[1-6]$/.test(palette);
  if (!isPalette) throw new EditError(`Paleta desconhecida: ${palette}`);
  if (flexOfBase(`${palette}/50`) === "locked") throw new EditError(`A paleta ${palette} é travada.`);
  if (!HEX.test(hex)) throw new EditError(`Cor inválida: ${hex}`);
  const sibling = Object.values(set.base).find((t) => baseGroupOf(t.name) === palette);
  if (!sibling) throw new EditError(`Paleta sem tokens na base: ${palette}`);

  const scale = generateScale(hex.toLowerCase());
  let next: TokenSet = { ...set, base: { ...set.base } };
  for (const step of SCALE_STEPS) {
    const name = `${palette}/${step}`;
    const token: BaseToken = next.base[name] ?? { ...sibling, name, description: sibling.description };
    next.base[name] = { ...token, value: scale[step] };
    next.base[name] = describeBase(next, name);
  }
  return next;
}

export function setRef(
  set: TokenSet,
  layer: "semantic" | "specific",
  name: string,
  mode: Mode,
  ref: AliasValue,
): TokenSet {
  const token = set[layer][name];
  if (!token) throw new EditError(`Token inexistente em ${layer}: ${name}`);
  const edited: TokenSet = {
    ...set,
    [layer]: { ...set[layer], [name]: { ...token, values: { ...token.values, [mode]: ref } } },
  };
  return { ...edited, [layer]: { ...edited[layer], [name]: describeAlias(edited, layer, name) } };
}

function refsOf(t: AliasToken): string[] {
  return Object.values(t.values).flatMap((v) => (typeof v === "string" ? [v] : [v.color, v.opacity]));
}

export function setGroupEnabled(
  set: TokenSet,
  group: OptionalGroup,
  enabled: boolean,
  seed: TokenSet,
): { ok: true; set: TokenSet } | { ok: false; blockedBy: string[] } {
  const has = set.disabledGroups.includes(group);
  if (!enabled) {
    if (has) return { ok: true, set };
    const off: TokenSet = { ...set, disabledGroups: [...set.disabledGroups, group] };
    const blockedBy = Object.values(set.specific)
      .filter((t) => refsOf(t).some((r) => isDisabled(off, "base", r)))
      .map((t) => t.name);
    return blockedBy.length > 0 ? { ok: false, blockedBy } : { ok: true, set: off };
  }
  if (!has) return { ok: true, set };
  const probe: TokenSet = { ...set, disabledGroups: [group] };
  const base = { ...set.base };
  for (const name of Object.keys(seed.base)) if (isDisabled(probe, "base", name)) base[name] = seed.base[name]!;
  const semantic = { ...set.semantic };
  for (const name of Object.keys(seed.semantic)) if (isDisabled(probe, "semantic", name)) semantic[name] = seed.semantic[name]!;
  return { ok: true, set: { ...set, base, semantic, disabledGroups: set.disabledGroups.filter((g) => g !== group) } };
}

export function upsertSpecific(set: TokenSet, token: AliasToken): TokenSet {
  if (token.name in set.semantic) throw new EditError(`O nome ${token.name} já é de um semantic.`);
  const errors = checkSpecificName(token.name, set.semantic).filter((w) => w.message.startsWith("Formato:"));
  if (errors.length > 0) throw new EditError(errors.map((w) => w.message).join(" "));
  const edited: TokenSet = { ...set, specific: { ...set.specific, [token.name]: token } };
  return { ...edited, specific: { ...edited.specific, [token.name]: describeAlias(edited, "specific", token.name) } };
}

export function removeSpecific(set: TokenSet, name: string): TokenSet {
  if (!(name in set.specific)) throw new EditError(`Specific inexistente: ${name}`);
  const { [name]: _removed, ...rest } = set.specific;
  return { ...set, specific: rest };
}
