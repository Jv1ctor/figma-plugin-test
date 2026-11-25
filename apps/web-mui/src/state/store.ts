import { useSyncExternalStore } from "react";
import { isDisabled, loadSeed, parseDtcg, removeSpecific, toDtcg, validate } from "@token-bridge/tokens";
import type { Mode, TokenSet, Warning } from "@token-bridge/tokens";
import { FONT_CATALOG } from "../fonts.ts";

export type Tab = "base" | "semantic" | "specific";
export interface EditorState {
  set: TokenSet;
  seed: TokenSet;
  mode: Mode;
  tab: Tab;
  warnings: Warning[];
  warningsOpen: boolean;
  focusToken?: string;
  /** Modo Inspecionar da vitrine; fica fora do rascunho (só `set` é persistido). */
  inspect: boolean;
  /** Specifics removidos localmente e ainda não confirmados pelo Figma (lápides, spec §6.3). */
  removedSpecifics: string[];
}

export const DRAFT_KEY = "vortex-builder:draft:v1";
export const REMOVED_KEY = "vortex-builder:removed-specifics:v1";
const SAVE_DELAY_MS = 300;

const FONT_WEIGHTS: Record<string, number[]> = Object.fromEntries(FONT_CATALOG.map((f) => [f.family, f.weights]));
const SECONDARY_TOKEN = "background/accent-2/strong";

/** Avisos das regras + avisos de UI (componentes MUI ligados a token desligado, spec §5.2). */
function computeWarnings(set: TokenSet): Warning[] {
  const out = validate(set, { fontWeights: FONT_WEIGHTS });
  if (isDisabled(set, "semantic", SECONDARY_TOKEN)) {
    const token = `semantic:${SECONDARY_TOKEN}`;
    out.push({
      id: `disabled-group-in-use:${token}`,
      rule: "disabled-group-in-use",
      token,
      message: "Chip e Badge Secondary usam accent-2, que está desligado: voltam ao padrão do MUI",
    });
  }
  return out;
}

function readDraft(): TokenSet | undefined {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw === null ? undefined : parseDtcg(JSON.parse(raw));
  } catch {
    clearDraft(); // indisponível ou rascunho inválido: abre com o seed
    return undefined;
  }
}

function writeDraft(set: TokenSet): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(toDtcg(set)));
  } catch {
    // cheio ou bloqueado: o rascunho é só conveniência
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // idem
  }
}

function readRemoved(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_KEY);
    const v: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(v) && v.every((n) => typeof n === "string") ? v : [];
  } catch {
    return [];
  }
}

function writeRemoved(names: string[]): void {
  try {
    if (names.length === 0) localStorage.removeItem(REMOVED_KEY);
    else localStorage.setItem(REMOVED_KEY, JSON.stringify(names));
  } catch {
    // conveniência apenas
  }
}

const seed = loadSeed();
/** Rascunho cujos avisos não podem ser calculados (ex.: cor ilegível) não abre o app: volta ao seed. */
function initialState(): { set: TokenSet; warnings: Warning[] } {
  const draft = readDraft();
  if (draft) {
    try {
      return { set: draft, warnings: computeWarnings(draft) };
    } catch {
      clearDraft();
    }
  }
  return { set: seed, warnings: computeWarnings(seed) };
}
const initial = initialState();
let state: EditorState = {
  set: initial.set,
  seed,
  mode: "light",
  tab: "base",
  warnings: initial.warnings,
  warningsOpen: false,
  inspect: false,
  // o rascunho é salvo com debounce e a lápide não: descarta lápide de specific que ainda existe
  removedSpecifics: readRemoved().filter((n) => !(n in initial.set.specific)),
};
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => writeDraft(state.set), SAVE_DELAY_MS);
}

function commit(next: EditorState): void {
  if (next === state) return;
  const setChanged = next.set !== state.set;
  state = setChanged ? { ...next, warnings: computeWarnings(next.set) } : next;
  if (setChanged) {
    // recriar um specific descarta a lápide dele
    const kept = state.removedSpecifics.filter((n) => !(n in state.set.specific));
    if (kept.length !== state.removedSpecifics.length) {
      state = { ...state, removedSpecifics: kept };
      writeRemoved(kept);
    }
  }
  for (const fn of listeners) fn();
  if (setChanged) scheduleSave();
}

export const store = {
  get(): EditorState {
    return state;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  update(fn: (s: EditorState) => EditorState): void {
    commit(fn(state));
  },
  replaceSet(set: TokenSet): void {
    commit({ ...state, set });
  },
  /** Remove um specific e registra a lápide (o envio ao Figma é que apaga de fato). */
  removeSpecific(name: string): void {
    const removed = state.removedSpecifics.includes(name) ? state.removedSpecifics : [...state.removedSpecifics, name];
    commit({ ...state, set: removeSpecific(state.set, name), removedSpecifics: removed });
    writeRemoved(state.removedSpecifics);
  },
  /** Substitui o set pelo do Figma, preservando os grupos desligados locais; zera as lápides. */
  importSet(set: TokenSet): void {
    const local = state.set;
    const keep = <T extends { name: string }>(layer: "base" | "semantic" | "specific", incoming: Record<string, T>): Record<string, T> => {
      const out = { ...incoming };
      for (const [n, t] of Object.entries(local[layer] as Record<string, T>)) {
        if (!(n in out) && isDisabled(local, layer, n)) out[n] = t; // nunca vão ao Figma: não podem sumir do rascunho
      }
      return out;
    };
    commit({
      ...state,
      set: {
        ...set,
        base: keep("base", set.base),
        semantic: keep("semantic", set.semantic),
        specific: keep("specific", set.specific),
        disabledGroups: local.disabledGroups,
      },
      removedSpecifics: [],
    });
    writeRemoved([]);
  },
  clearTombstones(names: string[]): void {
    const kept = state.removedSpecifics.filter((n) => !names.includes(n));
    if (kept.length === state.removedSpecifics.length) return;
    commit({ ...state, removedSpecifics: kept });
    writeRemoved(kept);
  },
  /** Restaura o padrão do laboratório e apaga o rascunho. */
  reset(): void {
    commit({ ...state, set: state.seed, focusToken: undefined, removedSpecifics: [] });
    writeRemoved([]);
    clearTimeout(saveTimer);
    clearDraft();
  },
};

export function useEditor<T>(select: (s: EditorState) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}
