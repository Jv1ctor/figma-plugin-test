# Vortex × MUI: builder de tokens no web (fase 1)

Data: 2026-11-25 · Branch: `feature/test-with-mui`

## 1. Intenção e porquê

A POC resolve a **integração contínua dos design tokens entre o Figma e o desenvolvimento**. O laboratório já tem um sistema de tokens próprio, o **Vortex**, documentado no arquivo do Figma "Vortex Design System (TESTE - MUI)" (`fileKey hXapRD3m5N74rS4yYwEKRJ`, página *Design Tokens*, seções 01–10 como spec blocks). O mesmo arquivo traz a biblioteca do MUI ligada a esses tokens (página *MUI — Biblioteca integrada*).

Quem usa o web monta o tema do projeto nas três camadas do Vortex (**base → semantic → specific**) e vê o resultado ao vivo em componentes MUI. Em fases seguintes, o tema vai para o Figma pelo plugin e relay já existentes, e o dev exporta os tokens a partir da plataforma. O MUI é o primeiro consumidor, não o único: o token precisa existir mesmo sem design system (CSS vars puras, Tailwind).

**Fonte de verdade (decidido): o arquivo do Figma (opção A).** O web edita e envia, e o Figma é o que vale. Nesta fase 1 ainda não existe sincronização. O ponto de partida é um snapshot dos valores padrão do laboratório, extraído do Figma e versionado no repo.

## 2. Fases

| Fase | Escopo | Este documento |
|---|---|---|
| **1** | Pacote `packages/tokens` (modelo, regras, geração de escala, exports) + app `apps/web-mui` (builder layout B + vitrine MUI) + seed extraído do Figma | **Sim** |
| 2 | Sincronização com o Figma: protocolo `upsert-tokens` / `tokens-snapshot`, plugin escrevendo as 3 coleções com aliases, escopos e descrições, import no web, relay guardando o último tema confirmado e servindo `GET /tokens.{json,css,tailwind.css,mui.ts}` | Não (só restrições de forma, §11) |
| 3 | Aba de configuração no plugin (URL do relay em `figma.clientStorage`, `allowedDomains: ["*"]` com `reasoning`), salas e código de pareamento | Não |
| 4 | Deploy: web na Vercel; relay em Cloudflare Workers + Durable Objects (ou Render); plugin via Community ou manifest | Não |

## 3. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- Editar base, semantic e specific com as regras do Vortex, vendo os componentes MUI reagirem na hora, em claro e escuro.
- Avisar (só avisar) quando uma regra verificável da documentação é violada.
- Exportar o tema em JSON canônico (DTCG), CSS vars, Tailwind v4 e tema MUI.
- Manter o modelo de tokens independente do MUI.

**Não-objetivos (fase 1)**
- Sincronizar com o Figma, persistir no servidor, ter múltiplos usuários.
- Criar tokens novos na semantic (isso nasce no Figma, pela lead).
- Cobrir as "Lacunas" do Figma com tokens novos.
- Catálogo de todos os 51 componentes (a vitrine é por telas de exemplo).

**Anti-objetivos** (fazem a POC falhar mesmo funcionando)
- O preview MUI divergir do que o designer vê no Figma para o mesmo tema.
- Algum componente consumir um token da base diretamente.
- Um export sem MUI depender do MUI, ou nomes de token diferentes entre Figma e código.
- O web corrigir referências sozinho, sem o usuário ver.

## 4. Abordagens consideradas

1. **Variáveis CSS do Vortex como camada única de runtime** (escolhida). O web escreve `--vx-*`, e o tema MUI é criado uma vez com `styleOverrides` que leem `var(--vx-…)`. A `palette` do MUI recebe valores resolvidos só onde o MUI precisa de cor real (Lacunas, `alpha()`, canais). Edição ao vivo = trocar variáveis, sem recriar o tema. O export de CSS vars é o mesmo artefato do runtime.
2. **Recriar o tema MUI a cada edição com valores resolvidos.** É mais simples, mas re-renderiza tudo a cada arraste, e os exports sem MUI viram geradores separados do que o web usa.
3. **Tokens dentro da `palette` do MUI (module augmentation + `cssVariables`).** É MUI nativo, mas prende o modelo ao MUI e contradiz "token sem design system".

Onde o código fica: um **app novo `apps/web-mui`**, ao lado do builder shadcn (`apps/web`), que continua funcionando. O usuário escolheu o app novo. A abordagem 1 é escolha minha, já informada ao usuário.

## 5. Modelo de tokens (`packages/tokens`)

Pacote TypeScript puro, sem React e sem MUI. Usado pelo web agora e pelo plugin e relay na fase 2. Segue as convenções do repo (`tsx`, `vitest`, ESM, `culori` para cor).

### 5.1 Camadas

- **base**: um modo. Cada token guarda um valor literal: cor (hex sRGB), número (px, ou unitless em `opacity`, `font-weight` e `letter-spacing`) ou string (`font-family`). 270 tokens no seed.
- **semantic**: modos `light` e `dark`. Cada token guarda, por modo, uma **referência para um token da base** (um salto só, nunca semantic → semantic). 184 tokens no seed.
- **specific**: mesmas regras da semantic (referência para a base, dois modos). Vazio no seed.
- **Valor composto de cor com opacidade:** `shadow/raised/color` e `shadow/overlay/color` referenciam uma cor da base **e** uma opacidade da base (`neutral/1000` + `opacity/10` ou `opacity/15`). O modelo precisa representar `{ color: ref, opacity: ref }` como valor de um token semantic. Esse é o formato que o Figma usa, e a fase 2 precisa escrevê-lo de volta.

Cada token carrega metadados vindos do Figma: `type` (color, dimension, number, fontFamily, fontWeight), `scopes` (nomes da Plugin API), `description` (os seis rótulos: Uso, Não usar, Par, Flexibilidade, Situação, Valor) e o **nível de flexibilidade** (Travado, Ajustável, Livre), derivado do grupo conforme a seção 05.

### 5.2 Grupos e flexibilidade (seção 05 do Figma)

| Camada | Grupo | Valores | Nível |
|---|---|---|---|
| base | `brand-1` (obrig.), `brand-2..4` (opcionais) | passos 50–950 | Livre |
| base | `neutral` | 0, 50–950, 1000 | Ajustável (`/0` = #FFFFFF, `/1000` = #000000) |
| base | `danger`, `warning`, `success`, `information` | 50–950 (Tailwind v4 red, amber, green, blue) | Travado |
| base | `data-1..6` (opcionais) | 50–950 | Ajustável |
| base | `space`, `radius`, `border-width`, `opacity`, `font-size`, `line-height`, `font-weight`, `letter-spacing` | escalas fixas | Travado |
| base | `font-family/primary`, `/secondary` | string | Livre |
| semantic | todos | referência por modo | Ajustável (só a referência; o nome é Travado) |
| specific | criados pelo projeto | referência por modo | Livre |

Grupos opcionais podem ser desligados: `brand-2..4` leva junto `background/accent-n/*`, `text/on-accent-n-strong` e `icon/on-accent-n-strong`; `data-1..6` leva junto `data/*`. Religar restaura os valores do seed. No seed, nenhum outro token semantic aponta para `brand-2..4` ou `data-*`. Se um specific apontar, desligar o grupo é bloqueado com um aviso que lista os specifics. **Componentes MUI ligados a um token desligado** (Chip e Badge Secondary e `palette.secondary` usam `accent-2`) voltam ao padrão do MUI e geram um aviso "componente usa token de grupo desligado". Nos exports, os tokens desligados não aparecem. *(Escolha minha.)*

### 5.3 Seed

Um JSON DTCG versionado em `packages/tokens/seed/vortex.tokens.json`, extraído do Figma (coleções `base`, `semantic`, `specific`: nomes, valores e aliases por modo, escopos, descrições, mais os 12 estilos de texto e os 2 de efeito com as variáveis ligadas). A extração preserva aliases, não valores resolvidos.

**Quem extrai:** a sessão principal, que tem acesso autenticado ao Figma MCP, faz a extração como primeira tarefa do plano. Na mesma tarefa, salva as dez seções da documentação (spec blocks da página *Design Tokens*) em markdown em `docs/vortex/01-…10-*.md`, mais a página *MUI — Biblioteca integrada* (Correspondências e Lacunas) em `docs/vortex/mui-integracao.md`. As tarefas seguintes não precisam de acesso ao Figma.

Dados já confirmados na leitura do arquivo (2026-11-25): coleções `base` (1 modo, `value`, 270 variáveis), `semantic` (`light`/`dark`, 184) e `specific` (`light`/`dark`, 0). Todas as variáveis da semantic são aliases de um salto para a base, exceto `shadow/*/color`, que é cor composta. Nenhuma variável tem code syntax. Escopos por grupo:

| Grupo semantic | Tipo | Escopos |
|---|---|---|
| `text` | COLOR | TEXT_FILL |
| `icon` | COLOR | SHAPE_FILL, STROKE_COLOR |
| `background` | COLOR | FRAME_FILL, SHAPE_FILL |
| `border` | COLOR | STROKE_COLOR |
| `data` | COLOR | FRAME_FILL, SHAPE_FILL, STROKE_COLOR |
| `space` | FLOAT | GAP |
| `radius` | FLOAT | CORNER_RADIUS |
| `border-width` | FLOAT | STROKE_FLOAT |
| `opacity` | FLOAT | OPACITY |
| `typography` | FLOAT/STRING | um escopo por campo (LETTER_SPACING confirmado; FONT_SIZE, LINE_HEIGHT, FONT_WEIGHT, FONT_FAMILY esperados: a extração confirma) |
| `shadow` | FLOAT/COLOR | EFFECT_COLOR confirmado na cor; EFFECT_FLOAT esperado nas medidas (a extração confirma) |

Valores-chave do seed para conferência: `brand-1/600 = #9246D7`; `neutral` vai de #FFFFFF a #000000; `font-family/primary = secondary = "Satoshi Variable"`; textos 12 estilos; sombras `raised` (0 4 8 0, `neutral/1000` @ 10%) e `overlay` (0 8 24 0, @ 15%).

### 5.3.1 Estilos (tipografia e sombra)

Tipografia e sombra são **variáveis da semantic** (as unidades editáveis) agrupadas em **estilos do Figma** que só ligam essas variáveis:

- 12 estilos de texto `{papel}/{tamanho}` (`display`, `heading`, `body`, `label` × `small`, `medium`, `large`). Cada um liga `typography/{papel}/{tamanho}/font-size`, `/line-height`, `/font-weight`, `/letter-spacing` e `typography/{papel}/font-family`.
- 2 estilos de efeito, `shadow/raised` e `shadow/overlay` (drop shadow). Cada um liga `shadow/{papel}/offset-x`, `offset-y`, `blur`, `spread` e `color`.

No modelo, os estilos são **composições derivadas por convenção de nome** e não têm valor próprio: o web edita as variáveis, e o estilo acompanha. No DTCG, eles saem como tokens compostos (`$type: "typography"` e `"shadow"`) cujos campos são aliases das variáveis semantic. A fase 2 recria e atualiza os estilos no Figma ligando as mesmas variáveis. As sub-abas "typography" e "shadow" da aba Semantic editam referências de variáveis, agrupadas visualmente por estilo.

### 5.4 Formato canônico

**DTCG JSON** (Design Tokens Community Group) com aliases `{base.brand-1.600}`. Modos, escopos, descrições e flexibilidade vão em `$extensions` com um namespace próprio (ex.: `"$extensions": { "vortex": { "modes": { "light": "{…}", "dark": "{…}" }, "scopes": [...], "flex": "adjustable" } }`). O layout exato das extensões fica com quem constrói, desde que dê ida e volta sem perda com o Figma na fase 2 (incluindo a cor composta).

### 5.5 Geração de escala a partir de um hex

Para `brand-n` (e, opcionalmente, `neutral` e `data-n`): o usuário informa um hex e o pacote gera os passos 50–950 em OKLCH, no estilo uicolors.app, que a documentação cita. O hex informado ancora o passo mais próximo em luminosidade, e cada passo continua editável individualmente depois. O algoritmo fica com quem constrói. Requisitos: progressão monotônica de claro para escuro, saída em sRGB (com gamut mapping) e determinismo (mesmo hex → mesma escala).

## 6. Regras (só avisos)

Cada regra é uma função pura sobre o tema resolvido que devolve avisos `{ token, mode?, rule, message, actual, expected }`. Nada é bloqueado e nada é corrigido sozinho. O web mostra os avisos na linha do token (aba Semantic e Base) e num contador no topo, que abre a lista.

| Regra | Fonte | Detalhe |
|---|---|---|
| Contraste de texto | seção 05 | Todo `text/*` ≥ 4,5:1 contra cada fundo listado no seu **Par**, nos dois modos (WCAG 2.x, luminância relativa) |
| Contraste de ícone | seção 05 | `icon/*` ≥ 3:1 contra o Par |
| Contraste de controle | seção 05 | `border/strong`, `border/selected` ≥ 3:1 contra `background/canvas` e `background/surface` |
| Anel de foco | seção 05 | `border/focus` ≥ 3:1 contra `background/canvas`, `/surface` e `/surface-raised` |
| Gráfico | seção 05 | `data/categorical-*` ≥ 3:1 contra `background/canvas` e `/surface`, nos dois modos |
| Feedback na própria paleta | seção 05 | `text|icon|background|border/{danger,warning,success,information}*` só referencia a paleta de mesmo nome |
| Grupo certo | seção 03 | Referência dentro da escala do grupo (cor → paletas de cor; `space/*` → `space`; `radius/*` → `radius`; etc.) |
| Ordem de tamanho | seção 05 | Em `space` e `radius`, nenhum nome maior que o seguinte (`none ≤ xx-small ≤ … ≤ xx-large`; `full` fica fora) |
| Altura de linha | seção 05 | `line-height` = 1,3 × tamanho (display, heading) ou 1,5 × (body, label), arredondado ao múltiplo de 4 mais próximo, empate para cima |
| Foco ≥ 2 | seção 05 | `border-width/focus` ≥ 2 |
| Neutro | seção 05 | `neutral/0` = branco, `/1000` = preto, luminosidade monotônica de 0 a 1000 |
| Paletas de dados | seção 05 | `data-1..6`: distintas entre si (ΔE OKLab acima de um limiar escolhido por quem constrói) e sem usar matiz de paleta de status |
| Peso de fonte | §8 | Peso referenciado por `typography/*/font-weight` que a fonte escolhida não tem |
| Nome de specific | seção 04 | Formato (minúsculas, sem acento nem espaço, `/` entre níveis, hífen dentro do nível, estado só no fim com hífen, no máximo 3 partes, exceto `typography` e `shadow`). Primeiro nível ∈ vocabulário de propriedades. Avisos heurísticos: palavra fora do vocabulário (Apêndice A), que é permitido, mas é um alerta "palavra nova, descreva o uso"; palavra de cor (lista de nomes de cor em inglês e português e nomes de paleta); palavra de componente (lista de nomes de componentes MUI). Nome de projeto não é detectável e não gera aviso |

As colunas **Par** vêm das descrições no seed (linha `Par:`). Quando o Par lista vários fundos, o aviso aponta o par que falhou.

## 7. Runtime: CSS vars

- Nome: `--vx-` + nome do token, com `/` → `-`. Base ganha o prefixo `base-` para não colidir com a semantic (ex.: `radius/full` existe nas duas): `--vx-base-brand-1-600`, `--vx-text-primary`, `--vx-background-action-primary-hover`.
- A semantic referencia a base por `var()`: `--vx-text-primary: var(--vx-base-neutral-900)`. Claro em `:root, [data-mode="light"]`, escuro em `[data-mode="dark"]`.
- Unidades: medidas em **rem** (px ÷ 16), exceto `border-width`, que fica em **px** (regra da seção 03). `opacity` vira 0–1. `font-weight` é unitless.
- Cor composta: `--vx-shadow-raised-color` = cor com alfa (ex.: `rgb(0 0 0 / 0.1)`, derivado das duas referências).
- Estilos compostos também saem como vars de conveniência: `--vx-shadow-raised: <x> <y> <blur> <spread> <color>`.
- O web reescreve só as variáveis afetadas por uma edição. O mesmo gerador produz o export de CSS vars.

## 8. Tema MUI (`apps/web-mui`, reutilizável no export)

MUI v7 (versão estável mais recente no momento de construir), `createTheme` com `colorSchemes: { light, dark }` e o seletor de modo ligado ao mesmo `data-mode` das vars Vortex. Os `styleOverrides` e `variants` seguem a tabela **"Correspondências aplicadas (MUI → Vortex)"** do Figma (página *MUI — Biblioteca integrada*, seção *01. Visão geral*), reproduzida aqui:

| MUI | Vortex |
|---|---|
| Button Contained Primary · hover · pressed | `background/action/primary` · `-hover` · `-pressed`; texto `text/on-action-primary` |
| Button Contained Secondary | `background/action/secondary` (+ estados); `text/on-action-secondary` |
| Button Contained Error | `background/action/danger` (+ estados); `text/on-action-danger` |
| Button Outlined/Text Primary, IconButton Default/Primary | ação terciária: `text/primary`, `icon/primary`, `border/strong`, `background/action/tertiary-hover` |
| Disabled (todas) | mesma aparência da variante habilitada + `opacity/disabled` no elemento |
| Campo: contorno · foco · erro | `border/strong` · `border/focus` + `border-width/focus` · `border/danger`, `text/danger` |
| Checkbox, Radio, Switch, Slider marcados | `border/selected`; desmarcado `border/strong`; botão do switch `background/surface-raised` |
| Aba, página e passo selecionados | `border/selected`, `background/selected`, `text/primary` |
| Chip e Badge | Default `background/neutral/subtle`; Primary `accent-1/strong`; Secondary `accent-2/strong`; status nas paletas de feedback com o par `on-` |
| Avatar | `background/neutral/strong` + `text/on-neutral-strong`; `radius/full` |
| Alert Standard · Filled · Outlined | `background/[paleta]/subtle` + `text/primary` + `icon/[paleta]` · `background/[paleta]/strong` + `text/on-[paleta]-strong` · `border/[paleta]` |
| Snackbar e Tooltip | `background/inverse` + `text/on-inverse` |
| Paper, Card, Menu, Popover, Dialog, Drawer | `background/surface` ou `surface-raised`; `shadow/raised` (elevação 1–11) e `shadow/overlay` (12+; Dialog e Drawer) |
| Divider, borda de tabela, conector do Stepper | `border/subtle` |
| Backdrop | `background/backdrop` + `opacity/backdrop` |
| Link | `text/link` |
| Tipografia | `button` e menu → `label/*`; `body1` → `body/medium`; `body2` e `caption` → `body/small`; `h1–h3` → `display/*`; `h4–h6` → `heading/*`; input value → `body/medium`; helper → `body/small`; **sem caixa alta** |
| Raio | botão, campo, grupo de botões → `radius/x-small`; menu, popover, snackbar → `radius/small`; card, paper, accordion → `radius/medium`; dialog → `radius/large`; tabela → `radius/none`; circular → `radius/full` |
| Espaço e espessura | padding e gap nos passos 4/8/12/16/24/32/48 → `space/*`; borda 1 → `border-width/default`; 2 → `border-width/strong` (foco do campo: `border-width/focus`) |

**Lacunas** (lista na mesma página do Figma) ficam com o comportamento padrão do MUI, como no Figma: Outlined/Text coloridos, Contained warning/info/success, hover translúcido, elevação de controles, cor do Progress, campo Filled, breakpoints e título do Alert. Para isso a `palette` do MUI recebe valores **resolvidos** do tema atual. Minha proposta de mapeamento, que pode ser ajustada:
- `primary.main` ← `background/action/primary`
- `secondary.main` ← `background/accent-2/strong`
- `error|warning|info|success.main` ← `background/{paleta}/strong`
- `text.primary|secondary` ← `text/primary|secondary`
- `background.default|paper` ← `background/canvas|surface`
- `divider` ← `border/subtle`

Quando uma referência ligada à palette muda, só essa parte do tema é recalculada.

**Exceção às Lacunas: foco.** No web, o foco é o anel com vão do Vortex em todos os componentes focáveis (`:focus-visible { outline: var(--vx-border-width-focus) solid var(--vx-border-focus); outline-offset: 2px }`), e o halo e o ripple de foco do MUI ficam desligados. O vão de 2px é escolha minha (a documentação diz que "a medida do vão entra com o design system").

**Fontes.** Satoshi (Fontshare, ITF Free Font License) servida pelo próprio app em woff2 variável. Seletor de fonte com a lista do Google Fonts, carregada sob demanda. Os pesos disponíveis de cada fonte alimentam a regra "peso de fonte".

## 9. App `apps/web-mui`

Vite + React 19 + MUI v7 + Emotion, no workspace pnpm, porta própria (5174). Consome `@token-bridge/tokens`.

### 9.1 Layout B (escolhido)

```
┌ Vortex Builder  [Base][Semantic][Specific]   ⚠ 2   ☀ claro ▾   Exportar ▾ ┐
├──────────────────────────────── faixa do editor ─────────────────────────────┤
│ (aba ativa em formato compacto, rolável)                                      │
├──────────────────────────────── vitrine MUI ─────────────────────────────────┤
│ telas de exemplo, temadas pelo tema atual, no modo selecionado               │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Base:** cartões por paleta (escala 50–950 com o hex de origem, editor de hex para gerar e edição de cada passo), ligar e desligar paletas opcionais, `neutral` e `data-n`, `font-family/primary` e `/secondary`. Escalas Travadas só para leitura (recolhidas).
- **Semantic:** sub-abas por grupo (`text`, `icon`, `background`, `border`, `space`, `radius`, `border-width`, `opacity`, `typography`, `shadow`, `data`). Tabela com colunas *token · claro · escuro · par/contraste*. Cada célula de modo é um seletor que lista só os passos da base válidos para o grupo, com amostra. A coluna de contraste mostra a razão por par nos dois modos, **independente do modo da vitrine**. Clicar no nome abre a descrição (Uso, Não usar, Par, Flexibilidade, Situação, Valor), com a linha Valor recalculada.
- **Specific:** lista e formulário de criação: nome validado pela seção 04, grupo e escopo, referência claro/escuro para a base, e os seis rótulos da descrição com Situação = "Proposto".
- **Contador de avisos:** abre a lista completa. Clicar num aviso leva à aba e à linha do token.
- **Modo da vitrine:** claro ou escuro.
- **Exportar ▾:** baixa DTCG JSON, CSS vars, Tailwind v4 ou MUI theme. Também importa e exporta o JSON do tema para trabalhar entre sessões.
- **Persistência local:** rascunho no `localStorage` (tolerante a falha). Botão "restaurar padrão do laboratório".

### 9.2 Vitrine: telas de exemplo

Quatro telas compostas, escolhidas para cobrir a tabela de Correspondências:

1. **Painel:** Card, CardHeader, Chip (Default, Primary, Secondary, status), Avatar, AvatarGroup, Badge, Progress, Tabs, Table, Typography (display a body).
2. **Cadastro:** TextField (vazio, preenchido, foco, erro, disabled), Select, Autocomplete, Checkbox, Radio, FormControlLabel, FormHelperText, Button (Contained Primary, Secondary e Error, Outlined, Text, disabled), Link.
3. **Configurações:** Switch, Slider, List e ListItem, Accordion, Divider, Alert (standard, filled, outlined × 4 paletas), Breadcrumbs, Pagination, Stepper, ToggleButton, ButtonGroup, IconButton, Fab.
4. **Overlays:** botões que abrem Dialog (com Backdrop), Menu, Popover, Snackbar e Tooltip, e Drawer.

As telas ficam numa grade rolável ou em abas internas (escolha de quem constrói). Os componentes afetados por um aviso ganham um contorno âmbar discreto no preview.

### 9.3 Desempenho

Edição contínua (arrastar cor, slider de passo) atualiza as vars em até 1 frame, sem recriar o tema MUI. A recriação parcial da `palette` acontece com debounce de ~150 ms.

## 10. Exports (fase 1: download no web)

| Formato | Arquivo | Conteúdo |
|---|---|---|
| DTCG JSON | `vortex.tokens.json` | Canônico: base, semantic e specific com aliases, modos, escopos, descrições e flexibilidade |
| CSS vars | `vortex.css` | Exatamente o runtime da §7, sem dependência de framework |
| Tailwind v4 | `vortex.tailwind.css` | `@import "./vortex.css"` (ou inline) + `@theme inline { --color-text-primary: var(--vx-text-primary); --spacing-medium: …; --radius-x-small: …; --text-body-medium: …; --shadow-raised: … }` + `@custom-variant dark ([data-mode="dark"] &)`. Só semantic e specific entram no `@theme`, para a base não ser usada direto |
| MUI theme | `vortex.mui.ts` | O mesmo tema da §8 como módulo (`createVortexTheme()`), que importa `vortex.css` e não depende de nada do builder |

Todos os exports usam os mesmos nomes de token do Figma, adaptados só na forma (`/` → `-`), conforme a seção 04 ("as palavras são as mesmas"). Cada gerador é uma função pura `(theme) => string` em `packages/tokens`, testada por snapshot.

## 11. Restrições que a fase 2 impõe à fase 1

- O modelo e o DTCG precisam dar ida e volta sem perda com as variáveis do Figma: aliases entre coleções, modos `value`/`light`/`dark`, escopos, descrições e cor composta.
- O web identifica tokens pelo nome (`semantic:text/primary`), nunca por id do Figma.
- O protocolo da fase 2 (`upsert-tokens`, `tokens-snapshot`) deve transportar o DTCG da §5.4. O `upsert-theme` shadcn continua existindo.

## 12. Testes

- `packages/tokens` (vitest): resolução de referências por modo; cada regra da §6 com um caso que passa e um que falha (incluindo o exemplo da documentação: `brand-1` amarelo → `text/on-action-primary` abaixo de 4,5:1); geração de escala (monotonicidade, determinismo, gamut); round-trip DTCG; snapshots dos quatro exports a partir do seed.
- `apps/web-mui`: typecheck e build; um teste de fumaça que monta o app com o seed e verifica que as vars `--vx-*` estão no `:root` e que um componente lê `var(--vx-…)`.
- Conferência manual: com o seed, a vitrine bate com as instâncias do Playground do Figma (seção 08 da página MUI) nos dois modos.

## 13. O que fica com quem constrói

- Layout exato das `$extensions` do DTCG (§5.4) e algoritmo de geração de escala (§5.5), respeitando os requisitos.
- Limiar de distinção das paletas de dados (§6).
- Organização interna dos `styleOverrides` e dos componentes de UI do editor.
- Grade ou abas na vitrine; conteúdo fictício das telas.
- Versões exatas de MUI, Emotion e Vite (as estáveis mais recentes compatíveis com React 19).

## Apêndice A: vocabulário de nomes (seção 04 do Figma)

| Posição | Palavras | Onde |
|---|---|---|
| Propriedade (1º nível) | `text`, `icon`, `background`, `border`, `space`, `radius`, `border-width`, `opacity`, `data`; compostos `typography`, `shadow` | todo nome |
| Ênfase texto/ícone | `primary`, `secondary`, `tertiary` | `text`, `icon` |
| Ênfase fundo/borda | `subtle`, `strong` | `background`, `border` |
| Superfície | `canvas`, `surface`, `surface-raised`, `inverse`, `backdrop` | `background` |
| Ação | `action/primary`, `action/secondary`, `action/danger`, `action/tertiary` (só com estado) | `background` |
| Feedback | `danger`, `warning`, `success`, `information` | `text`, `icon`, `background`, `border` |
| Destaque | `accent-1`…`accent-4` | `background`; par `on-` em `text` e `icon` |
| Neutro | `neutral` (+ `subtle`, `strong`) | `background`; par `on-` |
| Série de gráfico | `categorical-1..6`, `sequential-1..5` | `data` |
| Estado no fim | `hover`, `pressed` | `primary-hover` |
| Estado como papel | `selected`, `focus` | `background/selected`, `border/focus` |
| Texto/ícone específicos | `link` (só `text`), `placeholder`, `brand` | `text`, `icon` |
| Tamanho | `none`, `xx-small`…`xx-large`, `full` (só `radius`) | `space`, `radius` |
| Espessura | `default`, `strong`, `focus`, `selected` | `border-width` |
| Opacidade | `disabled`, `backdrop` | `opacity` |
| Tipografia | `display`, `heading`, `body`, `label` + `/small`, `/medium`, `/large` | `typography` |
| Sombra | `raised`, `overlay` | `shadow` |
| Campo do composto | `font-size`, `line-height`, `font-weight`, `letter-spacing`, `font-family`; `offset-x`, `offset-y`, `blur`, `spread`, `color` | último nível de `typography` e `shadow` |
| Par sobre fundo forte | `on-` + nome do fundo sem `background/`, com barras → hífen (`text/on-danger-strong`) | `text`, `icon` |

Specifics podem criar palavras novas que descrevam o **uso** (ex.: `background/reading`), nunca aparência, componente ou projeto.

## Escolhas feitas por mim (para o usuário conferir)

- Abordagem 1 (vars CSS como runtime único).
- Prefixo `--vx-base-` na base para evitar colisão de nomes.
- Mapeamento da `palette` do MUI para as Lacunas (§8).
- Vão do anel de foco de 2px.
- Rascunho no `localStorage` na fase 1.
- As quatro telas da vitrine e a lista de componentes de cada uma.
- Grupo opcional desligado: bloqueado se algum specific depende dele. Componentes MUI ligados a ele voltam ao padrão do MUI, com aviso, e os tokens somem dos exports (§5.2).
- Nome de specific: checagem de formato rígida, vocabulário, cor e componente só como avisos heurísticos (§6).
