# Vortex Builder: Gráficos, Inspecionar e Restaurar padrão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A aba "Gráficos" na vitrine (x-charts + SVG) consome `data/*`; o modo Inspecionar mostra, no hover, propriedade → token do elemento; "Restaurar padrão" vira botão no cabeçalho.

**Architecture:** O inspetor é uma função pura `introspect` que lê o CSSOM, o estilo inline e os atributos SVG do elemento, segue as indireções `var(--x)` e chega aos tokens `--vx-*`. Uma camada React (`InspectLayer`) liga o modo, bloqueia a interação, destaca o elemento e mostra o cartão. Os gráficos usam só `var(--vx-data-…)`, nunca valores resolvidos.

**Tech Stack:** React 19, MUI v7, `@mui/x-charts` (MIT, compatível com `@mui/material` 7), vitest + jsdom + @testing-library.

**Spec:** `docs/superpowers/specs/2026-11-25-vortex-charts-inspect-design.md` (extends `docs/superpowers/specs/2026-11-25-vortex-mui-token-builder-design.md`).

## Global Constraints

- Nenhum componente nem override lê `--vx-base-*`. Cores de gráfico sempre como `var(--vx-data-…)`, nunca como hex resolvido.
- Copy em pt-BR. Espaçamento de layout via `var(--vx-space-*)`.
- O modo Inspecionar atua só na vitrine (`main[aria-label="Vitrine"]`) e nos portais MUI abertos a partir dela. O editor e o cabeçalho continuam interativos.
- `apps/web-mui` apenas; `packages/tokens` não muda.
- Commits terminam com a linha em branco + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Componentes MUI cuja cor vem de uma indireção (`--variant-containedBg`, `--Paper-shadow`, …) mostram o token final, não o nome da variável intermediária. Teste de integração na Task 4.
2. Overlay aberto (Dialog) + Inspecionar ligado: `Esc` volta para Usar e o Dialog continua aberto; clique dentro do Dialog não fecha nem aciona botões. Teste na Task 4.
3. Grupo `data` desligado na Base: a aba Gráficos mostra o estado vazio e não lança erro. Teste na Task 2.
4. Elemento sem nenhum token (ex.: um `div` de layout): o cartão mostra "Nenhum token aplicado" em vez de vazio/erro. Teste na Task 3.
5. Folha CSS inacessível (`cssRules` lança `SecurityError`): `introspect` ignora a folha e continua. Teste na Task 3.

---

## File Structure

```
apps/web-mui/src/
  shell/Header.tsx                 # Task 1 (botão Restaurar) · Task 4 (toggle Usar|Inspecionar)
  shell/ResetButton.tsx            # Task 1
  export/ExportMenu.tsx            # Task 1 (remove o item de reset)
  showcase/Charts.tsx              # Task 2
  showcase/charts/{Heatmap,CategoricalLegend}.tsx   # Task 2
  theme/overrides/charts.ts        # Task 2
  theme/createVortexTheme.ts       # Task 2 (junta charts)
  showcase/spots.ts                # Task 2 (spots dos gráficos)
  App.tsx                          # Task 2 (aba Gráficos) · Task 4 (InspectLayer)
  inspect/specificity.ts           # Task 3 (movido de test/helpers.ts)
  inspect/labels.ts                # Task 3
  inspect/introspect.ts            # Task 3
  inspect/InspectLayer.tsx         # Task 4
  inspect/InspectCard.tsx          # Task 4
  state/store.ts                   # Task 4 (inspect: boolean)
apps/web-mui/test/
  reset-button.test.tsx · charts.test.tsx · introspect.test.ts · inspect-mode.test.tsx
```

---

### Task 1: Botão "Restaurar padrão" no cabeçalho

**Files:**
- Create: `apps/web-mui/src/shell/ResetButton.tsx`
- Modify: `apps/web-mui/src/shell/Header.tsx`, `apps/web-mui/src/export/ExportMenu.tsx` (remover o item "Restaurar padrão do laboratório" e o Dialog de confirmação dali)
- Test: `apps/web-mui/test/reset-button.test.tsx`; ajustar `test/export-menu.test.tsx` (o teste de reset muda para o botão)

**Interfaces:**
- Produces: `export function ResetButton(): JSX.Element` — botão `startIcon={<RestartAltIcon/>}` texto "Restaurar padrão"; abre Dialog com título "Restaurar o padrão do laboratório?" e texto "As edições atuais serão perdidas."; ações "Cancelar" e "Restaurar" (esta chama `store.reset()`).

- [ ] **Step 1: Escrever os testes que falham**

```tsx
render(<App />);
store.update((s) => ({ ...s, set: setBaseValue(s.set, "brand-1/600", "#16a34a") }));
await user.click(screen.getByRole("button", { name: "Restaurar padrão" }));
await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Restaurar" }));
expect(store.get().set).toEqual(loadSeed());
// cancelar não muda nada
// menu Exportar não tem mais o item
await user.click(screen.getByRole("button", { name: /Exportar/ }));
expect(screen.queryByRole("menuitem", { name: /Restaurar/ })).toBeNull();
```

- [ ] **Step 2: Rodar.** `pnpm --filter web-mui test -- reset-button export-menu` → FAIL.
- [ ] **Step 3: Implementar** `ResetButton`, inserir no Header logo antes de `<ExportMenu />`, remover do ExportMenu.
- [ ] **Step 4: Rodar a suíte do app + typecheck.** `pnpm --filter web-mui test && pnpm --filter web-mui typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web-mui): reset-to-default button in the header`

---

### Task 2: Aba "Gráficos" (x-charts + SVG)

**Files:**
- Create: `src/showcase/Charts.tsx`, `src/showcase/charts/Heatmap.tsx`, `src/showcase/charts/CategoricalLegend.tsx`, `src/theme/overrides/charts.ts`
- Modify: `src/theme/createVortexTheme.ts` (spread de `chartsOverrides`), `src/showcase/spots.ts`, `src/App.tsx` (SCREENS ganha `{ id: "graficos", label: "Gráficos", View: Charts }` depois de "overlays"), `apps/web-mui/package.json` (`@mui/x-charts`)
- Test: `apps/web-mui/test/charts.test.tsx`

**Interfaces:**
- Consumes: `Spot`, `SPOTS` (fase 1), `useEditor`, `store`.
- Produces:
  - `export function Charts(): JSX.Element`
  - `export function Heatmap(props: { rows: string[]; cols: string[]; values: number[][]; max: number }): JSX.Element` — SVG; cada célula `style={{ fill: "var(--vx-data-sequential-N)" }}` com N = faixa 1..5 de `value/max` (limites 20/40/60/80%); legenda com 5 amostras e as faixas "0–20%" … "80–100%" em `text/secondary`.
  - `export function CategoricalLegend(props: { series: string[] }): JSX.Element` — amostras `var(--vx-data-categorical-(i+1))` + nome.
  - `export const chartsOverrides: Components<Theme>` (ou o tipo que o x-charts expõe para theme augmentation) em `overrides/charts.ts`.
  - SPOTS novos: `"chart-bar"`, `"chart-line"`, `"chart-heatmap"`, `"chart-legend"` com os tokens consumidos (categorical/sequential, `border/subtle`, `text/secondary`, body/small; tooltip: `background/surface-raised`, `shadow/raised`, `text/primary`).

Regras (spec §4):
- BarChart agrupado, 6 séries na ordem `categorical-1..6`; LineChart com 3 séries `categorical-1..3`. Cores via CSS: preferir `sx`/overrides mirando as classes de série da versão instalada com `fill`/`stroke: var(--vx-data-categorical-n)`; se só `colors` funcionar, passar as strings `var(…)`. Verificar no browser (`pnpm --filter web-mui dev`) que a barra aparece colorida; registrar no report qual caminho funcionou.
- `chartsOverrides`: eixo e grade `border/subtle`; ticks/rótulos `text/secondary` + `typography/body/small/*`; tooltip `background/surface-raised` + `shadow/raised` + `text/primary`.
- Grupo `data` desligado (`set.disabledGroups.includes("data")`): render do estado vazio "Gráficos desligados na Base (grupo data)" + botão "Ir para a Base" que faz `store.update(s => ({ ...s, tab: "base" }))`.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
render(<Wrapped><Charts /></Wrapped>);
const css = emotionCss() + document.body.innerHTML;
for (let n = 1; n <= 6; n++) expect(css).toContain(`var(--vx-data-categorical-${n})`);
for (let n = 1; n <= 5; n++) expect(css).toContain(`var(--vx-data-sequential-${n})`);
expect(css).not.toMatch(/var\(--vx-base-/);
expect(screen.getByText("80–100%")).toBeTruthy();
// desligado
store.update((s) => ({ ...s, set: { ...s.set, disabledGroups: ["data"] } }));
expect(screen.getByText("Gráficos desligados na Base (grupo data)")).toBeTruthy();
await user.click(screen.getByRole("button", { name: "Ir para a Base" }));
expect(store.get().tab).toBe("base");
// a vitrine tem a aba
render(<App />); expect(screen.getByRole("tab", { name: "Gráficos" })).toBeTruthy();
```

(Se o x-charts não renderizar SVG em jsdom por falta de layout, envolver em `width`/`height` fixos; se ainda assim não emitir as séries, o teste das categóricas passa a verificar o CSS das overrides/sx + a `CategoricalLegend`, e o report explica.)

- [ ] **Step 2: Rodar.** → FAIL.
- [ ] **Step 3: Instalar** `@mui/x-charts` (versão compatível com `@mui/material@^7`, conferir com `pnpm view @mui/x-charts peerDependencies`).
- [ ] **Step 4: Implementar.**
- [ ] **Step 5: Rodar suíte + typecheck + build.** `pnpm --filter web-mui test && pnpm --filter web-mui typecheck && pnpm --filter web-mui build` → PASS.
- [ ] **Step 6: Commit** `feat(web-mui): charts screen with x-charts and SVG consuming data/* tokens`

---

### Task 3: `introspect` — do elemento aos tokens

**Files:**
- Create: `src/inspect/specificity.ts` (mover `specificity` e `beats` de `test/helpers.ts`; `helpers.ts` passa a reexportar), `src/inspect/labels.ts`, `src/inspect/introspect.ts`
- Test: `apps/web-mui/test/introspect.test.ts`

**Interfaces:**
- Consumes: `TokenSet`, `Mode`, `resolve` de `@token-bridge/tokens`.
- Produces:

```ts
export type InspectState = "rest" | "hover" | "active" | "focus" | "disabled";
export interface InspectRow {
  state: InspectState;
  property: string;          // CSS, ex. "background-color"
  label: string;             // pt-BR, ex. "fundo" (labels.ts)
  token: string;             // ex. "background/action/primary"
  layer: "semantic" | "specific" | "base";   // "base" = violação, exibida como aviso
  value: string;             // resolvido no modo: "#9246d7" | "16 px" | "Satoshi Variable" | "40%"
  inherited: boolean;
  pseudo?: "before" | "after";
}
export interface InspectResult { component: string; spot?: string; rows: InspectRow[] }
export function introspect(el: Element, opts: { doc: Document; set: TokenSet; mode: Mode; root: Element }): InspectResult;
// labels.ts
export function propertyLabel(cssProperty: string): string | undefined;  // tabela da spec §5; undefined = ignorar
```

Algoritmo: spec §5, passos 1–8 (coletar regras incl. `@media` que casam; casar seletor sem estado; declarações com `var(--`; resolver indireções subindo até `root` ou `document.body` em portal; mapear `--vx-<nome>` → specific depois semantic, `--vx-base-*` → layer "base"; precedência por especificidade/ordem, inline > folha > atributo SVG; herdadas `color`/`font-*` marcadas `inherited`; `fill`/`stroke` inline e atributos). `component` = primeira classe `Mui*-root` do elemento ou ancestral até 3 níveis, senão `tagName.toLowerCase()`; `spot` = `closest("[data-spot]")?.dataset.spot`.

- [ ] **Step 1: Escrever os testes que falham** (folhas montadas com `<style>` no jsdom; set = `loadSeed()`):

```ts
it("regra simples", () => { css(".a{background-color:var(--vx-background-surface)}"); const r = run(el("div","a"));
  expect(r.rows).toContainEqual(expect.objectContaining({ state:"rest", label:"fundo", token:"background/surface", layer:"semantic", value:"#fafafa" })); });
it("indireção --variant", () => { css(".b{--variant-containedBg:var(--vx-background-action-primary)} .b{background-color:var(--variant-containedBg)}");
  expect(run(el("button","b")).rows).toContainEqual(expect.objectContaining({ label:"fundo", token:"background/action/primary" })); });
it("estados", () => { css(".c:hover{background-color:var(--vx-background-action-primary-hover)} .c.Mui-disabled{opacity:var(--vx-opacity-disabled)} .c.Mui-focusVisible{outline:var(--vx-border-width-focus) solid var(--vx-border-focus)}");
  const rows = run(el("button","c")).rows; expect(rows.map(r=>r.state)).toEqual(expect.arrayContaining(["hover","disabled","focus"])); });
it("precedência", () => { css(".d{color:var(--vx-text-secondary)} div.d{color:var(--vx-text-primary)}"); expect(run(el("div","d")).rows.find(r=>r.label==="texto")!.token).toBe("text/primary"); });
it("herança", () => { css(".p{color:var(--vx-text-link)}"); const child = el("span","", el("div","p")); expect(run(child).rows).toContainEqual(expect.objectContaining({ label:"texto", token:"text/link", inherited:true })); });
it("inline e atributo svg", () => { const r = document.createElementNS("http://www.w3.org/2000/svg","rect"); r.setAttribute("style","fill: var(--vx-data-sequential-3)"); root.append(r);
  expect(run(r).rows).toContainEqual(expect.objectContaining({ label:"preenchimento", token:"data/sequential-3" })); });
it("base é violação", () => { css(".e{color:var(--vx-base-neutral-900)}"); expect(run(el("div","e")).rows[0]).toMatchObject({ layer:"base" }); });
it("specific", () => { const set = upsertSpecific(loadSeed(), SPEC("background/reading")); css(".f{background-color:var(--vx-background-reading)}");
  expect(introspect(el("div","f"), { doc:document, set, mode:"light", root }).rows[0]).toMatchObject({ token:"background/reading", layer:"specific" }); });
it("sem tokens", () => { expect(run(el("div","")).rows).toEqual([]); });
it("folha inacessível", () => { /* stub de uma StyleSheet cujo cssRules lança SecurityError */ expect(() => run(el("div","a"))).not.toThrow(); });
it("modo escuro", () => { css(".g{color:var(--vx-text-primary)}"); expect(introspect(el("div","g"), { doc:document, set:loadSeed(), mode:"dark", root }).rows[0].value).toBe("#fafafa"); });
```

(`css(text)` injeta um `<style>`; `el(tag, cls, parent=root)` cria e anexa; `run(e)` chama `introspect` com o seed, modo light e `root`; `SPEC` monta um AliasToken specific de cor como na fase 1.)

- [ ] **Step 2: Rodar.** → FAIL.
- [ ] **Step 3: Implementar.** Mover `specificity`/`beats` para `src/inspect/specificity.ts` sem mudar comportamento (os testes da fase 1 que os usam continuam passando via reexport).
- [ ] **Step 4: Rodar suíte + typecheck.** → PASS.
- [ ] **Step 5: Commit** `feat(web-mui): introspect resolves applied CSS to Vortex tokens`

---

### Task 4: Modo Inspecionar (toggle, bloqueio, destaque, cartão)

**Files:**
- Create: `src/inspect/InspectLayer.tsx`, `src/inspect/InspectCard.tsx`
- Modify: `src/state/store.ts` (`inspect: boolean`, default `false`, fora do rascunho), `src/shell/Header.tsx` (ToggleButtonGroup `aria-label="Modo de interação"` com "Usar" | "Inspecionar"), `src/App.tsx` (montar `<InspectLayer root={vitrineRef} />` e passar o ref do `main`)
- Test: `apps/web-mui/test/inspect-mode.test.tsx`

**Interfaces:**
- Consumes: `introspect`, `InspectResult`, `InspectRow` (Task 3); `store`, `useEditor`.
- Produces: `export function InspectLayer(props: { root: React.RefObject<HTMLElement | null> }): JSX.Element | null`; `export function InspectCard(props: { result: InspectResult; anchor: Element; pinned: boolean; onPick(row: InspectRow): void }): JSX.Element`.

Comportamento (spec §5):
- Ativo quando `inspect === true`. Listeners em **captura** no `document` para `pointermove` (throttle ~50 ms), `click`, `pointerdown`, `keydown`. Um alvo "conta" se está dentro de `root` ou de um portal MUI (`.MuiPopover-root, .MuiModal-root, .MuiPopper-root, .MuiSnackbar-root`) **e** não está dentro do próprio cartão. Para alvos que contam: `click`/`pointerdown` → `preventDefault()` + `stopPropagation()`; clique alterna "preso". `keydown` `Escape` → `store.update(s => ({...s, inspect:false}))` + `stopPropagation()` (o Dialog não fecha).
- Destaque: caixa absoluta (`position: fixed`, `pointer-events: none`) desenhada sobre o `getBoundingClientRect()` do alvo, borda `var(--vx-border-width-focus) dashed var(--vx-border-focus)`.
- Cartão: MUI `Popper` ancorado no alvo; cabeçalho `spot ?? component` + `component`; linhas agrupadas por estado com títulos "Repouso", "Hover", "Pressionado", "Foco", "Desabilitado"; cada linha = rótulo · token (link) · amostra `style={{ background: value }}` ou valor · chip da camada; `inherited` → sufixo "(herdado)"; `layer === "base"` → linha com ícone de aviso "token da Base aplicado direto"; lista vazia → "Nenhum token aplicado".
- Clicar no token: `store.update(s => ({ ...s, inspect:false, tab: row.layer === "specific" ? "specific" : "semantic", focusToken: \`${row.layer}:${row.token}\` }))`.
- Soltar o cartão preso quando `set`, `mode` ou a tela da vitrine mudam (passar a tela via prop ou store; escolha do implementador).
- Cache do `introspect` por elemento, invalidado quando `set` ou `mode` mudam.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
render(<App />);
await user.click(screen.getByRole("button", { name: "Inspecionar" }));
// hover num botão contained primary da vitrine (tela Painel ou Cadastro)
fireEvent.pointerMove(btnPrimary); await waitFor(() => screen.getByRole("tooltip"));
const card = screen.getByRole("tooltip");
expect(within(card).getByText("background/action/primary")).toBeTruthy();
expect(within(card).getByText("Hover")).toBeTruthy();
expect(within(card).getByText("background/action/primary-hover")).toBeTruthy();
// Alert filled danger (tela Configurações)
// → background/danger/strong e text/on-danger-strong
// bloqueio: na tela Overlays, com Inspecionar ligado, clicar "Abrir diálogo" não abre
// overlay aberto em Usar + Inspecionar: Esc → inspect=false e o dialog continua aberto
// clicar no token → store.tab === "semantic" e focusToken === "semantic:background/action/primary"
// elemento de layout sem token → "Nenhum token aplicado"
// editor continua clicável com Inspecionar ligado (clicar na aba "Base" do cabeçalho muda store.tab)
```

- [ ] **Step 2: Rodar.** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Verificar no browser** (`pnpm --filter web-mui dev`): passar o mouse em Button, TextField, Chip, Alert, barra do BarChart e célula do Heatmap; anotar no report o que o cartão mostra para cada um e qualquer elemento que mostre "Nenhum token" indevidamente.
- [ ] **Step 5: Rodar tudo.** `pnpm test && pnpm typecheck && pnpm --filter web-mui build` (raiz) → PASS.
- [ ] **Step 6: Commit** `feat(web-mui): inspect mode shows property → token on hover`
