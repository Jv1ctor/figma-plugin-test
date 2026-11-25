/**
 * Vortex tokens in Figma variables (main thread only): three collections (base, semantic, specific),
 * upserted by name inside each collection. Styles plug in at the end of upsertVortex (Task 4).
 */
import {
  cssVarName, toFigmaExport, valueLine, withValueLine,
  type Layer, type RawFigmaExport, type RawValue, type RawVariable, type TokenSet,
} from "@token-bridge/tokens/figma";
import { BridgeError } from "./variables.ts";

export interface Counts { created: number; updated: number; unchanged: number }
export interface VortexWriteResult { variables: Counts & { removed: number }; styles: Counts; warnings: string[] }

/** Shared with the styles step: variables by name per collection, plus the warning sink. */
export interface VortexContext {
  set: TokenSet;
  byName: Record<Layer, Map<string, Variable>>;
  warnings: string[];
  collections: Record<Layer, VariableCollection>;
}

const LAYERS: Layer[] = ["base", "semantic", "specific"];
const VALUE_MODES = ["light", "dark"] as const;

/** Half an 8-bit step: anything closer is the same color on screen. */
const COLOR_EPS = 1 / 510;
const NUMBER_EPS = 1e-4;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isAlias = (v: unknown): v is VariableAlias => isObj(v) && v.type === "VARIABLE_ALIAS";
const isComposite = (v: unknown): v is { color: VariableAlias; opacity: VariableAlias } =>
  isObj(v) && isAlias(v.color) && isAlias(v.opacity);

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof b === "number") return typeof a === "number" && Math.abs(a - b) < NUMBER_EPS;
  if (typeof b === "string") return a === b;
  if (isAlias(b)) return isAlias(a) && a.id === b.id;
  if (isComposite(b)) return isComposite(a) && a.color.id === b.color.id && a.opacity.id === b.opacity.id;
  if (isObj(b) && "r" in b) {
    if (!isObj(a) || !("r" in a)) return false;
    const x = a as unknown as RGBA, y = b as unknown as RGBA;
    return Math.abs(x.r - y.r) < COLOR_EPS && Math.abs(x.g - y.g) < COLOR_EPS && Math.abs(x.b - y.b) < COLOR_EPS &&
      Math.abs((x.a ?? 1) - (y.a ?? 1)) < COLOR_EPS;
  }
  return false;
}

export function capWarnings(list: string[]): string[] {
  const unique = [...new Set(list)];
  return unique.length > 50 ? [...unique.slice(0, 50), `+${unique.length - 50} avisos`] : unique;
}

async function findCollections(warnings: string[]): Promise<Partial<Record<Layer, VariableCollection>>> {
  const found: Partial<Record<Layer, VariableCollection>> = {};
  for (const c of await figma.variables.getLocalVariableCollectionsAsync()) {
    const layer = LAYERS.find((l) => l === c.name);
    if (!layer) continue;
    if (c.isExtension) warnings.push(`Coleção "${c.name}" é uma extensão e foi ignorada`);
    else if (!found[layer]) found[layer] = c;
  }
  return found;
}

function addMode(collection: VariableCollection, name: string) {
  try {
    collection.addMode(name);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new BridgeError(
      "mode-limit",
      `não foi possível criar o modo "${name}" na coleção "${collection.name}": o plano atual do Figma provavelmente ` +
        `só permite 1 modo por coleção (Starter). Use um arquivo em um plano Professional+. Detalhe: ${detail}`,
    );
  }
}

/**
 * Adds missing modes right away (may throw mode-limit) and returns the renames to run later,
 * so a failed pre-check never leaves an existing collection half-renamed.
 */
function planModes(layer: Layer, collection: VariableCollection, isNew: boolean, renames: Array<() => void>) {
  if (layer === "base") {
    if (isNew) renames.push(() => collection.renameMode(collection.defaultModeId, "value"));
    return;
  }
  const has = (name: string) => collection.modes.some((m) => m.name === name);
  const first = collection.modes[0];
  const renameFirst = !has("light") && !!first && first.name !== "dark";
  if (!has("light") && !renameFirst) addMode(collection, "light");
  if (!has("dark")) addMode(collection, "dark");
  if (renameFirst) renames.push(() => collection.renameMode(first!.modeId, "light"));
}

function modeIdsOf(layer: Layer, collection: VariableCollection): Record<string, string> {
  if (layer === "base") return { value: collection.defaultModeId };
  const id = (name: string) => collection.modes.find((m) => m.name === name)!.modeId;
  return { light: id("light"), dark: id("dark") };
}

function hexTo(v: RawValue): VariableValue | undefined {
  if ("color" in v && isObj(v.color)) return v.color;
  if ("number" in v) return v.number;
  if ("string" in v) return v.string;
  return undefined;
}

const kindType = (v: RawValue): VariableResolvedDataType | undefined =>
  "color" in v ? "COLOR" : "number" in v ? "FLOAT" : "string" in v ? "STRING" : undefined;

/** Raw value → Figma value, or null (with a warning) when it cannot be written. */
function toFigmaValue(ctx: VortexContext, layer: Layer, raw: RawVariable, v: RawValue | undefined): VariableValue | null {
  const label = `"${layer}/${raw.name}"`;
  const mismatch = (actual: string, expected: string) => {
    ctx.warnings.push(`${label}: já existe como ${actual} (esperado ${expected}); ignorado`);
    return null;
  };
  const baseVar = (name: string) => {
    const b = ctx.byName.base.get(name);
    if (!b) ctx.warnings.push(`${label}: referência "${name}" não existe na base; ignorado`);
    return b;
  };
  if (!v) return null;
  if ("alias" in v) {
    const b = baseVar(v.alias);
    if (!b) return null;
    if (b.resolvedType !== raw.type) return mismatch(raw.type, b.resolvedType);
    return figma.variables.createVariableAlias(b);
  }
  if ("composite" in v) {
    const c = baseVar(v.composite.color);
    const o = baseVar(v.composite.opacity);
    if (!c || !o) return null;
    if (raw.type !== "COLOR") return mismatch(raw.type, "COLOR");
    return { color: figma.variables.createVariableAlias(c), opacity: figma.variables.createVariableAlias(o) } as unknown as VariableValue;
  }
  const kind = kindType(v);
  if (kind !== raw.type) return mismatch(raw.type, kind ?? raw.type);
  return hexTo(v) ?? null;
}

export async function upsertVortex(set: TokenSet, remove: string[]): Promise<VortexWriteResult> {
  const warnings: string[] = [];
  const found = await findCollections(warnings);
  const created: VariableCollection[] = [];
  const collections = {} as Record<Layer, VariableCollection>;
  const modeIds = {} as Record<Layer, Record<string, string>>;
  const renames: Array<() => void> = [];

  // Pre-check: all three collections and their modes, before any variable is written.
  try {
    for (const layer of LAYERS) {
      let c = found[layer];
      const isNew = !c;
      if (!c) {
        c = figma.variables.createVariableCollection(layer);
        created.push(c);
      }
      collections[layer] = c;
      planModes(layer, c, isNew, renames);
    }
    for (const rename of renames) rename();
    for (const layer of LAYERS) modeIds[layer] = modeIdsOf(layer, collections[layer]);
  } catch (e) {
    for (const c of created) c.remove();
    throw e;
  }

  const byName = { base: new Map(), semantic: new Map(), specific: new Map() } as VortexContext["byName"];
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    const layer = LAYERS.find((l) => collections[l].id === v.variableCollectionId);
    if (layer && !byName[layer].has(v.name)) byName[layer].set(v.name, v);
  }
  const ctx: VortexContext = { set, byName, warnings, collections };

  const counts: Counts & { removed: number } = { created: 0, updated: 0, unchanged: 0, removed: 0 };
  const exported = toFigmaExport(set);

  for (const layer of LAYERS) {
    const col = exported.collections.find((c) => c.name === layer)!;
    for (const raw of col.variables) {
      const existing = byName[layer].get(raw.name);
      if (existing && existing.resolvedType !== raw.type) {
        warnings.push(`"${layer}/${raw.name}": já existe como ${existing.resolvedType} (esperado ${raw.type}); ignorado`);
        continue;
      }
      // Compute every mode's value first so a bad one skips the variable entirely.
      const desired: Array<[string, VariableValue]> = [];
      let ok = true;
      for (const mode of col.modes) {
        const value = toFigmaValue(ctx, layer, raw, raw.values[mode]);
        if (value === null) { ok = false; break; }
        desired.push([modeIds[layer][mode]!, value]);
      }
      if (!ok) continue;

      let variable = existing;
      if (!variable) {
        variable = figma.variables.createVariable(raw.name, collections[layer], raw.type);
        byName[layer].set(raw.name, variable);
      }
      let changed = false;
      const line = valueLine(set, layer, raw.name);
      const description = withValueLine(existing ? variable.description : raw.description, line);
      if (description !== variable.description) { variable.description = description; changed = true; }
      const scopes = raw.scopes as VariableScope[];
      if (scopes.length !== variable.scopes.length || scopes.some((x, i) => x !== variable.scopes[i])) {
        variable.scopes = scopes;
        changed = true;
      }
      const syntax = `var(${cssVarName(layer, raw.name)})`;
      if (variable.codeSyntax.WEB !== syntax) { variable.setVariableCodeSyntax("WEB", syntax); changed = true; }

      for (const [modeId, value] of desired) {
        if (!sameValue(variable.valuesByMode[modeId], value)) {
          variable.setValueForMode(modeId, value);
          changed = true;
        }
      }
      if (!existing) counts.created++;
      else if (changed) counts.updated++;
      else counts.unchanged++;
    }
  }

  for (const name of remove) {
    const v = byName.specific.get(name);
    if (!v) {
      warnings.push(`Specific "${name}" não existe no Figma; nada removido`);
      continue;
    }
    v.remove();
    byName.specific.delete(name);
    counts.removed++;
  }

  // Task 4: styles plug in here, using ctx.
  return { variables: counts, styles: { created: 0, updated: 0, unchanged: 0 }, warnings: capWarnings(warnings) };
}

/** id → name for the variables of one collection (reused by style reading). */
export async function idNameMap(collection: VariableCollection): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    if (v.variableCollectionId === collection.id) map.set(v.id, v.name);
  }
  return map;
}

export async function readVortex(): Promise<{ raw: RawFigmaExport; warnings: string[] }> {
  const warnings: string[] = [];
  const found = await findCollections(warnings);
  if (!found.base || !found.semantic) {
    throw new BridgeError("no-collection", "Este arquivo ainda não tem os tokens Vortex — use Enviar para o Figma");
  }
  const modeId = (c: VariableCollection, mode: string) => {
    const id = c.modes.find((m) => m.name === mode)?.modeId;
    if (!id) throw new BridgeError("no-collection", `coleção "${c.name}" não tem o modo "${mode}"`);
    return id;
  };
  for (const layer of ["semantic", "specific"] as const) {
    const c = found[layer];
    if (c) for (const m of VALUE_MODES) modeId(c, m);
  }

  const all = await figma.variables.getLocalVariablesAsync();
  const baseNames = await idNameMap(found.base);
  const collections: RawFigmaExport["collections"] = [];

  for (const layer of LAYERS) {
    const c = found[layer];
    const modes = layer === "base" ? ["value"] : [...VALUE_MODES];
    const variables: RawVariable[] = [];
    const seen = new Set<string>();
    for (const v of c ? all.filter((x) => x.variableCollectionId === c.id) : []) {
      if (seen.has(v.name)) continue;
      seen.add(v.name);
      const label = `"${layer}/${v.name}"`;
      if (v.resolvedType === "BOOLEAN") {
        warnings.push(`${label}: tipo BOOLEAN não suportado; omitido`);
        continue;
      }
      const values: Record<string, RawValue> = {};
      let ok = true;
      for (const mode of modes) {
        const r = layer === "base"
          ? readLiteral(v.valuesByMode[c!.defaultModeId])
          : readAlias(v.valuesByMode[modeId(c!, mode)], baseNames, label, mode, warnings);
        if (!r) {
          if (layer === "base") warnings.push(`${label}: valor inesperado; omitido`);
          ok = false;
          break;
        }
        values[mode] = r;
      }
      if (ok) variables.push({ name: v.name, type: v.resolvedType as RawVariable["type"], scopes: [...v.scopes], description: v.description, values });
    }
    collections.push({ name: layer, modes, variables });
  }

  return {
    raw: { fileKey: "", exportedAt: new Date().toISOString(), collections, textStyles: [], effectStyles: [] },
    warnings: capWarnings(warnings),
  };
}

function readLiteral(v: VariableValue | undefined): RawValue | null {
  if (typeof v === "number") return { number: v };
  if (typeof v === "string") return { string: v };
  if (isObj(v) && "r" in v) {
    const c = v as unknown as RGBA;
    return { color: { r: c.r, g: c.g, b: c.b, a: c.a ?? 1 } };
  }
  return null;
}

function readAlias(
  v: VariableValue | undefined, baseNames: Map<string, string>, label: string, mode: string, warnings: string[],
): RawValue | null {
  if (isAlias(v)) {
    const name = baseNames.get(v.id);
    if (name) return { alias: name };
  } else if (isComposite(v)) {
    const color = baseNames.get(v.color.id);
    const opacity = baseNames.get(v.opacity.id);
    if (color && opacity) return { composite: { color, opacity } };
  } else if (v !== undefined) {
    warnings.push(`${label}: valor literal no modo ${mode} (esperado alias); omitido`);
    return null;
  }
  warnings.push(`${label}: alias quebrado; omitido`);
  return null;
}
