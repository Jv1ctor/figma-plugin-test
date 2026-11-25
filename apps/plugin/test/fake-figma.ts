/** Just enough of figma.variables to exercise variables.ts, modelled on plugin-typings 1.142. */
let nextId = 1;
const id = (p: string) => `${p}:${nextId++}`;

export function createFakeFigma(opts: { maxModes?: number; missingFonts?: string[] } = {}) {
  const collections: any[] = [];
  const variables: any[] = [];
  const textStyles: any[] = [];
  const effectStyles: any[] = [];
  const loaded = new Set<string>();
  const FIELD_TYPE: Record<string, string> = {
    fontFamily: "STRING", color: "COLOR", fontSize: "FLOAT", fontWeight: "FLOAT", lineHeight: "FLOAT",
    letterSpacing: "FLOAT", offsetX: "FLOAT", offsetY: "FLOAT", radius: "FLOAT", spread: "FLOAT",
  };
  const checkType = (field: string, v: any) => {
    if (FIELD_TYPE[field] !== v.resolvedType) throw new Error("Mismatched variable resolved type");
  };
  const calls = { createCollection: 0, createVariable: 0, setValueForMode: 0, removeVariable: 0 };

  const makeCollection = (name: string) => {
    const pluginData: Record<string, string> = {};
    const c = {
      id: id("VariableCollectionId"),
      name,
      isExtension: false,
      modes: [{ modeId: id("mode"), name: "Mode 1" }],
      get defaultModeId() { return c.modes[0]!.modeId; },
      addMode(modeName: string) {
        if (c.modes.length >= (opts.maxModes ?? 4)) throw new Error("in addMode: Limited to 1 modes only");
        const modeId = id("mode");
        c.modes.push({ modeId, name: modeName });
        return modeId;
      },
      renameMode(modeId: string, newName: string) { c.modes.find((m) => m.modeId === modeId)!.name = newName; },
      remove() { collections.splice(collections.indexOf(c), 1); },
      setPluginData(k: string, v: string) { pluginData[k] = v; },
      getPluginData(k: string) { return pluginData[k] ?? ""; },
    };
    return c;
  };

  const figma = {
    async getLocalTextStylesAsync() { return [...textStyles]; },
    async getLocalEffectStylesAsync() { return [...effectStyles]; },
    async loadFontAsync(f: { family: string; style: string }) {
      if (opts.missingFonts?.includes(f.family)) throw new Error(`The font "${f.family} ${f.style}" could not be loaded`);
      loaded.add(`${f.family}/${f.style}`);
    },
    createTextStyle() {
      let fontName = { family: "Inter", style: "Regular" };
      const st = {
        id: id("S"), name: "", description: "", boundVariables: {} as Record<string, unknown>,
        get fontName() { return fontName; },
        set fontName(f: { family: string; style: string }) {
          if (!loaded.has(`${f.family}/${f.style}`)) throw new Error("Cannot write to node with unloaded font");
          fontName = { ...f };
        },
        remove() { textStyles.splice(textStyles.indexOf(st), 1); },
        setBoundVariable(field: string, v: any) { checkType(field, v); st.boundVariables[field] = { type: "VARIABLE_ALIAS", id: v.id }; },
      };
      textStyles.push(st);
      return st;
    },
    createEffectStyle() {
      let effects: any[] = [];
      const st = {
        id: id("S"), name: "", description: "",
        get effects() { return structuredClone(effects); },
        set effects(e: any[]) { effects = structuredClone(e); },
        remove() { effectStyles.splice(effectStyles.indexOf(st), 1); },
      };
      effectStyles.push(st);
      return st;
    },
    variables: {
      setBoundVariableForEffect(effect: any, field: string, v: any) {
        checkType(field, v);
        if (/BLUR/.test(effect.type) && field !== "radius") throw new Error(`field ${field} not valid for ${effect.type}`);
        return { ...structuredClone(effect), boundVariables: { ...(effect.boundVariables ?? {}), [field]: { type: "VARIABLE_ALIAS", id: v.id } } };
      },
      async getLocalVariableCollectionsAsync() { return [...collections]; },
      async getLocalVariablesAsync() { return [...variables]; },
      async getVariableByIdAsync(vid: string) { return variables.find((v) => v.id === vid) ?? null; },
      async getVariableCollectionByIdAsync(cid: string) { return collections.find((c) => c.id === cid) ?? null; },
      createVariableAlias(v: any) { return { type: "VARIABLE_ALIAS", id: v.id }; },
      createVariableCollection(name: string) {
        calls.createCollection++;
        const c = makeCollection(name);
        collections.push(c);
        return c;
      },
      createVariable(name: string, collection: any, resolvedType: string) {
        if (typeof collection === "string") throw new Error("deprecated id form used");
        calls.createVariable++;
        const v = {
          id: id("VariableID"),
          name,
          resolvedType,
          variableCollectionId: collection.id,
          valuesByMode: {} as Record<string, unknown>,
          description: "",
          scopes: ["ALL_SCOPES"],
          codeSyntax: {} as Record<string, string>,
          setValueForMode(modeId: string, value: unknown) {
            if (!collection.modes.some((m: any) => m.modeId === modeId)) throw new Error(`unknown mode ${modeId}`);
            const target = value && (value as any).type === "VARIABLE_ALIAS" ? variables.find((x) => x.id === (value as any).id) : undefined;
            if (target && target.resolvedType !== resolvedType) throw new Error("Mismatched variable resolved type");
            calls.setValueForMode++;
            v.valuesByMode[modeId] = structuredClone(value);
          },
          setVariableCodeSyntax(platform: string, value: string) { v.codeSyntax[platform] = value; },
          remove() { calls.removeVariable++; variables.splice(variables.indexOf(v), 1); },
        };
        variables.push(v);
        return v;
      },
    },
  };

  return { figma, collections, variables, calls, textStyles, effectStyles };
}
