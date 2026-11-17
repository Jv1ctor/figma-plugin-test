/**
 * Everything that touches figma.variables lives here (main thread only).
 * Upserts are idempotent by name: the collection and each variable are looked up
 * by name first and only created when missing.
 */
import {
  FIGMA_COLLECTION, MODES, RADIUS_VARIABLE, REM_PX, TOKENS, colorVariableName, cssToFigmaRgba, figmaRgbaToOklch,
  type AckPayload, type ClampedToken, type Theme, type ThemeMode, type Token,
} from "@token-bridge/protocol";

export class BridgeError extends Error {
  constructor(
    readonly code: "mode-limit" | "no-collection" | "figma" | "invalid",
    message: string,
  ) {
    super(message);
  }
}

const THEME_NAME_KEY = "themeName";

async function findCollection(): Promise<VariableCollection | undefined> {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  return all.find((c) => c.name === FIGMA_COLLECTION && !c.isExtension);
}

/** Make sure the collection has "light" and "dark" modes; returns their ids. */
function ensureModes(collection: VariableCollection): Record<ThemeMode, string> {
  const byName = (name: string) => collection.modes.find((m) => m.name === name)?.modeId;

  if (!byName("light")) {
    // A fresh collection has one default mode ("Mode 1"): that becomes "light".
    const first = collection.modes[0];
    if (first && first.name !== "dark") collection.renameMode(first.modeId, "light");
    else addMode(collection, "light");
  }
  if (!byName("dark")) addMode(collection, "dark");

  return { light: byName("light")!, dark: byName("dark")! };
}

function addMode(collection: VariableCollection, name: string) {
  try {
    collection.addMode(name);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new BridgeError(
      "mode-limit",
      `não foi possível criar o modo "${name}" na coleção "${FIGMA_COLLECTION}": o plano atual do Figma provavelmente ` +
        `só permite 1 modo por coleção (Starter). Use um arquivo em um plano Professional+ ou crie o modo manualmente. ` +
        `Detalhe: ${detail}`,
    );
  }
}

/** Half an 8-bit step: anything closer is the same color on screen. */
const COLOR_EPS = 1 / 510;
const sameColor = (a: VariableValue | undefined, b: RGBA) =>
  typeof a === "object" && a !== null && "r" in a && "g" in a && "b" in a &&
  Math.abs(a.r - b.r) < COLOR_EPS && Math.abs(a.g - b.g) < COLOR_EPS && Math.abs(a.b - b.b) < COLOR_EPS &&
  Math.abs(("a" in a ? (a as RGBA).a : 1) - b.a) < COLOR_EPS;

const sameNumber = (a: VariableValue | undefined, b: number) => typeof a === "number" && Math.abs(a - b) < 1e-4;

export async function upsertTheme(theme: Theme): Promise<AckPayload> {
  const started = Date.now();

  // Convert everything up front so a bad color fails before we touch the file.
  const clamped: ClampedToken[] = [];
  const colors = {} as Record<ThemeMode, Record<Token, RGBA>>;
  for (const mode of MODES) {
    colors[mode] = {} as Record<Token, RGBA>;
    for (const token of TOKENS) {
      try {
        const { color, clamped: wasClamped } = cssToFigmaRgba(theme[mode][token]);
        colors[mode][token] = color;
        if (wasClamped) clamped.push({ token, mode, from: theme[mode][token] });
      } catch (e) {
        throw new BridgeError("invalid", `${mode}.${token}: ${(e as Error).message}`);
      }
    }
  }

  let collection = await findCollection();
  const createdCollection = !collection;
  if (!collection) collection = figma.variables.createVariableCollection(FIGMA_COLLECTION);

  let modeIds: Record<ThemeMode, string>;
  try {
    modeIds = ensureModes(collection);
  } catch (e) {
    // Don't leave an empty, half-configured collection behind.
    if (createdCollection) collection.remove();
    throw e;
  }

  const existing = new Map<string, Variable>();
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    if (v.variableCollectionId === collection.id && !existing.has(v.name)) existing.set(v.name, v);
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  const getOrCreate = (name: string, type: VariableResolvedDataType, setup: (v: Variable) => void) => {
    let v = existing.get(name);
    if (v && v.resolvedType !== type) {
      throw new BridgeError("figma", `variável "${name}" já existe com tipo ${v.resolvedType} (esperado ${type})`);
    }
    if (!v) {
      v = figma.variables.createVariable(name, collection!, type);
      setup(v);
      existing.set(name, v);
      created++;
      return { variable: v, isNew: true };
    }
    return { variable: v, isNew: false };
  };

  for (const token of TOKENS) {
    const { variable, isNew } = getOrCreate(colorVariableName(token), "COLOR", (v) => {
      v.setVariableCodeSyntax("WEB", `var(--${token})`);
    });
    let changed = false;
    for (const mode of MODES) {
      const next = colors[mode][token];
      if (!sameColor(variable.valuesByMode[modeIds[mode]], next)) {
        variable.setValueForMode(modeIds[mode], next);
        changed = true;
      }
    }
    if (!isNew) changed ? updated++ : unchanged++;
  }

  const radiusPx = Math.round(theme.radius * REM_PX * 100) / 100;
  const { variable: radius, isNew: radiusIsNew } = getOrCreate(RADIUS_VARIABLE, "FLOAT", (v) => {
    v.scopes = ["CORNER_RADIUS"];
    v.setVariableCodeSyntax("WEB", "var(--radius)");
  });
  let radiusChanged = false;
  for (const mode of MODES) {
    if (!sameNumber(radius.valuesByMode[modeIds[mode]], radiusPx)) {
      radius.setValueForMode(modeIds[mode], radiusPx);
      radiusChanged = true;
    }
  }
  if (!radiusIsNew) radiusChanged ? updated++ : unchanged++;

  collection.setPluginData(THEME_NAME_KEY, theme.name);

  return { for: "upsert-theme", theme: theme.name, created, updated, unchanged, clamped, durationMs: Date.now() - started };
}

const isAlias = (v: VariableValue | undefined): v is VariableAlias =>
  typeof v === "object" && v !== null && (v as VariableAlias).type === "VARIABLE_ALIAS";

/** Follow VARIABLE_ALIAS chains, picking the same-named mode in the target collection. */
async function resolveValue(value: VariableValue | undefined, modeName: string, depth = 0): Promise<VariableValue | undefined> {
  if (!isAlias(value) || depth > 10) return value;
  const target = await figma.variables.getVariableByIdAsync(value.id);
  if (!target) return undefined;
  const coll = await figma.variables.getVariableCollectionByIdAsync(target.variableCollectionId);
  const modeId = coll?.modes.find((m) => m.name === modeName)?.modeId ?? coll?.defaultModeId;
  return modeId ? resolveValue(target.valuesByMode[modeId], modeName, depth + 1) : undefined;
}

export async function readSnapshot(): Promise<Theme> {
  const collection = await findCollection();
  if (!collection) throw new BridgeError("no-collection", `coleção "${FIGMA_COLLECTION}" não existe neste arquivo`);

  const modeIds = {} as Record<ThemeMode, string>;
  for (const mode of MODES) {
    const id = collection.modes.find((m) => m.name === mode)?.modeId;
    if (!id) throw new BridgeError("no-collection", `coleção "${FIGMA_COLLECTION}" não tem o modo "${mode}"`);
    modeIds[mode] = id;
  }

  const byName = new Map<string, Variable>();
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    if (v.variableCollectionId === collection.id && !byName.has(v.name)) byName.set(v.name, v);
  }

  const theme: Theme = {
    name: collection.getPluginData(THEME_NAME_KEY) || "figma",
    radius: 0,
    light: {} as Theme["light"],
    dark: {} as Theme["dark"],
  };

  const missing: string[] = [];
  for (const token of TOKENS) {
    const v = byName.get(colorVariableName(token));
    if (!v || v.resolvedType !== "COLOR") {
      missing.push(colorVariableName(token));
      continue;
    }
    for (const mode of MODES) {
      const value = await resolveValue(v.valuesByMode[modeIds[mode]], mode);
      if (typeof value !== "object" || value === null || !("r" in value)) {
        missing.push(`${colorVariableName(token)} (${mode})`);
        continue;
      }
      theme[mode][token] = figmaRgbaToOklch(value as RGBA);
    }
  }
  if (missing.length) throw new BridgeError("no-collection", `variáveis ausentes ou inválidas: ${missing.join(", ")}`);

  const radius = byName.get(RADIUS_VARIABLE);
  const px = radius ? await resolveValue(radius.valuesByMode[modeIds.light], "light") : undefined;
  theme.radius = typeof px === "number" ? Math.round((px / REM_PX) * 1000) / 1000 : 0.625;

  return theme;
}
