/** Text and effect styles bound to Vortex variables (main thread only). Spec §6.4. */
import type { Layer, RawFigmaExport } from "@token-bridge/tokens/figma";
import { type Counts, type VortexContext } from "./vortex.ts";

const TEXT_FIELDS = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"] as const;
/** raw binding key → Figma effect field */
const EFFECT_FIELDS = [["offsetX", "offsetX"], ["offsetY", "offsetY"], ["blur", "radius"], ["spread", "spread"], ["color", "color"]] as const;
const RESOLVE_ORDER: Layer[] = ["semantic", "specific", "base"];

function resolve(ctx: VortexContext, name: string): Variable | undefined {
  for (const layer of RESOLVE_ORDER) {
    const v = ctx.byName[layer].get(name);
    if (v) return v;
  }
  return undefined;
}

/** Font family string a fontFamily binding points at (via semantic/specific light value, or the base itself). */
function familyOf(ctx: VortexContext, name: string): string | undefined {
  let cur = name;
  for (const layer of ["semantic", "specific"] as const) {
    const t = ctx.set[layer][cur];
    if (t) {
      const alias = t.values.light;
      if (typeof alias !== "string") return undefined;
      cur = alias;
      break;
    }
  }
  const base = ctx.set.base[cur];
  return base && typeof base.value === "string" ? base.value : undefined;
}

/** Variable type each style field accepts (keyed by the raw binding name). */
const FIELD_TYPE: Record<string, VariableResolvedDataType> = {
  fontFamily: "STRING", color: "COLOR", fontSize: "FLOAT", fontWeight: "FLOAT", lineHeight: "FLOAT",
  letterSpacing: "FLOAT", offsetX: "FLOAT", offsetY: "FLOAT", blur: "FLOAT", spread: "FLOAT",
};

function resolveAll(ctx: VortexContext, label: string, names: Record<string, string>): Record<string, Variable> | null {
  const out: Record<string, Variable> = {};
  for (const [field, name] of Object.entries(names)) {
    const v = resolve(ctx, name);
    if (!v) {
      ctx.warnings.push(`Estilo "${label}": variável "${name}" não existe; estilo ignorado`);
      return null;
    }
    if (v.resolvedType !== FIELD_TYPE[field]) {
      ctx.warnings.push(
        `Estilo "${label}": variável "${name}" tem tipo ${v.resolvedType} (esperado ${FIELD_TYPE[field]}); estilo ignorado`);
      return null;
    }
    out[field] = v;
  }
  return out;
}

const boundId = (bv: unknown, field: string): string | undefined =>
  (bv as Record<string, { id?: string } | undefined> | undefined)?.[field]?.id;

function refuse(ctx: VortexContext, name: string, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  ctx.warnings.push(`Estilo "${name}": Figma recusou a atualização (${msg}); estilo ignorado`);
}

function safeRemove(style: { remove(): void }) {
  try { style.remove(); } catch { /* best effort */ }
}

export async function upsertStyles(ctx: VortexContext, raw: RawFigmaExport): Promise<Counts> {
  const counts: Counts = { created: 0, updated: 0, unchanged: 0 };
  const tally = (isNew: boolean, changed: boolean) => {
    if (isNew) counts.created++;
    else if (changed) counts.updated++;
    else counts.unchanged++;
  };

  const textByName = new Map<string, TextStyle>();
  for (const s of await figma.getLocalTextStylesAsync()) if (!textByName.has(s.name)) textByName.set(s.name, s);
  for (const spec of raw.textStyles) {
    const vars = resolveAll(ctx, spec.name, spec.bindings);
    if (!vars) continue;
    const family = familyOf(ctx, spec.bindings.fontFamily);
    const fontName = { family: family ?? "", style: "Regular" };
    try {
      if (!family) throw new Error("no family");
      await figma.loadFontAsync(fontName);
    } catch {
      ctx.warnings.push(`Fonte "${family ?? spec.bindings.fontFamily}" indisponível no Figma: estilo "${spec.name}" não foi atualizado`);
      continue;
    }
    let style = textByName.get(spec.name);
    const isNew = !style;
    try {
      if (!style) {
        style = figma.createTextStyle();
        style.name = spec.name;
        style.description = spec.description;
        style.fontName = fontName; // só estilo novo recebe fontName (spec §6.4)
      }
      let changed = false;
      for (const field of TEXT_FIELDS) {
        if (boundId(style.boundVariables, field) !== vars[field]!.id) {
          style.setBoundVariable(field, vars[field]!);
          changed = true;
        }
      }
      textByName.set(spec.name, style);
      tally(isNew, changed);
    } catch (e) {
      refuse(ctx, spec.name, e);
      if (isNew && style) safeRemove(style);
    }
  }

  const effectByName = new Map<string, EffectStyle>();
  for (const s of await figma.getLocalEffectStylesAsync()) if (!effectByName.has(s.name)) effectByName.set(s.name, s);
  for (const spec of raw.effectStyles) {
    const vars = resolveAll(ctx, spec.name, spec.bindings);
    if (!vars) continue;
    let style = effectByName.get(spec.name);
    const isNew = !style;
    try {
      if (!style) {
        style = figma.createEffectStyle();
        style.name = spec.name;
        style.description = spec.description;
      }
      const current = style.effects[0];
      const usable = current && (current.type === "DROP_SHADOW" || current.type === "INNER_SHADOW");
      let effect: Effect = usable ? current : {
        type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 0 },
        radius: 0, spread: 0, visible: true, blendMode: "NORMAL",
      };
      let changed = !usable;
      for (const [key, field] of EFFECT_FIELDS) {
        if (boundId((effect as { boundVariables?: unknown }).boundVariables, field) !== vars[key]!.id) {
          effect = figma.variables.setBoundVariableForEffect(effect, field, vars[key]!);
          changed = true;
        }
      }
      if (changed) style.effects = [effect, ...style.effects.slice(1)];
      effectByName.set(spec.name, style);
      tally(isNew, changed);
    } catch (e) {
      refuse(ctx, spec.name, e);
      if (isNew && style) safeRemove(style);
    }
  }
  return counts;
}

export async function readStyles(idToName: Map<string, string>): Promise<{
  textStyles: RawFigmaExport["textStyles"];
  effectStyles: RawFigmaExport["effectStyles"];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const textStyles: RawFigmaExport["textStyles"] = [];
  const effectStyles: RawFigmaExport["effectStyles"] = [];
  const names = (label: string, get: (field: string) => string | undefined, fields: readonly string[]) => {
    const out: Record<string, string> = {};
    for (const f of fields) {
      const n = get(f);
      if (!n) {
        warnings.push(`Estilo "${label}": ligação "${f}" ausente ou quebrada; omitido`);
        return null;
      }
      out[f] = n;
    }
    return out;
  };
  const nameOf = (bv: unknown, field: string) => {
    const id = boundId(bv, field);
    return id ? idToName.get(id) : undefined;
  };
  const seen = new Set<string>();
  for (const s of await figma.getLocalTextStylesAsync()) {
    if (seen.has(s.name)) continue;
    seen.add(s.name);
    if (!TEXT_FIELDS.some((f) => nameOf(s.boundVariables, f))) continue;
    const b = names(s.name, (f) => nameOf(s.boundVariables, f), TEXT_FIELDS);
    if (b) textStyles.push({ name: s.name, description: s.description, bindings: b as RawFigmaExport["textStyles"][number]["bindings"] });
  }
  const seenE = new Set<string>();
  for (const s of await figma.getLocalEffectStylesAsync()) {
    if (seenE.has(s.name)) continue;
    seenE.add(s.name);
    const bv = (s.effects[0] as { boundVariables?: unknown } | undefined)?.boundVariables;
    if (!EFFECT_FIELDS.some(([, f]) => nameOf(bv, f))) continue;
    const b = names(s.name, (key) => nameOf(bv, EFFECT_FIELDS.find((e) => e[0] === key)![1]), EFFECT_FIELDS.map((e) => e[0]));
    if (b) effectStyles.push({ name: s.name, description: s.description, bindings: b as RawFigmaExport["effectStyles"][number]["bindings"] });
  }
  return { textStyles, effectStyles, warnings };
}
