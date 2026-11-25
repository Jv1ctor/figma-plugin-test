import seed from "../seed/vortex.tokens.json";
import type {
  AliasToken, AliasValue, BaseToken, Flex, Layer, Mode, OptionalGroup, ShadowStyle, TextStyle, TokenSet, TokenType,
} from "./types.ts";
import { MODES } from "./types.ts";

export class TokenFormatError extends Error {}

export type DtcgDocument = Record<string, unknown>;
type Obj = Record<string, unknown>;

const TOKEN_TYPES: readonly TokenType[] = ["color", "dimension", "number", "fontFamily", "fontWeight"];
const FLEXES: readonly Flex[] = ["locked", "adjustable", "free"];
const LAYERS: readonly Exclude<Layer, "base">[] = ["semantic", "specific"];
const HEX_COLOR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
const OPTIONAL_GROUPS: readonly OptionalGroup[] = ["brand-2", "brand-3", "brand-4", "data"];

// ---------- escrita ----------

const refOf = (layer: Layer, name: string): string => `{${layer}.${name.split("/").join(".")}}`;
const baseRef = (name: string): string => refOf("base", name);

function setPath(root: Obj, name: string, leaf: Obj): void {
  const segs = name.split("/");
  let cur = root;
  for (const seg of segs.slice(0, -1)) cur = (cur[seg] ??= {}) as Obj;
  cur[segs[segs.length - 1]] = leaf;
}

function baseValueToDtcg(t: BaseToken): unknown {
  return t.type === "dimension" && typeof t.value === "number" ? { value: t.value, unit: "px" } : t.value;
}

function aliasToDtcg(v: AliasValue): unknown {
  return typeof v === "string" ? baseRef(v) : { color: baseRef(v.color), opacity: baseRef(v.opacity) };
}

function ext(extra: Obj): Obj {
  return { vortex: extra };
}

export function toDtcg(set: TokenSet): DtcgDocument {
  const doc: Obj = { base: {}, semantic: {}, specific: {}, styles: { typography: {}, shadow: {} } };
  for (const t of Object.values(set.base)) {
    setPath(doc.base as Obj, t.name, {
      $type: t.type, $value: baseValueToDtcg(t), $description: t.description,
      $extensions: ext({ scopes: t.scopes, flex: t.flex }),
    });
  }
  for (const layer of LAYERS) {
    for (const t of Object.values(set[layer])) {
      const modes = {} as Record<Mode, unknown>;
      for (const m of MODES) modes[m] = aliasToDtcg(t.values[m]);
      setPath(doc[layer] as Obj, t.name, {
        $type: t.type, $value: modes.light, $description: t.description,
        $extensions: ext({ scopes: t.scopes, flex: t.flex, modes }),
      });
    }
  }
  const styles = doc.styles as { typography: Obj; shadow: Obj };
  for (const s of set.textStyles) {
    setPath(styles.typography, s.name, {
      $type: "typography",
      $value: {
        fontFamily: refOf("semantic", s.fontFamily), fontSize: refOf("semantic", s.fontSize),
        fontWeight: refOf("semantic", s.fontWeight), lineHeight: refOf("semantic", s.lineHeight),
        letterSpacing: refOf("semantic", s.letterSpacing),
      },
      $description: s.description,
    });
  }
  for (const s of set.shadowStyles) {
    setPath(styles.shadow, s.name, {
      $type: "shadow",
      $value: {
        offsetX: refOf("semantic", s.offsetX), offsetY: refOf("semantic", s.offsetY),
        blur: refOf("semantic", s.blur), spread: refOf("semantic", s.spread), color: refOf("semantic", s.color),
      },
      $description: s.description,
    });
  }
  doc.$extensions = ext({ version: 1, disabledGroups: [...set.disabledGroups] });
  return doc;
}

// ---------- leitura ----------

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function fail(path: string, msg: string): never {
  throw new TokenFormatError(`${path}: ${msg}`);
}

function parseRef(path: string, v: unknown, layer: Layer): string {
  if (typeof v !== "string") fail(path, "referência deve ser um texto no formato {camada.caminho}");
  const prefix = `{${layer}.`;
  if (!v.startsWith(prefix) || !v.endsWith("}") || v.length === prefix.length + 1) {
    fail(path, `referência inválida "${v}"; esperado ${prefix}…}`);
  }
  return v.slice(prefix.length, -1).split(".").join("/");
}

function parseAlias(path: string, v: unknown): AliasValue {
  if (isObj(v)) {
    return { color: parseRef(`${path}.color`, v.color, "base"), opacity: parseRef(`${path}.opacity`, v.opacity, "base") };
  }
  return parseRef(path, v, "base");
}

/** Percorre a árvore e chama `visit` em cada folha ($value presente). */
function walk(node: unknown, path: string[], visit: (name: string, leaf: Obj) => void, at: string): void {
  if (!isObj(node)) fail(at, "esperado um objeto");
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (!isObj(child)) fail(`${at}.${[...path, key].join(".")}`, "esperado um objeto");
    if ("$value" in child) visit([...path, key].join("/"), child);
    else walk(child, [...path, key], visit, at);
  }
}

function parseMeta(path: string, leaf: Obj): { type: TokenType; scopes: string[]; description: string; flex: Flex; vx: Obj } {
  const { $type, $description, $extensions } = leaf;
  if (!TOKEN_TYPES.includes($type as TokenType)) fail(path, `$type inválido "${String($type)}"`);
  if (typeof $description !== "string") fail(path, "$description ausente");
  const vx = isObj($extensions) ? $extensions.vortex : undefined;
  if (!isObj(vx)) fail(path, "$extensions.vortex ausente");
  if (!Array.isArray(vx.scopes) || !vx.scopes.every((s) => typeof s === "string")) fail(path, "scopes inválido");
  if (!FLEXES.includes(vx.flex as Flex)) fail(path, `flex inválido "${String(vx.flex)}"`);
  return { type: $type as TokenType, scopes: [...(vx.scopes as string[])], description: $description, flex: vx.flex as Flex, vx };
}

function parseBase(name: string, leaf: Obj): BaseToken {
  const path = `base.${name.split("/").join(".")}`;
  const { type, scopes, description, flex } = parseMeta(path, leaf);
  let value: unknown = leaf.$value;
  if (type === "dimension") {
    if (!isObj(value) || value.unit !== "px" || typeof value.value !== "number") fail(path, "dimension deve ser { value, unit: \"px\" }");
    value = value.value;
  }
  if (typeof value !== "string" && typeof value !== "number") fail(path, "$value inválido");
  if (typeof value === "number" && !Number.isFinite(value)) fail(path, "$value deve ser um número finito");
  if (type === "color" && (typeof value !== "string" || !HEX_COLOR.test(value))) fail(path, `cor inválida "${String(value)}": use o formato #rrggbb`);
  return { name, type, scopes, description, flex, value };
}

function parseAliasToken(layer: Layer, name: string, leaf: Obj): AliasToken {
  const path = `${layer}.${name.split("/").join(".")}`;
  const { type, scopes, description, flex, vx } = parseMeta(path, leaf);
  if (!isObj(vx.modes)) fail(path, "$extensions.vortex.modes ausente");
  const values = {} as Record<Mode, AliasValue>;
  for (const m of MODES) values[m] = parseAlias(`${path}.modes.${m}`, vx.modes[m]);
  return { name, type, scopes, description, flex, values };
}

function parseStyleRefs<K extends string>(path: string, leaf: Obj, fields: readonly K[]): Record<K, string> {
  const v = leaf.$value;
  if (!isObj(v)) fail(path, "$value deve ser um objeto");
  const out = {} as Record<K, string>;
  for (const f of fields) out[f] = parseRef(`${path}.${f}`, v[f], "semantic");
  return out;
}

export function parseDtcg(json: unknown): TokenSet {
  if (!isObj(json)) throw new TokenFormatError("O arquivo não é um objeto JSON de tokens.");
  for (const key of ["base", "semantic", "specific"]) {
    if (!isObj(json[key])) throw new TokenFormatError(`Grupo "${key}" ausente: não parece um arquivo de tokens Vortex.`);
  }
  const root = isObj(json.$extensions) ? json.$extensions.vortex : undefined;
  if (!isObj(root) || root.version !== 1) {
    throw new TokenFormatError("$extensions.vortex.version deve ser 1: formato de tokens não reconhecido.");
  }
  const disabled = root.disabledGroups ?? [];
  if (!Array.isArray(disabled) || !disabled.every((g) => OPTIONAL_GROUPS.includes(g as OptionalGroup))) {
    throw new TokenFormatError("$extensions.vortex.disabledGroups inválido.");
  }

  const set: TokenSet = { base: {}, semantic: {}, specific: {}, textStyles: [], shadowStyles: [], disabledGroups: [...disabled] as OptionalGroup[] };
  walk(json.base, [], (name, leaf) => { set.base[name] = parseBase(name, leaf); }, "base");
  for (const layer of LAYERS) {
    walk(json[layer], [], (name, leaf) => { set[layer][name] = parseAliasToken(layer, name, leaf); }, layer);
  }

  const styles = json.styles;
  if (styles !== undefined) {
    if (!isObj(styles)) throw new TokenFormatError("styles: esperado um objeto");
    const strField = (path: string, leaf: Obj): string => {
      if (typeof leaf.$description !== "string") fail(path, "$description ausente");
      return leaf.$description;
    };
    if (styles.typography !== undefined) {
      walk(styles.typography, [], (name, leaf) => {
        const path = `styles.typography.${name.split("/").join(".")}`;
        const r = parseStyleRefs(path, leaf, ["fontSize", "lineHeight", "fontWeight", "letterSpacing", "fontFamily"] as const);
        set.textStyles.push({ name, description: strField(path, leaf), ...r } satisfies TextStyle);
      }, "styles.typography");
    }
    if (styles.shadow !== undefined) {
      walk(styles.shadow, [], (name, leaf) => {
        const path = `styles.shadow.${name.split("/").join(".")}`;
        const r = parseStyleRefs(path, leaf, ["offsetX", "offsetY", "blur", "spread", "color"] as const);
        set.shadowStyles.push({ name, description: strField(path, leaf), ...r } satisfies ShadowStyle);
      }, "styles.shadow");
    }
  }
  return set;
}

export function loadSeed(): TokenSet {
  return parseDtcg(seed);
}
