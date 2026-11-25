import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Mode, TokenSet } from "@token-bridge/tokens";
import { collectRules, type CollectedRule } from "./collect.ts";
import { CARD_ATTR, InspectCard } from "./InspectCard.tsx";
import { introspect, type InspectResult, type InspectRow } from "./introspect.ts";
import { store, useEditor } from "../state/store.ts";

/** Intervalo do hover; os testes zeram. */
export const INSPECT_THROTTLE = { ms: 50 };

const PORTALS = ".MuiPopover-root, .MuiModal-root, .MuiPopper-root, .MuiSnackbar-root";
const HIGHLIGHT_Z_INDEX = 1500;

/** Assinatura barata das folhas: muda quando entram/saem <style> ou regras. */
function sheetSignature(doc: Document): string {
  let sig = `${doc.styleSheets.length}`;
  for (const sheet of Array.from(doc.styleSheets)) {
    try { sig += `,${sheet.cssRules.length}`; } catch { sig += ",x"; } // cross-origin
  }
  return sig;
}

/** Regras coletadas e resultados por elemento, válidos enquanto set, modo e folhas não mudam. */
class InspectCache {
  private key = "";
  private set?: TokenSet;
  private mode?: Mode;
  private rules?: CollectedRule[];
  private results = new Map<Element, InspectResult>();

  get(el: Element, doc: Document, set: TokenSet, mode: Mode, root: Element): InspectResult {
    const sig = sheetSignature(doc);
    if (sig !== this.key || set !== this.set || mode !== this.mode) {
      this.key = sig;
      this.set = set;
      this.mode = mode;
      this.rules = collectRules(doc);
      this.results.clear();
    }
    let hit = this.results.get(el);
    if (!hit) this.results.set(el, (hit = introspect(el, { doc, set, mode, root, rules: this.rules })));
    return hit;
  }
}

function Highlight({ target }: { target: Element }) {
  const [rect, setRect] = useState<DOMRect>();
  useLayoutEffect(() => {
    const update = (): void => setRect(target.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [target]);
  if (!rect) return null;
  return (
    <div
      aria-hidden
      data-inspect-highlight=""
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: HIGHLIGHT_Z_INDEX,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        boxSizing: "border-box",
        border: "var(--vx-border-width-focus) dashed var(--vx-border-focus)",
      }}
    />
  );
}

export function InspectLayer({ root, screen }: { root: RefObject<HTMLElement | null>; screen?: string }) {
  const active = useEditor((s) => s.inspect);
  const set = useEditor((s) => s.set);
  const mode = useEditor((s) => s.mode);
  const [target, setTarget] = useState<Element | null>(null);
  const [pinned, setPinned] = useState(false);
  const pinnedRef = useRef(false);
  const cache = useRef(new InspectCache());

  const pin = useCallback((value: boolean) => { pinnedRef.current = value; setPinned(value); }, []);
  const release = useCallback(() => { pin(false); setTarget(null); }, [pin]);

  // Solta o cartão preso quando o contexto muda (set, modo, tela) ou o modo é desligado.
  useEffect(() => { release(); }, [set, mode, screen, active, release]);

  useEffect(() => {
    if (!active) return;
    const doc = document;
    const counts = (t: EventTarget | null): t is Element => {
      if (!(t instanceof Element)) return false;
      if (t.closest(`[${CARD_ATTR}]`)) return false;
      return !!root.current?.contains(t) || !!t.closest(PORTALS);
    };

    let last = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let latest: EventTarget | null = null;
    const handleMove = (): void => {
      last = Date.now();
      timer = undefined;
      const t = latest;
      if (pinnedRef.current) return;
      if (t instanceof Element && t.closest(`[${CARD_ATTR}]`)) return;
      setTarget(counts(t) ? t : null);
    };
    const onMove = (e: Event): void => {
      latest = e.target;
      if (timer) return;
      const wait = INSPECT_THROTTLE.ms - (Date.now() - last);
      if (wait <= 0) handleMove();
      else timer = setTimeout(handleMove, wait);
    };
    const onClick = (e: Event): void => {
      if (!counts(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (pinnedRef.current) {
        pin(false);
        setTarget(e.target);
      } else {
        setTarget(e.target);
        pin(true);
      }
    };
    const onPointerDown = (e: Event): void => {
      if (!counts(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (counts(e.target)) e.stopPropagation();
        store.update((s) => ({ ...s, inspect: false }));
        return;
      }
      if (e.key === "Tab" || !counts(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    doc.addEventListener("pointermove", onMove, true);
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("mousedown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown, true);
    return () => {
      clearTimeout(timer);
      doc.removeEventListener("pointermove", onMove, true);
      doc.removeEventListener("click", onClick, true);
      doc.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("mousedown", onPointerDown, true);
      doc.removeEventListener("keydown", onKeyDown, true);
    };
  }, [active, root, pin]);

  const result = useMemo(
    () => (active && target?.isConnected && root.current ? cache.current.get(target, document, set, mode, root.current) : undefined),
    [active, target, set, mode, root],
  );

  const onPick = useCallback((row: InspectRow) => {
    store.update((s) => ({
      ...s,
      inspect: false,
      tab: row.layer === "specific" ? "specific" : "semantic",
      focusToken: `${row.layer}:${row.token}`,
    }));
  }, []);

  if (!active || !target || !result) return null;
  return (
    <>
      <Highlight target={target} />
      <InspectCard result={result} anchor={target} pinned={pinned} onPick={onPick} />
    </>
  );
}
