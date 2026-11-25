# Vortex × Figma — sincronização via relay e plugin (fase 2)

Data: 2026-11-25 · Branch: `feature/test-with-mui` · Fase 1: `2026-11-25-vortex-mui-token-builder-design.md` · Incremento: `2026-11-25-vortex-charts-inspect-design.md`

## 1. Intenção

Hoje o `apps/web-mui` (Vortex Builder) edita os tokens Vortex e exporta arquivos. O caminho até o Figma só existe para o tema shadcn (`apps/web` → relay → plugin → coleção `shadcn/theme`). A fase 2 fecha o ciclo de integração contínua para o Vortex:

- **web → Figma:** o que o designer monta no builder vira variáveis e estilos no arquivo do Figma. A atualização é feita no lugar, pelo nome, e por isso os componentes MUI do arquivo que já estão ligados a essas variáveis continuam ligados.
- **Figma → web:** o builder consegue importar o estado atual do Figma.
- **Figma confirmado → devs:** o relay guarda o último conjunto que o Figma confirmou e o serve como DTCG, CSS vars, Tailwind v4 e módulo MUI.

O princípio é **reaproveitar o que já funciona no shadcn**: o mesmo relay, o mesmo plugin, o mesmo envelope `{id,type,payload}`, a mesma fila offline, a mesma serialização de trabalho no plugin e o mesmo erro `mode-limit`. Também se mantém a regra de upsert idempotente por nome.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- Botão **"Enviar para o Figma"** no builder. Ele mostra um resumo das mudanças, envia e exibe o retorno do plugin: contagens e avisos.
- Toggle **"Envio automático"**, desligado por padrão.
- **"Importar do Figma"**, disponível como botão permanente e também como banner na abertura quando o Figma diverge do rascunho.
- O plugin escreve as três coleções `base`/`semantic`/`specific`, as descrições, os escopos, os estilos de texto e os estilos de efeito.
- O relay persiste o último conjunto confirmado e o serve em quatro formatos via HTTP.

**Não-objetivos (ficam para fases seguintes)**
- Aba de configuração no plugin com a URL do relay (`figma.clientStorage`), pareamento ou salas.
- Deploy: Vercel, Cloudflare Workers ou Render, publicação do plugin.
- Criar componentes MUI no Figma. O plugin só mexe em variáveis e estilos.
- Merge em três vias ou resolução de conflito campo a campo. A importação substitui o rascunho e o envio sobrescreve o Figma.

**Anti-objetivos (o que tornaria a entrega um fracasso mesmo funcionando)**
- Quebrar a ligação dos componentes MUI do arquivo, por exemplo recriando uma variável em vez de atualizá-la.
- Apagar no Figma algo que o designer não pediu para apagar.
- Deixar o arquivo do Figma meio escrito quando um pré-requisito falha, como o `mode-limit`.
- Regredir o fluxo shadcn existente. `upsert-theme` e `get-snapshot` continuam idênticos.

## 3. Restrições

- **Plano do Figma.** `semantic` e `specific` precisam de dois modos (`light`/`dark`). Num arquivo do plano Starter, `addMode` falha com "Limited to 1 modes only". O arquivo-alvo precisa ser Professional ou superior, como o arquivo do laboratório. A conta conectada hoje é Starter com assento View, e o arquivo de teste criado pelo usuário abre somente leitura para ela. **Por isso a validação real ponta a ponta fica para quando houver um arquivo editável num plano pago.** Nesta fase a verificação é feita pelo `fake-figma` dos testes. A seção 10 traz o roteiro manual.
- **Achados do spike** (Plugin API, arquivo descartável):
  - Alias entre coleções via `createVariableAlias`: funciona.
  - Cor composta `{color: VARIABLE_ALIAS, opacity: VARIABLE_ALIAS}` via `setValueForMode`: escreve e lê de volta igual. Não precisa de fallback.
  - `description` e `scopes`: funcionam.
  - Estilo de texto: `setBoundVariable('fontSize'|'fontFamily'|…, variable)` funciona.
  - Estilo de efeito: `figma.variables.setBoundVariableForEffect(effect, 'offsetY'|'color'|…, variable)` funciona, inclusive com a variável de cor composta. Depois é preciso reatribuir `style.effects = [effect]`. As ligações sobrevivem a mudanças no valor da base.
  - Alias de tipo incompatível lança "Mismatched variable resolved type".
- **Formato do arquivo do laboratório**, que é a referência de "como deve ficar":
  - `base` tem 1 modo (`value`); `semantic` e `specific` têm modos `light`/`dark`.
  - Sombras: `shadow/*/color` é composta, com escopo `EFFECT_COLOR`.
  - Estilos de efeito ligam `color`, `spread`, `radius`, `offsetX` e `offsetY`.
  - Estilos de texto ligam `letterSpacing`, `fontSize`, `fontFamily`, `lineHeight` e `fontWeight`. A fonte é `Satoshi Variable`.
- **Sandbox do plugin:** saída em ES2017 (`apps/plugin/build.ts`). O bundle do plugin **não** pode carregar o seed: `packages/tokens/src/dtcg.ts` importa `seed/vortex.tokens.json` (cerca de 224 KB) no topo para `loadSeed`.
- **Fonte:** escrever estilo de texto exige carregar a fonte (`figma.loadFontAsync`). Se Satoshi não estiver disponível na máquina do designer, o plugin não pode falhar o envio inteiro (seção 6.4).
- **Licença da Satoshi:** continua fora do repositório. Nada nesta fase muda isso.
- **Commits:** só quando o usuário pedir. O trailer de commit continua o mesmo das fases anteriores.

## 4. Abordagens consideradas

| | Abordagem | Prós | Contras |
|---|---|---|---|
| **1 (escolhida)** | **Estender o plugin e o relay existentes**: `vortex.ts` e `vortex-styles.ts` no plugin, novos `case` em `code.ts`, a mesma fila e a mesma ponte de UI, e `fake-figma` ampliado | Um plugin só para o designer instalar. Reaproveita reconexão, fila, serialização e erros, e o caminho shadcn fica intacto | `code.ts` e `ui.ts` passam a conhecer dois formatos |
| 2 | Plugin separado ("Vortex Bridge") com o próprio manifest | Isolamento total | Duplica a ponte WS, a fila e a UI. Dois plugins disputando o papel `plugin` no relay, que só aceita um |
| 3 | Web escrevendo direto no Figma pela REST API de variáveis | Sem plugin | A REST de escrita de variáveis exige Enterprise e token pessoal. Não mexe em estilos de texto/efeito com ligação |

O usuário escolheu a abordagem 1 e pediu para seguir o que funcionou no shadcn.

## 5. Contrato de mensagens (`packages/protocol`)

Os tipos novos ficam na mesma união `Message`. O fio leva **DTCG**, o mesmo documento que `toDtcg`/`parseDtcg` já produzem e leem. É ele que o relay valida e serve aos devs.

```ts
// novos tipos de mensagem
| Envelope<"upsert-tokens", UpsertTokensPayload>
| Envelope<"get-tokens-snapshot", undefined>
| Envelope<"tokens-snapshot", TokensSnapshotPayload>
// "ack" passa a aceitar AckPayload | TokensAckPayload (discriminado por `for`)

interface UpsertTokensPayload {
  tokens: DtcgDocument;               // toDtcg(set) do builder
  remove?: { specific: string[] };    // nomes de specific a apagar (seção 6.3)
  muiModule?: string;                 // código do módulo MUI gerado no builder; só o relay usa
}
interface TokensSnapshotPayload {
  tokens: DtcgDocument;
  warnings: string[];                 // ex.: literal em semantic/specific omitido (seção 6.6)
}
interface TokensAckPayload {
  for: "upsert-tokens";
  variables: { created: number; updated: number; unchanged: number; removed: number };
  styles: { created: number; updated: number; unchanged: number };
  warnings: string[];                 // legíveis, pt-BR (seção 6.5)
  tokens: DtcgDocument;               // releitura do Figma APÓS a escrita (seção 6.2, passo 9)
  replayed?: boolean;
  durationMs: number;
}
```

**"Confirmado pelo Figma" = o que o arquivo contém de fato**, nunca o payload enviado. Isso segue a fase 1, em que o Figma é a fonte da verdade. O ack carrega a releitura do arquivo depois da escrita. Com isso, tokens pulados com aviso, grupos desligados que ficaram como estavam, specifics que só existem no Figma e edições feitas direto no Figma aparecem como realmente estão.

- `StatusPayload` ganha `tokensQueued: boolean` e `lastTokens?: { at: string }`. Os campos atuais não mudam.
- Os códigos de erro são os mesmos: `invalid`, `mode-limit`, `plugin-offline`, `timeout`, `figma` e `no-collection`.
- `packages/protocol` **não** depende de `@token-bridge/tokens`. `DtcgDocument` é declarado como `Record<string, unknown>` no protocol. Quem valida é o relay e o plugin, com `parseDtcg`.

## 6. Plugin (`apps/plugin`)

### 6.1 Ponte de dados

A lógica do Figma fala só o formato `RawFigmaExport`, que já existe em `packages/tokens/src/raw.ts` e é o mesmo formato extraído do arquivo do laboratório na fase 1:

- **Envio:** `parseDtcg(payload.tokens)` → `toFigmaExport(set)` (**nova**, inversa de `fromFigmaExport`) → escrita no Figma.
- **Snapshot:** leitura do Figma → `RawFigmaExport` → `fromFigmaExport` → `toDtcg` → `tokens-snapshot`.

Assim a conversão fica testável sem Figma: `fromFigmaExport(toFigmaExport(set))` deve devolver `set`. Os `disabledGroups` não vivem no Figma (seção 7.3), e a `flex` da base é derivada do nome.

**Grupos desligados:** `toFigmaExport` recebe o `set` e omite as variáveis de grupos desligados (`isDisabled`). Elas não são escritas nem apagadas. O que já existe no Figma continua lá.

### 6.2 Escrita (`vortex.ts`)

A ordem segue a das dependências e sempre parte de **pré-checagem antes de mexer**, como o `upsertTheme` faz hoje:

1. **Localizar ou criar** as coleções `base`, `semantic` e `specific`, procurando por nome exato e não-extensão.
2. **Garantir os modos.** `base` precisa de 1 modo; se a coleção for nova, o modo padrão é renomeado para `value`. Em `semantic` e `specific`, o primeiro modo vira `light` se ainda não houver `light`, e `dark` é criado se faltar. **Se `addMode` falhar, lança `mode-limit` antes de escrever qualquer variável** e remove as coleções que esta mesma chamada criou. É a mesma mensagem e o mesmo comportamento do shadcn.
3. **Base:** upsert por nome.
   - Cor hex é convertida para `RGBA`.
   - `dimension`, `number` e `fontWeight` viram `FLOAT` em px, como o export guarda.
   - `fontFamily` vira `STRING`.
   - Só chama `setValueForMode` quando o valor mudou: cor com a mesma tolerância `COLOR_EPS` do shadcn, número com `1e-4`.
4. **Semantic e depois specific:** upsert por nome. Os valores `light` e `dark` são `VARIABLE_ALIAS` para a variável da base com aquele nome. A composta vira `{color: alias, opacity: alias}`. "Inalterado" significa que o alias já aponta para o mesmo id.
5. **Metadados de cada variável tocada:**
   - `scopes` vêm sempre do payload.
   - `description`: se a variável é **nova**, recebe a descrição completa do payload. Se **já existe**, só a linha `Valor:` é trocada, usando `withValueLine(descAtualNoFigma, valueLine(set, layer, name))`. As demais linhas, como Uso, Não usar e Par, continuam as do Figma, que é a fonte da verdade.
   - `codeSyntax.WEB = var(--vx-…)`, com o nome de `cssVarName`, para o Dev Mode mostrar a var certa (**decisão do builder**, segue o shadcn).
6. **Remoções:** apenas os nomes em `remove.specific`, apenas na coleção `specific`, apenas se existirem, via `variable.remove()`.
7. **Estilos:** seção 6.4.
8. **Tipos incompatíveis:** se a variável existe com outro `resolvedType`, ou se o alias aponta para uma base ausente ou de outro tipo, o token é **pulado com aviso**, sem abortar. Isso é diferente do shadcn, que lança erro. Com cerca de 450 tokens, um erro isolado não deve bloquear o resto (**decisão do builder**).

9. **Releitura:** depois de escrever, o plugin roda o mesmo leitor do snapshot (seção 6.6) e coloca o DTCG resultante em `ack.tokens`. Os avisos da releitura se somam aos da escrita.

Contagens: `created`, `updated`, `unchanged` e `removed` para variáveis; `created`, `updated` e `unchanged` para estilos.

### 6.3 Remoções vindas do builder

Por padrão a sincronização é **upsert-only: nunca apaga**. A única exceção é a lista explícita `remove.specific`, e ela contém **apenas specifics que o designer apagou no builder**. A lista **não** é calculada por diferença com o Figma. Assim, um specific que só existe no Figma, por exemplo criado à mão lá, nunca é marcado para remoção.

O builder mantém essa lista como "lápides" (`removedSpecifics`, seção 7.1):

- Apagar um specific no builder adiciona o nome à lista.
- Recriar um specific com o mesmo nome tira o nome da lista.
- Um ack bem-sucedido tira da lista os nomes enviados.
- "Importar do Figma" e "Restaurar padrão" zeram a lista.

O envio automático **nunca** inclui remoções. Só o envio manual inclui, com as remoções destacadas no resumo.

### 6.4 Estilos (`vortex-styles.ts`)

- **Texto:**
  - Upsert por nome entre os estilos de texto locais.
  - Liga `fontFamily`, `fontSize`, `fontWeight`, `lineHeight` e `letterSpacing` às variáveis com os nomes do payload.
  - Antes, carrega a fonte resolvida: família do valor da variável `fontFamily` e estilo `"Regular"`, como no laboratório.
  - Se `loadFontAsync` falhar, aquele estilo é pulado com o aviso `Fonte "<família>" indisponível no Figma: estilo "<nome>" não foi atualizado`.
  - Estilo novo recebe `fontName` dessa fonte antes das ligações.
- **Efeito:**
  - Upsert por nome.
  - Um `DROP_SHADOW` cujos `offsetX`, `offsetY`, `radius` (= blur), `spread` e `color` são ligados com `figma.variables.setBoundVariableForEffect`, seguido de `style.effects = [effect]`.
- **Comparação e descrição:**
  - "Inalterado" significa que todas as ligações já apontam para os mesmos ids.
  - `description` do estilo só é escrita quando o estilo é novo. A linha `Valor:` dos estilos existentes pode ficar desatualizada. Isso é aceito nesta fase porque `describe.ts` não tem `valueLine` para estilos e os valores reais estão nas ligações (**decisão do builder**).
- **Escopo:** estilos não são apagados nesta fase.

### 6.5 Avisos (`warnings` do ack)

São strings em pt-BR, deduplicadas, com no máximo 50 entradas e um sufixo "+N avisos" quando passar disso. Casos:

- tipo incompatível;
- alias para base ausente;
- fonte indisponível;
- variável em `remove.specific` que não existe;
- coleção encontrada com nome igual porém como extensão (é ignorada).

### 6.6 Snapshot (`get-tokens-snapshot`)

Lê as três coleções e os estilos e monta o `RawFigmaExport`:

- aliases viram nomes;
- composta vira `{composite}`;
- valores literais da base viram cor, número ou string;
- as ligações dos estilos viram nomes de variável.

Se não houver `base` ou `semantic`, responde `error { code: "no-collection" }` com a mensagem "Este arquivo ainda não tem os tokens Vortex — use Enviar para o Figma". Um semantic ou specific cujo valor não seja alias (literal digitado no Figma) é omitido do snapshot, porque o modelo exige alias, e entra em `warnings`. O diálogo de importação lista esses avisos.

### 6.7 `code.ts` e `ui.ts`

- `code.ts` ganha `case "upsert-tokens"` e `case "get-tokens-snapshot"` na mesma fila serializada (`enqueue`).
- A janela do plugin mostra o último envio, seja shadcn ou Vortex: "Vortex · 12 atualizadas · 3 avisos" e o horário.
- `ui.ts` repassa os tipos novos e, para Vortex, mostra o texto "aplicando…".
- Tamanho da janela, URL do relay e manifest não mudam.

### 6.8 Bundle

O plugin importa de `@token-bridge/tokens` apenas o que precisa: `parseDtcg`, `toDtcg`, `toFigmaExport`, `fromFigmaExport`, `valueLine`, `withValueLine`, `cssVarName` e `isDisabled`. O seed precisa sair do caminho de import desses módulos, por exemplo movendo `loadSeed` para `seed.ts`, reexportado pelo `index.ts` mas fora de `dtcg.ts`. Isso **não pode mudar** a API pública usada pelo `web-mui`. O critério de aceite é que `dist/code.js` não contenha o seed: fica abaixo de 150 KB e um teste ou script verifica isso.

## 7. Builder (`apps/web-mui`)

### 7.1 Estado

O store ganha estes campos (nenhum deles é persistido no rascunho):

- `relay`: o estado do socket e o `StatusPayload`, vindos de um cliente WS copiado de `apps/web/src/lib/relay.ts`. São o mesmo protocolo e a mesma reconexão, com timeout configurável por request.
- `synced: TokenSet | null`: o último estado real do Figma. Vem do snapshot da abertura, de um import ou de `ack.tokens`. Para envios que caíram na fila ou estouraram o timeout do builder, vem de `GET /tokens.json`, buscado quando `status.lastTokens.at` muda. Serve só para o resumo e o banner; não decide remoções.
- `removedSpecifics: string[]`: as lápides da seção 6.3. São persistidas junto com o rascunho em `vortex-builder:removed-specifics:v1`.
- `openingSnapshot: "pending" | "resolved"`: indica se o snapshot da abertura já foi resolvido. Vira `resolved` quando não há diferença, quando o banner é respondido, quando o Figma não tem tokens (`no-collection`) ou quando o plugin está offline na abertura.
- `autoSend: boolean`: persistido em `localStorage` (`vortex-builder:auto-send:v1`), padrão `false`.
- `sync`: o estado do envio em curso e o último resultado (ack ou erro).

### 7.2 Diferença entre conjuntos

`diffSets(from, to)`, em `packages/tokens`, devolve por camada (`base`, `semantic`, `specific`) as listas `added`, `changed` e `removed`, mais estilos alterados. Ignora `disabledGroups` e compara valores. Sombras e cores compostas são comparadas campo a campo. Essa função serve ao resumo do envio, ao banner de importação e à lista de remoções.

### 7.3 Interface

O cabeçalho ganha, à esquerda de "Avisos":

- **Pílula de status do Figma:**
  - `Figma conectado` (verde);
  - `Figma offline` (cinza), quando há relay mas não há plugin;
  - `Relay offline` (vermelho);
  - `Na fila`, quando há envio aguardando o plugin.
- **Botão "Enviar para o Figma"**, que abre um diálogo com:
  - o resumo `diffSets(synced, set)`: contagem por camada e lista expansível de nomes;
  - remoções de specific destacadas (apenas as lápides), cada uma com checkbox marcado por padrão, para o designer poder desmarcar;
  - se `synced` for nulo: "Estado do Figma desconhecido: tudo será enviado";
  - o toggle **"Envio automático"**;
  - o botão "Enviar".

  Com o plugin offline, o envio vai para a fila do relay, como no shadcn, e o diálogo informa "Na fila: será aplicado quando o plugin reconectar".
- **Resultado:** um Snackbar com as contagens. Quando há avisos, o Snackbar tem um link "ver avisos", que abre um diálogo com a lista. Os avisos do Figma **não** entram na gaveta de avisos das regras. Erros aparecem no Snackbar com a mensagem do plugin; `mode-limit` usa um texto explicando o plano Professional+.
- **"Importar do Figma"** fica no menu de Exportar, como item novo ao lado de "Importar DTCG". A ação:
  1. pede o snapshot;
  2. mostra `diffSets(set, snapshot)` num diálogo de confirmação;
  3. substitui o `set` do rascunho pelo snapshot, **mantendo os `disabledGroups` locais**, porque eles não existem no Figma (**decisão do builder**);
  4. atualiza `synced`.

  Tokens do Figma que fogem do vocabulário aparecem nos avisos das regras existentes (naming/structure).
- **Banner de abertura:** quando o socket abre e o status diz que o plugin está conectado, o builder pede o snapshot **uma vez por carregamento**. Se `diffSets(set, snapshot)` não estiver vazio, aparece um `Alert` no topo da vitrine: "O Figma tem N diferenças em relação ao seu rascunho", com os botões "Importar do Figma" e "Manter meu rascunho". "Manter" fecha o banner e grava `synced = snapshot`, para que o próximo envio mostre corretamente o que vai mudar. Se não houver diferença, nada aparece e `synced = snapshot`.
- **Envio automático:** com o toggle ligado, cada mudança de `set` agenda um envio com debounce de 2000 ms. Não inclui remoções e não abre diálogo. Para não sobrescrever edições feitas no Figma sem aviso, ele **só envia quando**:
  - `openingSnapshot` está `resolved`;
  - o plugin está **conectado**. O envio automático nunca vai para a fila offline; só o envio manual vai.

  Se alguma dessas condições impedir o envio, a mudança fica pendente e é enviada quando a condição passar a valer. O resultado aparece no Snackbar e os erros não desligam o toggle.
- **Timeout no builder:** se o envio manual estourar 35 s, o Snackbar diz "Sem resposta do plugin ainda; o status avisará quando aplicar". Quando `lastTokens.at` mudar, o builder atualiza `synced` via `GET /tokens.json`.

### 7.4 Payload enviado

`{ tokens: toDtcg(set), remove: { specific: [...marcados] }, muiModule: toMuiModule(set) }`. O `toMuiModule` já existe em `apps/web-mui/src/export/mui-module.ts`.

## 8. Relay (`apps/relay`)

- `PLUGIN_BOUND` ganha `upsert-tokens` e `get-tokens-snapshot`; `PLUGIN_REPLIES` ganha `tokens-snapshot`.
- **Validação:** `upsert-tokens` passa por `parseDtcg(payload.tokens)`. Uma `TokenFormatError` vira `error { code: "invalid" }`, como `validateTheme` faz hoje. Se `remove.specific` existir, precisa ser uma lista de strings.
- **Repasse ao plugin:** o relay envia o envelope **sem `muiModule`**.
- **Fila offline:** um espaço separado para o último `upsert-tokens` (`queuedTokens`), com a mesma lógica do `queuedTheme`: substitui o anterior e responde `plugin-offline` ao remetente substituído. O status expõe `tokensQueued`.
- **Persistência do confirmado:** o relay grava `<dataDir>/last-tokens.json` (`{ at, tokens, muiModule? }`) sempre que receber do plugin:
  - um `ack` com `for: "upsert-tokens"`, usando `ack.tokens`. A origem não importa: pode ser conhecida, vinda da fila ou de um pedido cujo remetente já desistiu;
  - um `tokens-snapshot`, usando `tokens`.

  O `muiModule` vem do payload enviado. O relay o guarda por id de mensagem até o ack chegar, e um snapshot preserva o `muiModule` anterior. O módulo MUI resolve quase tudo via `var(--vx-…)`, então pequenas diferenças entre o enviado e o real só afetam os valores de paleta das "Lacunas" (**decisão do builder**). Depois de gravar, o relay faz broadcast de status com `lastTokens.at` novo. O `dataDir` padrão é `apps/relay/data/`, que entra no `.gitignore`, e é configurável em `RelayOptions` para os testes. No boot, carrega o arquivo se existir. Se estiver corrompido, registra no log e ignora.
- **Rotas HTTP novas (GET)** sobre o último confirmado. Retornam 404 com mensagem se ainda não houver nada:

  | Rota | Conteúdo |
  |---|---|
  | `/tokens.json` | DTCG |
  | `/tokens.css` | `toCss` |
  | `/tokens.tailwind.css` | `toTailwind` |
  | `/tokens.mui.ts` | `muiModule`, ou 404 "módulo MUI não enviado" |

  Todas com `access-control-allow-origin: *` e o `content-type` adequado.
- **Timeout:** como hoje, o relay **não** aplica timeout a pedidos via WebSocket. O pedido fica pendente até o plugin responder ou desconectar. Não há rota HTTP de envio de tokens nesta fase. O timeout vive no cliente do builder: 35 s no `upsert-tokens` e 15 s no snapshot. Um ack que chega depois do timeout do builder continua sendo persistido, pela regra acima.
- `/theme`, `/snapshot`, `/status` e o fluxo shadcn não mudam. O 404 passa a listar também as rotas novas.

## 9. Testes

- **tokens:**
  - round-trip `fromFigmaExport(toFigmaExport(seed))` igual ao seed;
  - `toFigmaExport` omite grupos desligados;
  - `diffSets` cobre adição, mudança, remoção, composta e estilos;
  - a API pública continua igual depois da mudança do seed.
- **plugin**, com o `fake-figma` ampliado para coleções múltiplas, alias, composta, `description`, `scopes`, `codeSyntax`, `variable.remove`, estilos de texto e efeito, `loadFontAsync` (que pode falhar por família) e `setBoundVariableForEffect`:
  1. enviar o seed num arquivo vazio cria 3 coleções com os modos certos, e o snapshot devolve o seed (round-trip pelo Figma falso);
  2. o segundo envio idêntico retorna tudo `unchanged` sem nenhum `setValueForMode`;
  3. `maxModes: 1` gera `mode-limit` e deixa o arquivo como estava, com zero coleções novas;
  4. variável existente mantém o id ao ser atualizada e tem só a linha `Valor:` trocada;
  5. `remove.specific` apaga só aquele specific;
  6. fonte indisponível gera aviso, e o resto é aplicado;
  7. tipo incompatível gera aviso, e o resto é aplicado;
  8. o fluxo shadcn segue passando nos testes atuais;
  9. o bundle `dist/code.js` não contém o seed.
- **relay:**
  - roteia `upsert-tokens`, `get-tokens-snapshot` e `tokens-snapshot`;
  - DTCG inválido gera `invalid`;
  - `muiModule` não chega ao plugin;
  - a fila offline de tokens fica independente da de tema;
  - ack grava `last-tokens.json` em `dataDir` temporário com `ack.tokens`, e não com o payload enviado;
  - ack tardio e ack vindo da fila também gravam;
  - `tokens-snapshot` grava e preserva o `muiModule` anterior;
  - as rotas GET servem os 4 formatos e retornam 404 antes do primeiro ack;
  - o boot recarrega o arquivo.
- **web-mui**, com um relay falso injetado no cliente:
  - pílula de status nos 4 estados;
  - diálogo de envio com resumo e remoções desmarcáveis;
  - payload montado corretamente;
  - Snackbar de ack com avisos;
  - banner de abertura aparece só quando há diferença;
  - "Manter meu rascunho" atualiza `synced`;
  - import mantém `disabledGroups`;
  - lápides: apagar um specific o adiciona, recriar o remove, ack limpa, import zera;
  - um specific que só existe no Figma nunca aparece como remoção;
  - envio automático com debounce e sem remoções;
  - envio automático segura enquanto o snapshot da abertura estiver pendente ou o plugin offline;
  - mudança de `lastTokens.at` atualiza `synced`.
- **plugin (adicional):** `ack.tokens` reflete o arquivo, então um token pulado por tipo incompatível não aparece nele.

## 10. Verificação manual (quando houver arquivo pago editável)

1. `pnpm dev`, depois o plugin aberto no arquivo, depois o builder em `:5174`.
2. Envio no arquivo vazio: conferir as 3 coleções, os modos, as compostas das sombras e os 12 estilos de texto e 2 de efeito ligados.
3. Na duplicata do arquivo do laboratório:
   - mudar `brand-1` no builder e enviar;
   - conferir que os componentes da página "MUI — Biblioteca integrada" mudam de cor sem perder a ligação;
   - conferir que as descrições mantêm Uso/Par e só a linha `Valor:` muda.
4. Editar um alias no Figma, reabrir o builder e conferir que o banner aparece; importar.
5. Conferir que `curl localhost:3055/tokens.css` reflete o último envio.

Num arquivo Starter, o resultado esperado no passo 2 é o erro `mode-limit`, com o arquivo intacto.

## 11. Decisões do builder (para revisão do usuário)

- `codeSyntax.WEB` é escrito em todas as variáveis tocadas.
- Tipo incompatível ou alias quebrado gera aviso e o token é pulado, em vez de abortar o envio.
- Os `disabledGroups` locais são preservados no import.
- O envio automático nunca apaga e usa debounce de 2 s.
- Os avisos do Figma aparecem num diálogo próprio, não na gaveta de regras.
- "Confirmado" significa o estado real do Figma: o ack traz a releitura do arquivo, e o relay e os devs recebem isso.
- As remoções saem só das lápides do builder, nunca da diferença com o Figma.
- O envio automático espera o snapshot da abertura ser resolvido e o plugin estar conectado, e nunca vai para a fila.
- Sem timeout no relay para pedidos via WebSocket. O timeout fica no builder (35 s no envio, 15 s no snapshot), e ack tardio também é persistido.
- O `/tokens.mui.ts` vem do último módulo enviado.
- A linha `Valor:` das descrições de estilos existentes não é atualizada.
- "Importar do Figma" fica no menu de Exportar.
