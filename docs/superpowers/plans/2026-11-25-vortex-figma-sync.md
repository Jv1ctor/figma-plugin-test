# Vortex × Figma Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O Vortex Builder envia tokens Vortex ao Figma (variáveis base/semantic/specific + estilos) via relay e plugin existentes, importa o estado do Figma, e o relay serve aos devs o último estado real do Figma em DTCG/CSS/Tailwind/MUI.

**Architecture:** Fio em DTCG. O plugin converte DTCG → `RawFigmaExport` (nova `toFigmaExport`) e escreve por nome; relê o arquivo e devolve o DTCG real no ack. O relay roteia/enfileira como no shadcn, persiste o último DTCG real e serve 4 formatos. O builder ganha cliente WS, estado de sync (lápides, `synced`, envio automático) e UI (pílula, diálogo de envio, banner, import).

**Tech Stack:** TypeScript, pnpm workspaces, vitest, `ws`, Figma Plugin API (typings 1.142, saída ES2017), React 19 + MUI 7.

**Spec:** `docs/superpowers/specs/2026-11-25-vortex-figma-sync-design.md`

## Global Constraints

- Fluxo shadcn intacto: `upsert-theme`, `get-snapshot`, `POST /theme`, `GET /snapshot`, `GET /status` e seus testes atuais continuam passando sem alteração de comportamento.
- Upsert por nome **dentro de cada coleção**; nunca recriar variável/estilo existente (ids preservados).
- Nunca apagar no Figma exceto nomes em `remove.specific`, só na coleção `specific`.
- `mode-limit` é detectado antes de escrever qualquer variável; coleções criadas nessa mesma chamada são removidas.
- Coleções: `base` (1 modo; nova → modo renomeado `value`), `semantic` e `specific` (modos `light`/`dark`).
- Descrição: variável nova recebe a do payload; existente só tem a linha `Valor:` trocada via `withValueLine(atual, valueLine(set, layer, name))`. Estilo: descrição só quando novo.
- `codeSyntax.WEB = var(<cssVarName(layer, name)>)` em toda variável tocada.
- Avisos em pt-BR, deduplicados, máx. 50 + `"+N avisos"`.
- "Confirmado" = releitura do Figma (`ack.tokens`), nunca o payload enviado.
- `dist/code.js` do plugin sem o seed e < 150 KB.
- Envio automático: debounce 2000 ms, nunca remove, nunca vai à fila, só com `openingSnapshot === "resolved"` e plugin conectado.
- Timeouts no builder: 35 000 ms `upsert-tokens`, 15 000 ms `get-tokens-snapshot`. Relay sem timeout para WS.
- `apps/relay/data/` no `.gitignore`. Fonte Satoshi continua fora do repo.
- Commits com trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Arquivo do laboratório com `base` cujo modo não se chama `value`** (ex.: "Mode 1") → o plugin escreve no `defaultModeId` existente sem renomear. Teste na Task 3.
2. **Mesmo nome em outra coleção** (ex.: `text/primary` em `shadcn/theme`) → intocado; busca sempre escopada pela coleção. Teste na Task 3.
3. **Alias no Figma apontando para variável apagada/inexistente** → leitura não quebra; token omitido com aviso. Teste na Task 3.
4. **Plugin desconecta no meio do envio** → builder mostra erro `plugin-offline`, lápides não são limpas, `synced` não muda. Teste na Task 7.
5. **Releitura após escrita com fonte indisponível** → `ack.tokens` ainda traz as variáveis; só o estilo afetado fica como estava, com aviso. Teste na Task 5.

---

### Task 1: tokens — seed isolado, entrada `figma`, `toFigmaExport`, `diffSets`

**Files:**
- Create: `packages/tokens/src/seed.ts`, `packages/tokens/src/figma-export.ts`, `packages/tokens/src/diff.ts`, `packages/tokens/src/figma.ts`
- Modify: `packages/tokens/src/dtcg.ts` (remover import do seed e `loadSeed`), `packages/tokens/src/index.ts`, `packages/tokens/package.json` (`exports["./figma"] = "./src/figma.ts"`)
- Test: `packages/tokens/test/figma-export.test.ts`, `packages/tokens/test/diff.test.ts`

**Interfaces:**
- Produces:
  - `loadSeed(): TokenSet` agora em `seed.ts`, reexportado por `index.ts` (API pública igual).
  - `toFigmaExport(set: TokenSet, opts?: { fileKey?: string }): RawFigmaExport` — inversa de `fromFigmaExport`. Omite tokens com `isDisabled(set, layer, name)`. Coleções sempre as 3, na ordem base/semantic/specific; modos `["value"]` / `["light","dark"]`. Tipo: `color→COLOR`, `fontFamily→STRING`, demais `FLOAT`. Base cor `"#rrggbb[aa]"` → `{ color: { r, g, b, a } }` (canal/255, `a = 1` sem aa); número → `{ number }`; string → `{ string }`. Alias string → `{ alias }`; composta → `{ composite: { color, opacity } }`. `textStyles`/`effectStyles` com `bindings` = campos do estilo (`blur` do shadow em `bindings.blur`). `exportedAt` = ISO agora; `fileKey` = `opts.fileKey ?? ""`.
  - `interface LayerDiff { added: string[]; changed: string[]; removed: string[] }`
  - `interface SetDiff { base: LayerDiff; semantic: LayerDiff; specific: LayerDiff; styles: LayerDiff; total: number }`
  - `diffSets(from: TokenSet, to: TokenSet): SetDiff` — compara `type`, `scopes` e valor (`value` ou `values.light/dark`, composta campo a campo); ignora `description`, `flex`, `disabledGroups`. Estilos com chaves `text:<nome>` e `shadow:<nome>`, comparando os 5 bindings. Listas ordenadas; `total` = soma de todos os tamanhos.
  - `@token-bridge/tokens/figma` exporta só: `parseDtcg`, `toDtcg`, `TokenFormatError`, `toFigmaExport`, `fromFigmaExport`, `valueLine`, `withValueLine`, `cssVarName`, `isDisabled` e os tipos `TokenSet`, `Layer`, `RawFigmaExport`, `RawVariable`, `RawValue`, `DtcgDocument`. Nenhum módulo alcançável a partir dele importa `seed/*.json` nem `culori`.

- [ ] **Step 1: Write the failing tests**

`figma-export.test.ts`:
- `"round-trip: fromFigmaExport(toFigmaExport(seed)) equals seed"` → `expect(fromFigmaExport(toFigmaExport(loadSeed()))).toEqual(loadSeed())`.
- `"maps types, modes and composite shadow color"` → coleção `base` tem `modes: ["value"]`; `semantic` tem `["light","dark"]`; a variável `shadow/…/color` do semantic tem `values.light` com chave `composite`; `brand-1/50` tem `values.value.color.a === 1`; um `font-family/*` base tem `type: "STRING"`.
- `"omits disabled groups"` → com `disabledGroups: ["brand-2"]`, nenhuma variável base começa com `brand-2/` e nenhum semantic que `isDisabled` aparece.
- `"figma entry does not pull the seed"` → lê o texto de `src/figma.ts` e de todo arquivo que ele importa transitivamente (seguindo `from "./…"`) e espera que nenhum contenha `seed/` nem `culori`.

`diff.test.ts`:
- `"identical sets have total 0"`.
- `"detects added/changed/removed per layer"` → muda `base["brand-1/500"].value`, adiciona specific `button/primary/background`, remove um semantic → listas certas, `total === 3`.
- `"composite change counts as changed"` → troca `opacity` de uma sombra semantic → `semantic.changed` contém o nome.
- `"style binding change"` → troca `fontSize` de um text style → `styles.changed` contém `text:<nome>`.
- `"ignores description and disabledGroups"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @token-bridge/tokens test`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implement** os arquivos acima conforme Interfaces. `figma.ts` só reexporta.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @token-bridge/tokens test && pnpm -r typecheck`
Expected: PASS (inclui os 87 testes anteriores).

- [ ] **Step 5: Commit** — `feat(tokens): toFigmaExport, diffSets and seed-free figma entry`

---

### Task 2: protocol — mensagens de tokens

**Files:**
- Modify: `packages/protocol/src/messages.ts`, `apps/relay/src/relay.ts` (só `status()` passa a incluir `tokensQueued: false` para compilar; lógica real na Task 6)
- Test: `packages/protocol/test/messages.test.ts` (criar se não existir; seguir estilo dos testes do pacote)

**Interfaces:**
- Produces (em `messages.ts`, sem depender de `@token-bridge/tokens`):
  - `type DtcgDocument = Record<string, unknown>`
  - `interface UpsertTokensPayload { tokens: DtcgDocument; remove?: { specific: string[] }; muiModule?: string }`
  - `interface TokensSnapshotPayload { tokens: DtcgDocument; warnings: string[] }`
  - `interface TokensAckPayload { for: "upsert-tokens"; variables: { created: number; updated: number; unchanged: number; removed: number }; styles: { created: number; updated: number; unchanged: number }; warnings: string[]; tokens: DtcgDocument; replayed?: boolean; durationMs: number }`
  - `type AnyAckPayload = AckPayload | TokensAckPayload`
  - `StatusPayload` ganha `tokensQueued: boolean` e `lastTokens?: { at: string }`
  - `Message` ganha `Envelope<"upsert-tokens", UpsertTokensPayload>`, `Envelope<"get-tokens-snapshot", undefined>`, `Envelope<"tokens-snapshot", TokensSnapshotPayload>`; o envelope `"ack"` passa a `AnyAckPayload`.
  - `validateUpsertTokensShape(input: unknown): string[]` — mensagens: `"payload deve ser um objeto"`, `"tokens: objeto DTCG obrigatório"`, `"remove.specific: lista de strings"`, `"muiModule: string"`.

- [ ] **Step 1: Write the failing test** — `validateUpsertTokensShape` retorna `[]` para `{ tokens: {} }` e para `{ tokens: {}, remove: { specific: ["a"] }, muiModule: "x" }`; retorna as mensagens exatas acima para `null`, `{}`, `{ tokens: {}, remove: { specific: [1] } }`, `{ tokens: {}, muiModule: 1 }`.
- [ ] **Step 2: Run** `pnpm --filter @token-bridge/protocol test` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm --filter @token-bridge/protocol test && pnpm -r typecheck && pnpm --filter relay test && pnpm --filter plugin test` → PASS.
- [ ] **Step 5: Commit** — `feat(protocol): upsert-tokens, tokens-snapshot and tokens ack messages`

---

### Task 3: plugin — variáveis Vortex (escrita e leitura) + fake-figma

**Files:**
- Create: `apps/plugin/src/vortex.ts`
- Modify: `apps/plugin/test/fake-figma.ts`, `apps/plugin/package.json` (dependência `@token-bridge/tokens: workspace:*`)
- Test: `apps/plugin/test/vortex.test.ts`

**Interfaces:**
- Consumes: `@token-bridge/tokens/figma` (Task 1); `BridgeError` de `./variables.ts`.
- Produces (`vortex.ts`):
  - `interface Counts { created: number; updated: number; unchanged: number }`
  - `interface VortexWriteResult { variables: Counts & { removed: number }; styles: Counts; warnings: string[] }`
  - `upsertVortex(set: TokenSet, remove: string[]): Promise<VortexWriteResult>` — Task 3 deixa `styles` zerado; Task 4 pluga os estilos.
  - `readVortex(): Promise<{ raw: RawFigmaExport; warnings: string[] }>` — lança `BridgeError("no-collection", "Este arquivo ainda não tem os tokens Vortex — use Enviar para o Figma")` se faltar `base` ou `semantic`; lança `BridgeError("no-collection", 'coleção "<nome>" não tem o modo "<modo>"')` se semantic/specific existir sem `light`/`dark`. Specific ausente = coleção vazia.
  - `capWarnings(list: string[]): string[]` — dedupe preservando ordem; se > 50, 50 primeiros + `"+N avisos"`.
  - Contexto interno exportado para a Task 4: `interface VortexContext { set: TokenSet; byName: Record<"base"|"semantic"|"specific", Map<string, Variable>>; warnings: string[] }`.
- fake-figma ganha: `variable.description` (string, `""`), `variable.remove()` (tira da lista; `calls.removeVariable++`), `figma.variables.createVariableAlias(v)` → `{ type: "VARIABLE_ALIAS", id: v.id }`; `setValueForMode` lança `"Mismatched variable resolved type"` quando o valor é alias (não composta) para variável de `resolvedType` diferente.

Regras de escrita (spec §6.2) — o que o teste não determina:
- Pré-checagem completa (achar/criar as 3 coleções + modos) antes de qualquer `createVariable`/`setValueForMode`. Mensagem `mode-limit`: `não foi possível criar o modo "<modo>" na coleção "<coleção>": o plano atual do Figma provavelmente só permite 1 modo por coleção (Starter). Use um arquivo em um plano Professional+. Detalhe: <erro>`.
- Coleção: `getLocalVariableCollectionsAsync()` com `name === X && !isExtension`; extensão com mesmo nome → aviso `Coleção "<X>" é uma extensão e foi ignorada`.
- Base existente usa `defaultModeId` sem renomear.
- Ordem: base → semantic → specific → remoções.
- Igualdade: cor `COLOR_EPS = 1/510` por canal incl. alfa; número `1e-4`; string `===`; alias por id; composta por ambos ids.
- Variável existente com outro `resolvedType` → aviso `"<camada>/<nome>": já existe como <TIPO> (esperado <TIPO>); ignorado` e pula. Alias para base ausente → aviso `"<camada>/<nome>": referência "<base>" não existe na base; ignorado` e pula.
- `remove` com nome inexistente → aviso `Specific "<nome>" não existe no Figma; nada removido`.
- Leitura: base pelo `defaultModeId`; semantic/specific pelos modos `light`/`dark`; alias → nome da variável alvo **na coleção base**; alvo inexistente ou fora da base → aviso `"<camada>/<nome>": alias quebrado; omitido` e omite; valor literal em semantic/specific → aviso `"<camada>/<nome>": valor literal no modo <modo> (esperado alias); omitido`; `BOOLEAN` → aviso e omite.

- [ ] **Step 1: Write the failing tests** (`vortex.test.ts`, instalando o fake como em `variables.test.ts`; `seed = loadSeed()`):
  - `"first send creates 3 collections with the right modes and round-trips"` → `upsertVortex(seed, [])` cria `base`(`["value"]`), `semantic`(`["light","dark"]`), `specific`(`["light","dark"]`); `variables.created === 454`; `fromFigmaExport((await readVortex()).raw)` sem estilos `toEqual` `{ ...seed, textStyles: [], shadowStyles: [] }` (estilos chegam na Task 4).
  - `"second identical send writes nothing"` → `variables.unchanged === 454`, `calls.setValueForMode` não muda.
  - `"mode limit aborts before writing"` → fake `maxModes: 1` → rejeita com `code: "mode-limit"`; `fake.collections` e `fake.variables` vazios.
  - `"updates in place and only replaces the Valor line"` → após 1º envio, muda a descrição de `text/primary` no fake para `"Uso: X\nValor: velho"`; altera `semantic["text/primary"].values.light` para outra base; reenvia → mesmo `id`; descrição = `"Uso: X\nValor: " + valueLine(set2, "semantic", "text/primary")`; `updated === 1`.
  - `"writes scopes and codeSyntax"` → `text/primary` tem `scopes: ["TEXT_FILL"]`, `codeSyntax.WEB === "var(--vx-text-primary)"`; `brand-1/50` tem `codeSyntax.WEB === "var(--vx-base-brand-1-50)"`.
  - `"removes only listed specifics"` → envia set com specifics `a/b/c` e `a/b/d` (via `upsertSpecific`), depois `upsertVortex(semD, ["a/b/c"])` → só `a/b/c` sai; `removed === 1`; nome inexistente gera o aviso exato.
  - `"type mismatch is skipped with warning"` → pré-cria no fake `semantic` com `text/primary` FLOAT → aviso exato, demais aplicados.
  - Review Focus 1: `"existing base collection keeps its mode name"` → fake com coleção `base` modo `"Mode 1"` → nada renomeado, valores no `defaultModeId`.
  - Review Focus 2: `"same name in another collection is untouched"` → variável `text/primary` em coleção `shadcn/theme` mantém valores e id após o envio.
  - Review Focus 3: `"broken alias is omitted on read"` → após envio, remove do fake a base alvo de `text/primary` → `readVortex()` não lança, omite `text/primary`, aviso exato.
  - `"capWarnings caps at 50"` → 60 strings distintas → 51 itens, último `"+10 avisos"`.
- [ ] **Step 2: Run** `pnpm --filter plugin test` → FAIL.
- [ ] **Step 3: Implement** `vortex.ts` e as extensões do fake.
- [ ] **Step 4: Run** `pnpm --filter plugin test && pnpm --filter plugin typecheck` → PASS (incl. 10 testes shadcn).
- [ ] **Step 5: Commit** — `feat(plugin): upsert and read Vortex variables by name`

---

### Task 4: plugin — estilos de texto e efeito

**Files:**
- Create: `apps/plugin/src/vortex-styles.ts`
- Modify: `apps/plugin/src/vortex.ts` (chamar estilos no fim de `upsertVortex`; incluir estilos em `readVortex`), `apps/plugin/test/fake-figma.ts`
- Test: `apps/plugin/test/vortex-styles.test.ts`

**Interfaces:**
- Consumes: `VortexContext`, `Counts`, `capWarnings` (Task 3).
- Produces:
  - `upsertStyles(ctx: VortexContext, raw: RawFigmaExport): Promise<Counts>`
  - `readStyles(idToName: Map<string, string>): Promise<{ textStyles: RawFigmaExport["textStyles"]; effectStyles: RawFigmaExport["effectStyles"]; warnings: string[] }>`
- fake-figma ganha: `getLocalTextStylesAsync`, `getLocalEffectStylesAsync`, `createTextStyle`, `createEffectStyle` (com `name`, `description`, `id`, `boundVariables`), `textStyle.fontName` (setter lança `Cannot write to node with unloaded font` se a fonte não foi carregada), `textStyle.setBoundVariable(field, variable)`, `loadFontAsync({family, style})` (rejeita se `family` ∈ `opts.missingFonts`), `figma.variables.setBoundVariableForEffect(effect, field, variable)` → novo effect com `boundVariables[field] = { type: "VARIABLE_ALIAS", id }`, `effectStyle.effects` (get/set, clona).

Regras (spec §6.4): binding resolve o nome em semantic → specific → base (nessa ordem) via `ctx.byName`; nome não achado → aviso `Estilo "<nome>": variável "<v>" não existe; estilo ignorado` e pula. Fonte: família = valor da base apontada por `set.semantic[bindings.fontFamily].values.light` (ou valor direto se a binding for base), estilo `"Regular"`; falha → aviso `Fonte "<família>" indisponível no Figma: estilo "<nome>" não foi atualizado` e pula. Efeito novo: `{ type: "DROP_SHADOW", color: {r:0,g:0,b:0,a:0.25}, offset: {x:0,y:0}, radius: 0, spread: 0, visible: true, blendMode: "NORMAL" }` antes das ligações. Campos ligados: texto `fontFamily, fontSize, fontWeight, lineHeight, letterSpacing`; efeito `offsetX, offsetY, radius(=blur), spread, color`. Unchanged = todas as ligações já com os mesmos ids.

- [ ] **Step 1: Write the failing tests:**
  - `"creates 12 text and 2 effect styles bound to variables"` → após `upsertVortex(seed, [])`, `styles.created === 14`; o 1º text style tem `boundVariables.fontSize.id` = id da variável do seed correspondente; efeito tem `effects[0].boundVariables.color.id` = id da variável `shadow/…/color` composta.
  - `"full round-trip with styles"` → `fromFigmaExport((await readVortex()).raw)` `toEqual(seed)`.
  - `"second send leaves styles unchanged"` → `styles.unchanged === 14`.
  - `"missing font skips only that style"` → fake `missingFonts: ["Satoshi Variable"]` → aviso exato, `styles.created === 2` (efeitos), variáveis aplicadas.
  - `"existing style keeps id and description"` → pré-cria text style com mesmo nome e descrição `"minha"` → após envio, mesmo id, descrição `"minha"`, `updated === 1`.
- [ ] **Step 2: Run** `pnpm --filter plugin test` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm --filter plugin test && pnpm --filter plugin typecheck` → PASS.
- [ ] **Step 5: Commit** — `feat(plugin): bind Vortex text and effect styles to variables`

---

### Task 5: plugin — mensagens, UI e bundle

**Files:**
- Create: `apps/plugin/src/handle.ts`
- Modify: `apps/plugin/src/code.ts` (passa a delegar para `handleMessage`), `apps/plugin/src/ui.ts`
- Test: `apps/plugin/test/handle.test.ts`, `apps/plugin/test/bundle.test.ts`

**Interfaces:**
- Consumes: `upsertVortex`, `readVortex`, `capWarnings` (Tasks 3–4); `upsertTheme`, `readSnapshot` (existentes); tipos da Task 2.
- Produces: `handleMessage(msg: Envelope): Promise<Envelope | undefined>` — cobre os 4 tipos; `code.ts` mantém `enqueue`, `figma.ui.postMessage` e `figma.notify` (Vortex: `Vortex aplicado · <updated> atualizadas · <warnings> avisos`).
  - `upsert-tokens`: `validateUpsertTokensShape` + `parseDtcg` (`TokenFormatError`/forma → `error invalid`); `upsertVortex(set, remove?.specific ?? [])`; `readVortex()`; ack `{ for: "upsert-tokens", variables, styles, warnings: capWarnings([...escrita, ...leitura]), tokens: toDtcg(fromFigmaExport(raw)), durationMs }`.
  - `get-tokens-snapshot`: `readVortex()` → `tokens-snapshot { tokens: toDtcg(fromFigmaExport(raw)), warnings }`; `BridgeError` → `error` com o mesmo `code`.
- `ui.ts`: repassa também `upsert-tokens` e `get-tokens-snapshot` (mostra `"aplicando…"` no primeiro); ack com `for === "upsert-tokens"` mostra tema `"Vortex"` e detalhe `"<created> criadas · <updated> atualiz. · <unchanged> iguais"` + `" · <n> avisos"` (classe `warn` se houver avisos; `title` = avisos unidos por `\n`).

- [ ] **Step 1: Write the failing tests:**
  - `handle.test.ts`: `"upsert-tokens acks with the re-read tokens"` → `ack.payload.tokens` passa em `parseDtcg` e `toEqual` `toDtcg(seed)` após `parseDtcg`; `"invalid DTCG → error invalid"`; `"snapshot on empty file → error no-collection"`; `"shadcn upsert-theme still acks"`; Review Focus 5: `"missing font: ack.tokens still has all variables"` → com `missingFonts`, `Object.keys(parseDtcg(ack.tokens).semantic).length === 184` e o aviso de fonte presente.
  - `bundle.test.ts`: roda `esbuild.build` com `entryPoints: ["src/code.ts"]`, `bundle: true`, `format: "iife"`, `target: "es2017"`, `write: false` e `define`/`loader` iguais ao `build.ts` → texto não contém `"Uso: Texto principal"` e tem < 150 × 1024 bytes.
- [ ] **Step 2: Run** `pnpm --filter plugin test` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm --filter plugin test && pnpm --filter plugin typecheck && pnpm --filter plugin build` → PASS; build imprime `dist/code.js` sem erro.
- [ ] **Step 5: Commit** — `feat(plugin): handle upsert-tokens and tokens snapshot`

---

### Task 6: relay — rotas, fila, persistência e exports

**Files:**
- Modify: `apps/relay/src/relay.ts`, `apps/relay/package.json` (dep `@token-bridge/tokens: workspace:*`), `.gitignore` (`apps/relay/data/`)
- Create: `apps/relay/src/store.ts`
- Test: `apps/relay/test/tokens.test.ts`

**Interfaces:**
- Consumes: Task 2 (tipos, `validateUpsertTokensShape`); `parseDtcg`, `toCss`, `toTailwind` de `@token-bridge/tokens`.
- Produces:
  - `RelayOptions.dataDir?: string` — padrão `fileURLToPath(new URL("../data/", import.meta.url))`.
  - `store.ts`: `interface LastTokens { at: string; tokens: DtcgDocument; muiModule?: string }`; `loadLast(dir: string, log: Logger): LastTokens | null` (arquivo ausente → null; corrompido → log + null); `saveLast(dir: string, last: LastTokens): void` (mkdir -p; escreve `last-tokens.json.tmp` e renomeia).
  - Status: `tokensQueued`, `lastTokens: { at }` quando houver.

Comportamento (spec §8):
- `PLUGIN_BOUND += upsert-tokens, get-tokens-snapshot`; `PLUGIN_REPLIES += tokens-snapshot`.
- Validação de `upsert-tokens`: `validateUpsertTokensShape` + `parseDtcg(payload.tokens)` → erro `invalid` ao remetente.
- Repasse ao plugin sem `muiModule`; `muiModule` guardado em `Map<id, string>` até o ack.
- Fila `queuedTokens` separada de `queuedTheme`, mesma semântica (substitui e responde `plugin-offline` ao anterior; replay em `attachPlugin`; `replayed: true`).
- Persistência em `handlePluginReply`, antes de rotear, para qualquer origem: ack `for === "upsert-tokens"` → `{ at: now, tokens: ack.tokens, muiModule: muiById.get(id) ?? last?.muiModule }`; `tokens-snapshot` → `{ at: now, tokens, muiModule: last?.muiModule }`; depois `broadcastStatus()`. No boot, `loadLast(dataDir)`.
- GET `/tokens.json` (DTCG, `application/json; charset=utf-8`), `/tokens.css` (`toCss(parseDtcg(tokens))`, `text/css; charset=utf-8`), `/tokens.tailwind.css` (`toTailwind`, `text/css; charset=utf-8`), `/tokens.mui.ts` (`text/plain; charset=utf-8`); todas com `access-control-allow-origin: *`. Sem dado → 404 JSON `{ error: "nenhum token confirmado pelo Figma ainda" }`; sem `muiModule` → 404 `{ error: "módulo MUI não enviado" }`. 404 genérico lista as rotas novas.

- [ ] **Step 1: Write the failing tests** (`tokens.test.ts`, reusando o padrão `connect`/`fakePlugin` de `relay.test.ts`, com `dataDir` em `mkdtempSync`; o fake plugin responde `upsert-tokens` com ack cujo `tokens` = DTCG recebido com um token a menos, para provar que o relay guarda o ack e não o payload):
  - `"routes upsert-tokens to the plugin without muiModule"`.
  - `"rejects invalid DTCG with invalid"`.
  - `"persists ack.tokens, not the sent payload"` → `last-tokens.json` contém o DTCG do ack e o `muiModule` enviado.
  - `"persists a late ack whose sender disconnected"` → web fecha antes do ack; arquivo gravado.
  - `"queues tokens offline independently of themes"` → plugin offline, envia tema e tokens; ao conectar, plugin recebe ambos; status `tokensQueued` vai de `true` a `false`.
  - `"tokens-snapshot persists and keeps previous muiModule"`.
  - `"GET routes serve 4 formats; 404 before first ack"` → `/tokens.css` contém `--vx-text-primary`; `/tokens.tailwind.css` contém `@theme`; `/tokens.mui.ts` igual ao enviado.
  - `"boot reloads last-tokens.json"` → novo relay no mesmo `dataDir` serve `/tokens.json` e status `lastTokens.at`.
- [ ] **Step 2: Run** `pnpm --filter relay test` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm --filter relay test && pnpm --filter relay typecheck` → PASS (incl. 11 testes shadcn).
- [ ] **Step 5: Commit** — `feat(relay): route Vortex tokens, persist Figma-confirmed state and serve exports`

---

### Task 7: web-mui — cliente do relay, lápides e estado de sync

**Files:**
- Create: `apps/web-mui/src/sync/relay-client.ts`, `apps/web-mui/src/sync/sync-store.ts`, `apps/web-mui/src/sync/actions.ts`
- Modify: `apps/web-mui/src/state/store.ts`, `apps/web-mui/src/editor/SpecificTab.tsx` (remover via `store.removeSpecific`), `apps/web-mui/src/main.tsx` (`startSync(createRelayClient(RELAY_URL))`), `apps/web-mui/package.json` (dep `@token-bridge/protocol: workspace:*`)
- Test: `apps/web-mui/test/sync.test.ts`, `apps/web-mui/test/store.test.ts` (casos novos)

**Interfaces:**
- Consumes: Task 1 (`diffSets`, `SetDiff`), Task 2 (tipos), `toMuiModule`.
- Produces:
  - `relay-client.ts`: `interface RelayState { socket: "connecting" | "open" | "closed"; status: StatusPayload | null }`; `interface RelayPort { readonly state: RelayState; subscribe(fn: () => void): () => void; request(type: MessageType, payload?: unknown, timeoutMs?: number): Promise<Envelope> }`; `class RelayError extends Error { payload: ErrorPayload }`; `createRelayClient(url: string): RelayPort` (mesma lógica de `apps/web/src/lib/relay.ts`, timeout por request); `RELAY_URL` (`VITE_RELAY_URL` ou `ws://localhost:3055`); `relayHttpUrl(ws: string): string` (`ws:`→`http:`, `wss:`→`https:`).
  - `store.ts`: `EditorState.removedSpecifics: string[]` persistido em `vortex-builder:removed-specifics:v1` (try/catch como o rascunho); `store.removeSpecific(name)`; `store.importSet(set)` (substitui `set` preservando `disabledGroups` atuais, zera lápides); `store.clearTombstones(names: string[])`; `reset()` zera lápides; em `commit`, lápide cujo nome existe no novo `set.specific` é descartada.
  - `sync-store.ts`: `type SyncResult = { kind: "ack"; ack: TokensAckPayload } | { kind: "queued" } | { kind: "timeout" } | { kind: "error"; error: ErrorPayload }`; `interface SyncState { relay: RelayState; synced: TokenSet | null; autoSend: boolean; openingSnapshot: "pending" | "resolved"; banner: { diff: SetDiff; snapshot: TokenSet; warnings: string[] } | null; sending: boolean; result: SyncResult | null }`; `syncStore.get/subscribe/update`; `useSync(select)`; `autoSend` persistido em `vortex-builder:auto-send:v1`.
  - `actions.ts`: `startSync(relay: RelayPort): () => void`; `sendToFigma(opts: { remove: string[]; auto?: boolean }): Promise<SyncResult>`; `fetchSnapshot(): Promise<{ set: TokenSet; warnings: string[] }>`; `importFromFigma(snapshot: TokenSet): void`; `keepDraft(): void`; `setAutoSend(on: boolean): void`; `buildPayload(set: TokenSet, remove: string[]): UpsertTokensPayload` (`{ tokens: toDtcg(set), remove: { specific: remove }, muiModule: toMuiModule(set) }`).

Comportamento (spec §7):
- `startSync`: espelha `relay.state` em `syncStore.relay`. Primeira vez que `socket === "open"` com `status`: plugin `disconnected` → `openingSnapshot = "resolved"`; conectado → `fetchSnapshot()` uma vez; diff vazio → `synced = snapshot`, `resolved`; diff não vazio → `banner`; erro (`no-collection` ou outro) → `resolved`. Mudança de `status.lastTokens.at` → `fetch(relayHttpUrl(RELAY_URL) + "/tokens.json")` → `synced = parseDtcg(json)`.
- `sendToFigma`: `sending = true`; se plugin não conectado → dispara o request sem aguardar (`catch` silencioso) e retorna `queued`; senão aguarda até 35 000 ms: ack → `synced = parseDtcg(ack.tokens)`, `store.clearTombstones(remove)`; `RelayError` `timeout` → `{ kind: "timeout" }`; outros erros → `{ kind: "error" }` sem tocar `synced`/lápides. Grava `result`.
- Envio automático: assina mudanças de `store.get().set`; debounce 2000 ms; envia `sendToFigma({ remove: [], auto: true })` só se `autoSend`, `openingSnapshot === "resolved"`, socket aberto e plugin conectado; senão marca pendente e reavalia quando sync/relay mudar.
- `importFromFigma`: `store.importSet`, `synced = snapshot`, `banner = null`, `resolved`. `keepDraft`: `synced = banner.snapshot`, `banner = null`, `resolved`.

- [ ] **Step 1: Write the failing tests** (`sync.test.ts` com um `FakeRelay implements RelayPort` controlável e `vi.useFakeTimers()`):
  - lápides: `"removing a specific adds a tombstone; recreating drops it; reset and importSet clear it"`.
  - `"specific only in Figma never becomes a removal"` → banner com snapshot contendo specific extra → `keepDraft()` → `store.get().removedSpecifics` vazio.
  - `"opening snapshot: no diff resolves silently; diff shows banner; no-collection resolves"`.
  - `"importFromFigma keeps local disabledGroups"`.
  - `"send ack updates synced from ack.tokens and clears sent tombstones"`.
  - Review Focus 4: `"plugin-offline error keeps tombstones and synced"`.
  - `"send while plugin offline returns queued immediately"`.
  - `"timeout result after 35s"`.
  - `"auto-send debounces 2s, never removes, waits for opening snapshot and plugin"` → 3 edições em 1 s → 1 request após 2 s com `remove.specific` vazio; com `openingSnapshot` pendente → 0 requests até resolver, então 1.
  - `"lastTokens.at change refreshes synced via GET /tokens.json"` (mock de `fetch`).
  - `"buildPayload includes DTCG, removals and the MUI module"`.
- [ ] **Step 2: Run** `pnpm --filter web-mui test` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm --filter web-mui test && pnpm --filter web-mui typecheck` → PASS (incl. 139 anteriores).
- [ ] **Step 5: Commit** — `feat(web-mui): relay client, tombstones and Figma sync state`

---

### Task 8: web-mui — UI de sincronização

**Files:**
- Create: `apps/web-mui/src/sync/FigmaStatus.tsx`, `apps/web-mui/src/sync/SendDialog.tsx`, `apps/web-mui/src/sync/SyncFeedback.tsx`, `apps/web-mui/src/sync/FigmaBanner.tsx`, `apps/web-mui/src/sync/ImportFromFigma.tsx`
- Modify: `apps/web-mui/src/shell/Header.tsx`, `apps/web-mui/src/export/ExportMenu.tsx`, `apps/web-mui/src/App.tsx`
- Test: `apps/web-mui/test/sync-ui.test.tsx`

**Interfaces:**
- Consumes: Task 7 (`useSync`, `syncStore`, `actions`, `diffSets`).
- Produces: componentes acima; todos os portais (Dialog/Snackbar/Menu) com `data-editor-portal=""`.

Textos exatos:
- Pílula (`FigmaStatus`, Chip `size="small"`): socket ≠ open → `"Relay offline"` (error); `status.tokensQueued` → `"Na fila"` (warning); plugin conectado → `"Figma conectado"` (success); senão `"Figma offline"` (default). Fica à esquerda de "Avisos".
- Botão no Header: `"Enviar para o Figma"` (abre `SendDialog`).
- `SendDialog`: título `"Enviar para o Figma"`; resumo `diffSets(synced, set)` por camada como `"<Camada>: <a> novos · <c> alterados · <r> removidos"` com lista expansível de nomes; se `synced === null`: `"Estado do Figma desconhecido: tudo será enviado"`; seção `"Remover do Figma"` com um checkbox marcado por lápide; Switch `"Envio automático"`; aviso quando plugin offline: `"Na fila: será aplicado quando o plugin reconectar"`; botões `"Cancelar"` e `"Enviar"`.
- `SyncFeedback` (Snackbar): ack → `"Figma atualizado · <created> criadas · <updated> atualizadas · <removed> removidas"` + ação `"ver avisos (<n>)"` que abre Dialog `"Avisos do Figma"` com a lista; queued → `"Na fila: será aplicado quando o plugin reconectar"`; timeout → `"Sem resposta do plugin ainda; o status avisará quando aplicar"`; erro `mode-limit` → `"O arquivo do Figma só permite 1 modo por coleção (plano Starter). Use um arquivo em plano Professional ou superior."`; outros erros → mensagem do erro.
- `FigmaBanner` (Alert `severity="info"` no topo de `<main>`, antes das Tabs da vitrine): `"O Figma tem <total> diferenças em relação ao seu rascunho"`, botões `"Importar do Figma"` e `"Manter meu rascunho"`.
- Menu Exportar: item `"Importar do Figma…"` após `"Importar JSON…"` → `fetchSnapshot()` → Dialog `"Importar do Figma"` com o resumo `diffSets(set, snapshot)`, lista de avisos do snapshot e botões `"Cancelar"`/`"Importar"`; erro → Snackbar existente com a mensagem.

- [ ] **Step 1: Write the failing tests** (`sync-ui.test.tsx`, `syncStore.update` direto para os estados):
  - `"status pill shows the 4 states"`.
  - `"send dialog lists diff, unknown-state note and tombstones; unchecking excludes a removal"` → `sendToFigma` (spy) chamado com `remove` sem o desmarcado.
  - `"ack snackbar shows counts and opens warnings dialog"`.
  - `"mode-limit error shows the plan message"`.
  - `"banner appears only with a diff; buttons call importFromFigma / keepDraft"`.
  - `"Importar do Figma… opens confirmation with diff and warnings"`.
- [ ] **Step 2: Run** `pnpm --filter web-mui test` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm test && pnpm typecheck` (raiz) → PASS em todos os pacotes.
- [ ] **Step 5: Commit** — `feat(web-mui): send to Figma, import from Figma and sync status`
