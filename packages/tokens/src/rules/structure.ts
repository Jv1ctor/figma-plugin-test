import { deltaEOk, hueOf, oklchLightness, SCALE_STEPS } from "../color.ts";
import { allowedBaseGroups, baseGroupOf, isDisabled } from "../groups.ts";
import { resolve, tokenKey } from "../resolve.ts";
import type { AliasToken, Layer, Mode, TokenSet } from "../types.ts";
import { MODES } from "../types.ts";
import { checkSpecificName } from "./naming.ts";
import type { RuleId, ValidateOptions, Warning } from "./types.ts";

/** ΔE OKLab mínimo entre os passos /600 de duas paletas de dados (o seed chega a 0,078 entre data-2 e data-5). */
export const DATA_MIN_DELTA_E = 0.05;
/** Distância mínima de matiz (graus OKLCH) entre /600 de data-N e /600 de uma paleta de status (o seed chega a 8,4°). */
export const DATA_MIN_HUE_DISTANCE = 5;

const FEEDBACK = ["danger", "warning", "success", "information"];
const FEEDBACK_HEADS = new Set(["text", "icon", "background", "border"]);
const SIZE_ORDER = ["none", "xx-small", "x-small", "small", "medium", "large", "x-large", "xx-large"];

type Ref = { ref: string; part?: "color" | "opacity" };
function refsOf(token: AliasToken, mode: Mode): Ref[] {
  const v = token.values[mode];
  return typeof v === "string" ? [{ ref: v }] : [{ ref: v.color, part: "color" }, { ref: v.opacity, part: "opacity" }];
}

function aliasEntries(set: TokenSet, layers: Layer[]): { layer: "semantic" | "specific"; name: string; token: AliasToken }[] {
  return layers.flatMap((layer) =>
    Object.entries(set[layer as "semantic" | "specific"]).map(([name, token]) => ({ layer: layer as "semantic" | "specific", name, token })));
}

function warn(rule: RuleId, token: string, message: string, extra: Partial<Warning> = {}, idTail = ""): Warning {
  return { id: `${rule}:${token}${extra.mode ? `:${extra.mode}` : ""}${idTail}`, token, rule, message, ...extra };
}

function numberOf(set: TokenSet, layer: Layer, name: string, mode: Mode): number | undefined {
  const r = resolve(set, layer, name, mode);
  return r.kind === "number" ? r.value : undefined;
}

function feedbackPalette(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  for (const { layer, name, token } of aliasEntries(set, ["semantic", "specific"])) {
    const segments = name.split("/");
    if (!FEEDBACK_HEADS.has(segments[0]) || segments.some((s) => s.startsWith("on-"))) continue;
    const palette = name.split(/[/-]/).find((w) => FEEDBACK.includes(w));
    if (!palette) continue;
    for (const mode of MODES) {
      const bad = refsOf(token, mode).find((r) => r.part !== "opacity" && baseGroupOf(r.ref) !== palette);
      if (!bad) continue;
      out.push(warn("feedback-palette", tokenKey(layer, name), `Deve referenciar a paleta ${palette}, mas aponta para ${bad.ref}.`,
        { mode, actual: bad.ref, expected: `${palette}/*` }));
    }
  }
  return out;
}

function wrongGroup(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  for (const { layer, name, token } of aliasEntries(set, ["semantic", "specific"])) {
    const allowed = allowedBaseGroups(layer, name);
    if (allowed.length === 0) continue; // nome fora do vocabulário: quem avisa é specific-name
    for (const mode of MODES) {
      for (const { ref, part } of refsOf(token, mode)) {
        const group = baseGroupOf(ref);
        if (part === "opacity" ? group === "opacity" : allowed.includes(group)) continue;
        out.push(warn("wrong-group", tokenKey(layer, name), `Referência ${ref} está no grupo ${group}, fora de ${part === "opacity" ? "opacity" : allowed.join(", ")}.`,
          { mode, actual: group, expected: part === "opacity" ? "opacity" : allowed.join(", ") }, `:${ref}`));
      }
    }
  }
  return out;
}

/** Um warning por par adjacente fora de ordem; `token` é o de nome menor (o que ficou grande demais). */
function sizeOrder(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  for (const group of ["space", "radius"]) {
    for (const mode of MODES) {
      const present = SIZE_ORDER.map((size) => ({ name: `${group}/${size}`, value: numberOf(set, "semantic", `${group}/${size}`, mode) }))
        .filter((e): e is { name: string; value: number } => e.value !== undefined);
      for (let i = 0; i + 1 < present.length; i++) {
        const [a, b] = [present[i], present[i + 1]];
        if (a.value <= b.value) continue;
        out.push(warn("size-order", tokenKey("semantic", a.name),
          `${a.name} (${a.value}) é maior que ${b.name} (${b.value}); a ordem deve ser crescente.`,
          { mode, actual: String(a.value), expected: `≤ ${b.value}`, against: b.name }));
      }
    }
  }
  return out;
}

const roundToFourUp = (x: number) => Math.floor(x / 4 + 0.5 + 1e-9) * 4;

function lineHeight(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  for (const name of Object.keys(set.semantic)) {
    const m = /^typography\/([^/]+)\/([^/]+)\/line-height$/.exec(name);
    if (!m) continue;
    const factor = m[1] === "display" || m[1] === "heading" ? 1.3 : m[1] === "body" || m[1] === "label" ? 1.5 : undefined;
    if (!factor) continue;
    for (const mode of MODES) {
      const size = numberOf(set, "semantic", `typography/${m[1]}/${m[2]}/font-size`, mode);
      const actual = numberOf(set, "semantic", name, mode);
      if (size === undefined || actual === undefined) continue;
      const expected = roundToFourUp(size * factor);
      if (actual === expected) continue;
      out.push(warn("line-height", tokenKey("semantic", name),
        `Altura de linha ${actual}px; esperado ${expected}px (${size}px × ${factor}, múltiplo de 4).`,
        { mode, actual: String(actual), expected: String(expected) }));
    }
  }
  return out;
}

function focusWidth(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  for (const mode of MODES) {
    const w = numberOf(set, "semantic", "border-width/focus", mode);
    if (w === undefined || w >= 2) continue;
    out.push(warn("focus-width", tokenKey("semantic", "border-width/focus"), `Espessura do foco ${w}px; mínimo 2px.`,
      { mode, actual: `${w}px`, expected: "2px" }));
  }
  return out;
}

const NEUTRAL_STEPS = [0, ...SCALE_STEPS, 1000];

function neutral(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  const hexOf = (name: string) => { const r = resolve(set, "base", name, "light"); return r.kind === "color" ? r.hex : undefined; };
  for (const [step, expected] of [[0, "#ffffff"], [1000, "#000000"]] as const) {
    const name = `neutral/${step}`;
    const hex = hexOf(name);
    if (hex !== undefined && hex !== expected) {
      out.push(warn("neutral", tokenKey("base", name), `${name} deve ser ${expected}, mas é ${hex}.`, { actual: hex, expected }));
    }
  }
  let prev: { name: string; l: number } | undefined;
  for (const step of NEUTRAL_STEPS) {
    const name = `neutral/${step}`;
    const hex = hexOf(name);
    if (hex === undefined) continue;
    const l = oklchLightness(hex);
    if (prev && l >= prev.l) {
      out.push(warn("neutral", tokenKey("base", name), `Luminosidade de ${name} (${l.toFixed(3)}) não é menor que a de ${prev.name} (${prev.l.toFixed(3)}).`,
        { actual: l.toFixed(3), expected: `< ${prev.l.toFixed(3)}`, against: prev.name }));
    }
    prev = { name, l };
  }
  return out;
}

function dataPalettes(set: TokenSet): Warning[] {
  if (set.disabledGroups.includes("data")) return [];
  const out: Warning[] = [];
  const hexOf = (name: string) => { const r = resolve(set, "base", name, "light"); return r.kind === "color" ? r.hex : undefined; };
  const data = [1, 2, 3, 4, 5, 6].flatMap((n) => { const hex = hexOf(`data-${n}/600`); return hex ? [{ name: `data-${n}/600`, hex }] : []; });
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const d = deltaEOk(data[i].hex, data[j].hex);
      if (d >= DATA_MIN_DELTA_E) continue;
      out.push(warn("data-palettes", tokenKey("base", data[j].name), `${data[j].name} é parecida demais com ${data[i].name} (ΔE ${d.toFixed(3)}).`,
        { actual: d.toFixed(3), expected: `≥ ${DATA_MIN_DELTA_E}`, against: data[i].name }));
    }
  }
  for (const palette of FEEDBACK) {
    const statusHex = hexOf(`${palette}/600`);
    const status = statusHex === undefined ? undefined : hueOf(statusHex);
    if (status === undefined) continue;
    for (const d of data) {
      const hue = hueOf(d.hex);
      if (hue === undefined) continue;
      const raw = Math.abs(hue - status) % 360;
      const dist = Math.min(raw, 360 - raw);
      if (dist >= DATA_MIN_HUE_DISTANCE) continue;
      out.push(warn("data-palettes", tokenKey("base", d.name), `${d.name} usa matiz de ${palette}/600 (diferença ${dist.toFixed(1)}°).`,
        { actual: `${dist.toFixed(1)}°`, expected: `≥ ${DATA_MIN_HUE_DISTANCE}°`, against: `${palette}/600` }));
    }
  }
  return out;
}

function fontWeight(set: TokenSet, opts: ValidateOptions): Warning[] {
  const out: Warning[] = [];
  const available = opts.fontWeights;
  if (!available) return out;
  for (const name of Object.keys(set.semantic)) {
    const m = /^typography\/([^/]+)\/[^/]+\/font-weight$/.exec(name);
    if (!m) continue;
    for (const mode of MODES) {
      const weight = numberOf(set, "semantic", name, mode);
      const family = resolve(set, "semantic", `typography/${m[1]}/font-family`, mode);
      if (weight === undefined || family.kind !== "string") continue;
      const weights = available[family.value];
      if (!weights || weights.includes(weight)) continue;
      out.push(warn("font-weight", tokenKey("semantic", name), `${family.value} não tem o peso ${weight} (disponíveis: ${weights.join(", ")}).`,
        { mode, actual: String(weight), expected: weights.join(", ") }));
    }
  }
  return out;
}

function disabledGroupInUse(set: TokenSet): Warning[] {
  const out: Warning[] = [];
  for (const { name, token } of aliasEntries(set, ["specific"])) {
    for (const mode of MODES) {
      for (const { ref } of refsOf(token, mode)) {
        if (!(ref in set.base) || !isDisabled(set, "base", ref)) continue;
        out.push(warn("disabled-group-in-use", tokenKey("specific", name), `Referencia ${ref}, de um grupo desligado (${baseGroupOf(ref)}).`,
          { mode, actual: ref }, `:${ref}`));
      }
    }
  }
  return out;
}

function specificNames(set: TokenSet): Warning[] {
  return Object.keys(set.specific).flatMap((name) => checkSpecificName(name, set.semantic));
}

export function structureWarnings(set: TokenSet, opts: ValidateOptions): Warning[] {
  return [
    ...feedbackPalette(set), ...wrongGroup(set), ...sizeOrder(set), ...lineHeight(set), ...focusWidth(set),
    ...neutral(set), ...dataPalettes(set), ...fontWeight(set, opts), ...disabledGroupInUse(set), ...specificNames(set),
  ];
}
