# Vortex Builder: gráficos, modo Inspecionar e restaurar padrão

Data: 2026-11-25 · Branch: `feature/test-with-mui` · Complementa `2026-11-25-vortex-mui-token-builder-design.md` (fase 1)

## 1. Intenção

O builder já aplica ao vivo as trocas de referência da Semantic. Faltam três coisas:

1. **Os tokens `data/*` não aparecem em nenhum componente.** Quem edita as paletas `data-1..6` ou as referências de gráfico não vê efeito.
2. **Não dá para ver quais tokens cada peça usa.** O designer precisa ligar o que vê no componente ao nome do token, que é a mesma língua do Figma (seção 01 da documentação).
3. **Restaurar o padrão está escondido** dentro do menu Exportar.

## 2. Escopo

| Item | O que é |
|---|---|
| Gráficos | Nova tela "Gráficos" na vitrine, com componentes de `@mui/x-charts` e componentes em SVG próprio, todos consumindo `data/*` via `var(--vx-…)` |
| Inspecionar | Modo no cabeçalho `[ Usar \| Inspecionar ]`. Em Inspecionar, o hover sobre qualquer elemento da vitrine mostra um cartão com **propriedade → token** (formato B, aprovado) |
| Restaurar padrão | Botão visível no cabeçalho, com a confirmação existente. Sai do menu Exportar |

**Não-objetivos:**
- Editar um token pelo cartão. O cartão só leva até a linha do token.
- Inspecionar a interface do próprio editor (faixa do editor e cabeçalho).
- Prévia de Specific no card. Ficou fora desta rodada.

**Anti-objetivos:**
- O inspetor mostrar um token diferente do que está realmente aplicado.
- Cores de gráfico passadas como valores resolvidos. Isso quebra o "só reescreve vars" e esconde o token do inspetor.

## 3. Abordagens consideradas (inspetor)

1. Mapa propriedade→token escrito à mão por peça. É simples, mas vira uma segunda fonte da verdade, que já divergiu na Task 11.
2. **Introspecção do CSS aplicado em runtime (escolhida pelo usuário).** Descrita na §5. Fica sempre fiel ao que está aplicado e cobre gráficos e Specifics sem manutenção.
3. Gerar overrides e mapa da mesma descrição. Exigiria reescrever todos os overrides, caro demais para a POC.

Gráficos: o usuário escolheu **alguns com `@mui/x-charts` e alguns em SVG próprio**.

## 4. Gráficos

Nova aba "Gráficos" na vitrine (`src/showcase/Charts.tsx`), depois de "Overlays".

**Componentes `@mui/x-charts`** (licença MIT; versão compatível com `@mui/material` 7):
- **BarChart** agrupado com as 6 séries categóricas (`data/categorical-1..6`, na ordem, conforme a seção 05: "a primeira série é sempre `data/categorical-1`").
- **LineChart** com 3 séries (`categorical-1..3`).

Regras para os componentes `@mui/x-charts`:
- **Cores via CSS, nunca como valor resolvido:** `sx` ou `styleOverrides` mirando as classes de série do x-charts (ou o seletor equivalente da versão instalada), com `fill`/`stroke: var(--vx-data-categorical-n)`. Se a única forma suportada for a prop `colors`, ela recebe as strings `var(--vx-data-categorical-n)`. Quem constrói confere no browser que o `var()` é aplicado. Se não for, usa `sx`.
- **Eixos, grade e rótulos** (seção 05): eixo e grade em `border/subtle`, rótulos e ticks em `text/secondary` com `body/small`, tooltip em `background/surface-raised` + `shadow/raised` + `text/primary`. Esses estilos vão para os overrides do tema (`src/theme/overrides/charts.ts`), pelo mesmo caminho da fase 1, e não usam `--vx-base-*`.

**Componentes em SVG próprio** (`src/showcase/charts/`):
- **Mapa de calor** sequencial: grade de células coloridas por faixa `data/sequential-1..5`, com legenda que mostra a faixa de valor de cada tom. A seção 05 exige legenda, porque os tons claros não passam 3:1.
- **Legenda categórica**: 6 amostras com o nome da série, reutilizável.
- `fill` e `stroke` via `style={{ fill: "var(--vx-data-…)" }}`, sem atributo com valor resolvido.

**Comportamento:**
- **Grupo `data` desligado na Base:** a aba mostra um estado vazio, "Gráficos desligados na Base (grupo data)", com um botão que leva à aba Base.
- **SPOTS:** cada gráfico entra num `<Spot>` com os tokens que consome. O contorno âmbar de aviso continua funcionando, por exemplo para `contrast-data`.

## 5. Modo Inspecionar

**Estado:** `inspect: boolean` no store, que não é persistido. Fica num ToggleButtonGroup no cabeçalho, `Usar | Inspecionar`.

**Em Inspecionar, só dentro da área da vitrine, incluindo portais de overlays abertos:**
- **Hover:** o elemento sob o cursor ganha um contorno de destaque. Ele é desenhado por uma camada sobreposta e não altera o layout do componente.
- **Cartão (MUI Popper)** ao lado do elemento:
  - **Cabeçalho:** nome da peça (o `data-spot` mais próximo, com rótulo legível) e o nome do componente (a primeira classe `Mui*-root` do elemento ou de um ancestral próximo).
  - **Linhas por estado:** "Repouso", ":hover", "Pressionado (:active)", "Foco (:focus-visible / .Mui-focusVisible)", "Desabilitado (.Mui-disabled)". Só aparecem os estados que têm declarações.
  - **Cada linha:** rótulo da propriedade em pt-BR, nome do token, amostra (cor) ou valor (medida) resolvido no **modo atual da vitrine**, e a camada (semantic/specific).
- **Clique:** prende o cartão, e um segundo clique fora solta. Clicar numa linha de token leva à aba e à linha dele, pelo mesmo `focusToken` da fase 1.
- **Interação bloqueada:** os componentes da vitrine não recebem clique nem teclado enquanto Inspecionar está ativo. Use uma camada de captura ou `pointer-events` no container. `Esc` volta para Usar.

**Rótulos de propriedade:**

| CSS | Rótulo |
|---|---|
| `background`, `background-color` | fundo |
| `color` | texto |
| `fill` | preenchimento |
| `stroke` | traço |
| `border*-color`, `border` | borda |
| `border*-width` | espessura da borda |
| `border*-radius` | raio |
| `padding*` | padding |
| `gap`, `margin*` | espaçamento |
| `box-shadow` | sombra |
| `opacity` | opacidade |
| `outline*` | foco |
| `font-size` | tamanho da fonte |
| `line-height` | altura de linha |
| `font-weight` | peso |
| `font-family` | família |
| `letter-spacing` | espaçamento entre letras |

**Algoritmo** (`src/inspect/introspect.ts`, função pura sobre `Element` + `Document`, testável em jsdom):

1. **Coletar regras.** Percorrer `document.styleSheets`: regras de estilo de primeiro nível e regras dentro de `@media` que casam no momento. Folhas cross-origin ou inacessíveis são ignoradas.
2. **Casar regras com o elemento.** Para cada seletor da regra (separar por vírgula), testar `element.matches(seletorSemEstado)`. O seletor sem estado é o original com `:hover`, `:active`, `:focus-visible`, `:focus`, `.Mui-focusVisible`, `.Mui-disabled` e `.Mui-active` removidos. O estado é deduzido do que foi removido. Regras com pseudo-elemento (`::before`/`::after`) entram com o sufixo "(antes)/(depois)" no rótulo.
3. **Extrair declarações.** Das regras casadas, guardar as declarações cujo valor contém `var(--`.
4. **Resolver indireções.** Se o valor é `var(--x)` e `--x` não começa com `--vx-`, procurar a declaração de `--x` nas regras que casam com o elemento e depois com seus ancestrais, até a raiz. Isso cobre indireções como as `--variant-*` do MUI.
5. **Chegar ao token.** `--vx-<nome>` vira o token. Primeiro procura `specific:<nome>`, depois `semantic:<nome>`. Um `--vx-base-*` encontrado é mostrado como **aviso**, porque viola uma regra global.
6. **Precedência.** Para a mesma propriedade e o mesmo estado, vence o seletor de maior especificidade e, em empate, o que aparece por último. O helper de especificidade dos testes (`test/helpers.ts`) vai para `src/inspect/specificity.ts`.
7. **Propriedades herdadas.** Se `color` ou `font-*` não está declarada no elemento, subir pelos ancestrais (limitado ao container da vitrine) e marcar a linha como "(herdado)".

8. **Estilo inline e atributos SVG.** Ler também `element.style` e os atributos de apresentação SVG `fill` e `stroke` quando eles contêm `var(--`. O inline vence qualquer seletor. Os atributos de apresentação perdem para qualquer regra de folha. Isso cobre o mapa de calor (`style={{ fill }}`) e as séries do x-charts, se a cor delas chegar por prop ou atributo.

**Assinatura:** `introspect(el: Element, opts: { doc: Document; set: TokenSet; mode: Mode; root: Element }): InspectResult`.
- O `set` serve para resolver valores e amostras no modo atual e para saber a camada.
- Semantic e specific nunca têm o mesmo nome, porque `upsertSpecific` recusa um nome de semantic. Logo, `--vx-<nome>` aponta para uma camada só: busca em `set.specific`, depois em `set.semantic`.
- `root` é o container da vitrine.
- A subida pelos ancestrais (passos 4 e 7) vai até `document.body` quando o elemento está num portal MUI, que fica fora de `root`.

**Decisões do builder check (escolhas minhas):**
- Os tokens `data/categorical-1..6` e `data/sequential-1..5` existem no seed e viram `--vx-data-categorical-n` e `--vx-data-sequential-n`. Rótulos da legenda e nomes de série usam `text/secondary` + `body/small` (seção 05).
- **Overlays:** abre-se o overlay em Usar e depois se liga Inspecionar. O bloqueio é um listener em fase de captura no `document` para `click`, `pointerdown` e `keydown`, aplicado a alvos dentro de `root` ou dentro de um portal MUI (`.MuiPopover-root`, `.MuiModal-root`, `.MuiPopper-root`, `.MuiSnackbar-root`). Ele chama `preventDefault` + `stopPropagation`, exceto em cliques dentro do próprio cartão. `Esc` também é capturado nesse listener: volta para Usar sem fechar o modal.
- **Sem `data-spot`:** o cabeçalho do cartão mostra só o nome do componente MUI, ou o nome da tag se não houver classe `Mui*-root`.
- **Restaurar padrão** não desliga o modo Inspecionar.
- **Cartão preso:** é solto quando o set, o modo ou a tela da vitrine mudam.
- **Botão "ir para Base" do estado vazio dos gráficos:** muda só a aba do editor (`store.tab = "base"`). A tela da vitrine continua a mesma.

Desempenho: o cálculo roda no hover com throttle de cerca de 50 ms e cache por elemento, que é invalidado quando o tema ou o set mudam.

## 6. Restaurar padrão

- Botão "Restaurar padrão" (ícone + texto) no cabeçalho, ao lado de Exportar.
- Abre a mesma confirmação de hoje: "Restaurar o padrão do laboratório? As edições atuais serão perdidas." Depois chama `store.reset()`.
- O item sai do menu Exportar. O teste de reset da fase 1 passa a usar o botão.

## 7. Testes

- **`introspect` (jsdom, com folhas CSS montadas no teste):**
  - regra simples, por exemplo `.a { background: var(--vx-background-surface) }` → fundo / `background/surface`;
  - cadeia `--variant-containedBg` → `var(--vx-background-action-primary)`;
  - estados `:hover`, `.Mui-disabled` e `.Mui-focusVisible`;
  - precedência por especificidade e por ordem;
  - herança de `color`;
  - `--vx-base-*` vira aviso;
  - um token specific é resolvido como specific.
- **Integração:**
  - Button contained primary com o tema real → "fundo: background/action/primary" (repouso) e ":hover: background/action/primary-hover";
  - Alert filled danger → `background/danger/strong` e `text/on-danger-strong`.
- **Gráficos:**
  - o CSS emitido contém `var(--vx-data-categorical-1)` até `-6`;
  - o mapa de calor usa `data/sequential-1..5` e tem legenda;
  - com `data` desligado aparece o estado vazio;
  - nenhum `--vx-base-*` aparece.
- **Modo:**
  - alternar Inspecionar bloqueia o clique num botão da vitrine (o Dialog não abre);
  - `Esc` volta para Usar;
  - clicar numa linha do cartão define `tab` e `focusToken`.
- **Reset:** o botão no cabeçalho, depois de confirmar, volta o set para o seed. O menu Exportar não tem mais o item.

## 8. O que fica com quem constrói

- Versão exata de `@mui/x-charts` e o seletor de série da versão instalada.
- Dados fictícios dos gráficos.
- Visual do cartão, da camada de destaque e do throttle (respeitando §5).
- Organização interna de `src/inspect/`.

## Escolhas minhas (para conferir)

- O modo Inspecionar vale só na vitrine, não no editor.
- Em Inspecionar a interação fica bloqueada. O clique prende o cartão e `Esc` sai.
- Os valores do cartão aparecem no modo atual da vitrine.
- Os gráficos com x-charts são barras e linha. Em SVG são mapa de calor e legenda.
