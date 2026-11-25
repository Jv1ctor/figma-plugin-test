import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Mode, TokenSet } from "@token-bridge/tokens";
import { collectRules, type CollectedRule } from "./collect.ts";
import { CARD_ATTR, InspectCard, type CardResult } from "./InspectCard.tsx";
import { introspect, type InspectRow } from "./introspect.ts";
import { store, useEditor } from "../state/store.ts";

/** Intervalo do hover; os testes zeram. */
export const INSPECT_THROTTLE = { ms: 50 };

const PORTALS = ".MuiPopover-root, .MuiModal-root, .MuiPopper-root, .MuiSnackbar-root";
const HIGHLIGHT_Z_INDEX = 1500;
const EDITOR_PORTAL = "[data-editor-portal]"; // overlays do editor e do cabeçalho: ficam fora da inspeção
const SCREEN_TABS = '[aria-label="Telas da vitrine"]'; // trocar de tela continua possível
const MUI_ROOT_CLASS = /^Mui[A-Za-z]+-root$/;
const LAYOUT_ROOT = /^Mui(?:Box|Stack|Grid|Container|SvgIcon)-root$/; // glifos e layout não são "o componente"
const MAX_PART_SCAN = 400;

function muiRootClass(el: Element): string | undefined {
  return (el.getAttribute("class") ?? "").split(/\s+/).find((c) => MUI_ROOT_CLASS.test(c));
}

/** Assinatura barata das folhas: muda quando entram/saem <style> ou regras. */
function sheetSignature(doc: Document): string {
  let sig = `${doc.styleSheets.length}`;
  for (const sheet of Array.from(doc.styleSheets)) {
    try { sig += `,${sheet.cssRules.length}`; } catch { sig += ",x"; } // cross-origin
  }
  return sig;
}

/**
 * Raiz do componente: o `Mui*-root` mais próximo (fora layout e glifos) dentro da vitrine/portal. Sem raiz, ou dentro de
 * um SVG que não é ícone (gráficos), fica o próprio elemento.
 */
function componentRoot(el: Element, boundary: Element | null): Element {
  const svg = el.closest("svg");
  if (svg && !svg.classList.contains("MuiSvgIcon-root")) return el;
  for (let p: Element | null = el; p; p = p.parentElement) {
    const cls = muiRootClass(p);
    if (cls && !LAYOUT_ROOT.test(cls)) return p;
    if (p === boundary || p === document.body) break;
  }
  return el;
}

/** `d` está sob outro `Mui*-root` (não layout) dentro de `comp`: a parte pertence a um componente aninhado. */
function nestedRoot(d: Element, comp: Element): boolean {
  for (let p = d.parentElement; p && p !== comp; p = p.parentElement) {
    const cls = muiRootClass(p);
    if (cls && !LAYOUT_ROOT.test(cls)) return true;
  }
  return false;
}

/** Regras coletadas e resultados por elemento, válidos enquanto set, modo e folhas não mudam. */
export class InspectCache {
  private key = "";
  private set?: TokenSet;
  private mode?: Mode;
  private rules?: CollectedRule[];
  private results = new Map<Element, { sig: string; result: CardResult }>();

  clear(): void {
    this.results.clear();
  }

  /** Raiz do componente sob `el`, a mesma que o destaque e o cabeçalho usam. */
  rootOf(el: Element, root: Element): Element {
    return componentRoot(el, root.contains(el) ? root : el.closest(PORTALS));
  }

  get(el: Element, doc: Document, set: TokenSet, mode: Mode, root: Element): CardResult {
    const sig = sheetSignature(doc);
    if (sig !== this.key || set !== this.set || mode !== this.mode) {
      this.key = sig;
      this.set = set;
      this.mode = mode;
      this.rules = collectRules(doc);
      this.results.clear();
    }
    const comp = this.rootOf(el, root);
    const classes = `${el.getAttribute("class") ?? ""}|${comp.getAttribute("class") ?? ""}`;
    const hit = this.results.get(el);
    if (hit && hit.sig === classes) return hit.result;
    const run = (e: Element) => introspect(e, { doc, set, mode, root, rules: this.rules });
    const own = (e: Element): InspectRow[] => run(e).rows.filter((r) => !r.inherited);
    const base = run(comp);
    const parts: CardResult["parts"] = [];
    if (!(comp instanceof SVGElement)) {
      const win = doc.defaultView;
      for (const d of Array.from(comp.querySelectorAll("*")).slice(0, MAX_PART_SCAN)) {
        if (win?.getComputedStyle(d).pointerEvents !== "none") continue;
        if (nestedRoot(d, comp)) continue;
        const rows = own(d);
        if (rows.length) parts.push({ title: (d.getAttribute("class") ?? "").split(/\s+/).find((c) => c.startsWith("Mui")) ?? d.tagName.toLowerCase(), rows });
      }
    }
    const result: CardResult = {
      component: base.component,
      ...(base.spot ? { spot: base.spot } : {}),
      componentRows: base.rows,
      parts,
      elementRows: comp === el ? [] : own(el),
    };
    this.results.set(el, { sig: classes, result });
    return result;
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

/** Aba e `focusToken` de um token clicado. Estilos de sombra focam a primeira linha do grupo; a Base só abre a aba. */
export function pickTarget(row: Pick<InspectRow, "layer" | "token">): { tab: "base" | "semantic" | "specific"; focusToken?: string } {
  if (row.layer === "base") return { tab: "base" };
  if (row.layer === "specific") return { tab: "specific", focusToken: `specific:${row.token}` };
  const style = /^shadow\/[^/]+$/.test(row.token);
  return { tab: "semantic", focusToken: `semantic:${row.token}${style ? "/offset-x" : ""}` };
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
  useEffect(() => {
    release();
    if (active) cache.current.clear(); // o estado dos componentes pode ter mudado em Usar
  }, [set, mode, screen, active, release]);

  useEffect(() => {
    if (!active) return;
    const doc = document;
    const counts = (t: EventTarget | null): t is Element => {
      if (!(t instanceof Element)) return false;
      if (t.closest(`[${CARD_ATTR}], ${EDITOR_PORTAL}`)) return false;
      return !!root.current?.contains(t) || !!t.closest(PORTALS);
    };

    const blocks = (t: EventTarget | null): t is Element => counts(t) && !t.closest(SCREEN_TABS);

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
      if (!blocks(e.target)) return;
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
      if (!blocks(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (blocks(e.target)) e.stopPropagation();
        store.update((s) => ({ ...s, inspect: false }));
        return;
      }
      if (e.key === "Tab" || !blocks(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    // Espaço ativa botões, itens de menu e chips no keyup: também não pode chegar ao alvo contado.
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.key === "Tab" || e.key === "Escape" || !blocks(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    doc.addEventListener("pointermove", onMove, true);
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("mousedown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown, true);
    doc.addEventListener("keyup", onKeyUp, true);
    return () => {
      clearTimeout(timer);
      doc.removeEventListener("pointermove", onMove, true);
      doc.removeEventListener("click", onClick, true);
      doc.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("mousedown", onPointerDown, true);
      doc.removeEventListener("keydown", onKeyDown, true);
      doc.removeEventListener("keyup", onKeyUp, true);
    };
  }, [active, root, pin]);

  const result = useMemo(
    () => (active && target?.isConnected && root.current ? cache.current.get(target, document, set, mode, root.current) : undefined),
    [active, target, set, mode, root],
  );

  const onPick = useCallback((row: InspectRow) => {
    store.update((s) => ({ ...s, inspect: false, ...pickTarget(row) }));
  }, []);

  if (!active || !target || !result || !root.current) return null;
  const component = cache.current.rootOf(target, root.current);
  return (
    <>
      <Highlight target={component} />
      <InspectCard result={result} anchor={component} pinned={pinned} onPick={onPick} />
    </>
  );
}
