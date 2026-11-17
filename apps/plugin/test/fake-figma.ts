/** Just enough of figma.variables to exercise variables.ts, modelled on plugin-typings 1.142. */
let nextId = 1;
const id = (p: string) => `${p}:${nextId++}`;

export function createFakeFigma(opts: { maxModes?: number } = {}) {
  const collections: any[] = [];
  const variables: any[] = [];
  const calls = { createCollection: 0, createVariable: 0, setValueForMode: 0 };

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
    variables: {
      async getLocalVariableCollectionsAsync() { return [...collections]; },
      async getLocalVariablesAsync() { return [...variables]; },
      async getVariableByIdAsync(vid: string) { return variables.find((v) => v.id === vid) ?? null; },
      async getVariableCollectionByIdAsync(cid: string) { return collections.find((c) => c.id === cid) ?? null; },
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
          scopes: ["ALL_SCOPES"],
          codeSyntax: {} as Record<string, string>,
          setValueForMode(modeId: string, value: unknown) {
            if (!collection.modes.some((m: any) => m.modeId === modeId)) throw new Error(`unknown mode ${modeId}`);
            calls.setValueForMode++;
            v.valuesByMode[modeId] = structuredClone(value);
          },
          setVariableCodeSyntax(platform: string, value: string) { v.codeSyntax[platform] = value; },
        };
        variables.push(v);
        return v;
      },
    },
  };

  return { figma, collections, variables, calls };
}
