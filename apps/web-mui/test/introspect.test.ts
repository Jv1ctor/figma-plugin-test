// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSeed, upsertSpecific, type AliasToken, type Mode } from "@token-bridge/tokens";
import { introspect } from "../src/inspect/introspect.ts";
import { propertyLabel } from "../src/inspect/labels.ts";

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement("main");
  document.body.append(root);
});
afterEach(() => {
  document.head.querySelectorAll("style").forEach((s) => s.remove());
  document.body.innerHTML = "";
});

function css(text: string): void {
  const s = document.createElement("style");
  s.textContent = text;
  document.head.append(s);
}
function el(tag: string, cls: string, parent: Element = root): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent.append(e);
  return e;
}
const run = (e: Element, mode: Mode = "light") => introspect(e, { doc: document, set: loadSeed(), mode, root });
function SPEC(name: string): AliasToken {
  const seed = loadSeed();
  const base = seed.semantic["background/canvas"]!;
  const ref = Object.keys(seed.base).find((n) => n.startsWith("brand-1/"))!;
  return { ...base, name, values: { light: ref, dark: ref } };
}

describe("introspect", () => {
  it("regra simples", () => {
    css(".a{background-color:var(--vx-background-surface)}");
    const r = run(el("div", "a"));
    expect(r.rows).toContainEqual(expect.objectContaining({ state: "rest", label: "fundo", token: "background/surface", layer: "semantic", value: "#fafafa" }));
  });
  it("indireção --variant", () => {
    css(".b{--variant-containedBg:var(--vx-background-action-primary)} .b{background-color:var(--variant-containedBg)}");
    expect(run(el("button", "b")).rows).toContainEqual(expect.objectContaining({ label: "fundo", token: "background/action/primary" }));
  });
  it("estados", () => {
    css(".c:hover{background-color:var(--vx-background-action-primary-hover)} .c.Mui-disabled{opacity:var(--vx-opacity-disabled)} .c.Mui-focusVisible{outline:var(--vx-border-width-focus) solid var(--vx-border-focus)}");
    const rows = run(el("button", "c")).rows;
    expect(rows.map((r) => r.state)).toEqual(expect.arrayContaining(["hover", "disabled", "focus"]));
    expect(rows.filter((r) => r.state === "focus").map((r) => r.token).sort()).toEqual(["border-width/focus", "border/focus"].sort());
    expect(rows.find((r) => r.state === "disabled")).toMatchObject({ token: "opacity/disabled", value: expect.stringMatching(/^\d+%$/) });
  });
  it("precedência", () => {
    css(".d{color:var(--vx-text-secondary)} div.d{color:var(--vx-text-primary)}");
    expect(run(el("div", "d")).rows.find((r) => r.label === "texto")!.token).toBe("text/primary");
  });
  it("empate de especificidade: a última vence", () => {
    css(".d2{color:var(--vx-text-secondary)} .d2{color:var(--vx-text-primary)}");
    expect(run(el("div", "d2")).rows.find((r) => r.label === "texto")!.token).toBe("text/primary");
  });
  it("herança", () => {
    css(".p{color:var(--vx-text-link)}");
    const child = el("span", "", el("div", "p"));
    expect(run(child).rows).toContainEqual(expect.objectContaining({ label: "texto", token: "text/link", inherited: true }));
  });
  it("inline e atributo svg", () => {
    const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r.setAttribute("style", "fill: var(--vx-data-sequential-3)");
    root.append(r);
    expect(run(r).rows).toContainEqual(expect.objectContaining({ label: "preenchimento", token: "data/sequential-3" }));
  });
  it("atributo svg perde para regra de folha, inline vence", () => {
    css(".s{fill:var(--vx-data-sequential-2)}");
    const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r.setAttribute("class", "s");
    r.setAttribute("fill", "var(--vx-data-sequential-1)");
    root.append(r);
    expect(run(r).rows.filter((x) => x.label === "preenchimento").map((x) => x.token)).toEqual(["data/sequential-2"]);
    r.setAttribute("style", "fill: var(--vx-data-sequential-4)");
    expect(run(r).rows.filter((x) => x.label === "preenchimento").map((x) => x.token)).toEqual(["data/sequential-4"]);
  });
  it("base é violação", () => {
    css(".e{color:var(--vx-base-neutral-900)}");
    expect(run(el("div", "e")).rows[0]).toMatchObject({ layer: "base" });
  });
  it("specific", () => {
    const set = upsertSpecific(loadSeed(), SPEC("background/reading"));
    css(".f{background-color:var(--vx-background-reading)}");
    expect(introspect(el("div", "f"), { doc: document, set, mode: "light", root }).rows[0]).toMatchObject({ token: "background/reading", layer: "specific" });
  });
  it("sem tokens", () => {
    expect(run(el("div", "")).rows).toEqual([]);
  });
  it("folha inacessível", () => {
    css(".a{color:var(--vx-text-primary)}");
    const bad = document.createElement("style");
    document.head.append(bad);
    Object.defineProperty(bad.sheet!, "cssRules", { get() { throw new DOMException("x", "SecurityError"); } });
    expect(() => run(el("div", "a"))).not.toThrow();
    expect(run(el("div", "a")).rows.length).toBeGreaterThan(0);
  });
  it("modo escuro", () => {
    css(".g{color:var(--vx-text-primary)}");
    expect(introspect(el("div", "g"), { doc: document, set: loadSeed(), mode: "dark", root }).rows[0]!.value).toBe("#fafafa");
  });
  it("shorthand com vários tokens e sombra como estilo", () => {
    css(".h{padding:var(--vx-space-small) var(--vx-space-medium);box-shadow:var(--vx-shadow-raised)}");
    const rows = run(el("div", "h")).rows;
    expect(rows.filter((r) => r.label === "padding").map((r) => r.value)).toEqual(expect.arrayContaining([expect.stringMatching(/ px$/)]));
    expect(rows.filter((r) => r.label === "padding")).toHaveLength(2);
    expect(rows).toContainEqual(expect.objectContaining({ label: "sombra", token: "shadow/raised", layer: "semantic", value: "sombra" }));
  });
  it("pseudo-elemento e @media", () => {
    css(".i::before{background-color:var(--vx-background-surface)} @media (min-width: 1px){.j{color:var(--vx-text-primary)}}");
    expect(run(el("div", "i")).rows[0]).toMatchObject({ pseudo: "before", label: "fundo (antes)" });
    expect(run(el("div", "j")).rows.length).toBe(1);
  });
  it("seletor não suportado é ignorado", () => {
    css(".k:nonexistent-pseudo{color:var(--vx-text-primary)} .k{color:var(--vx-text-secondary)}");
    expect(run(el("div", "k")).rows.map((r) => r.token)).toEqual(["text/secondary"]);
  });
  it("componente e spot", () => {
    const spot = el("div", "");
    spot.dataset.spot = "botoes";
    const b = el("button", "MuiButton-root", spot);
    const inner = el("span", "", b);
    expect(run(inner)).toMatchObject({ component: "MuiButton-root", spot: "botoes" });
    expect(run(spot).component).toBe("div");
  });
});

describe("propertyLabel", () => {
  it("segue a tabela", () => {
    expect(propertyLabel("background")).toBe("fundo");
    expect(propertyLabel("border-top-color")).toBe("borda");
    expect(propertyLabel("border-bottom-width")).toBe("espessura da borda");
    expect(propertyLabel("border-top-left-radius")).toBe("raio");
    expect(propertyLabel("padding-left")).toBe("padding");
    expect(propertyLabel("margin-top")).toBe("espaçamento");
    expect(propertyLabel("outline-offset")).toBe("foco");
    expect(propertyLabel("display")).toBeUndefined();
  });
});
