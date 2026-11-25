# Token Bridge

Theme builder web (estilo ui.shadcn.com/themes) que atualiza em tempo real as Variables de um arquivo do Figma.

```
[web theme builder] ⇄ WS ⇄ [relay :3055] ⇄ WS ⇄ [plugin UI iframe] ⇄ postMessage ⇄ [plugin main → figma.variables]
                              ↑
                    HTTP POST /theme (agente / curl)
```

| Pacote | O quê |
| --- | --- |
| `packages/protocol` | Tipos do envelope e do tema, presets (bases/primárias), `oklch ⇄ sRGB` com `culori`, `themeToCss` |
| `apps/relay` | Node + `ws` na porta 3055: roteia por role, fila offline, API HTTP |
| `apps/plugin` | Plugin do Figma (esbuild). Main thread faz todo o acesso a `figma.variables`; a UI só faz a ponte WS ⇄ postMessage |
| `apps/web` | Vite + React + Tailwind v4 + shadcn/ui |

## Rodando

```bash
pnpm install
pnpm dev                       # relay (:3055) + web (http://localhost:5173)
pnpm --filter plugin build     # gera apps/plugin/dist/{code.js,ui.html}
```

No **Figma Desktop**: *Plugins → Development → Import plugin from manifest…* → `apps/plugin/manifest.json`, depois rode **Token Bridge** no arquivo. A pílula no topo da web fica verde ("Figma conectado").

Outros comandos: `pnpm test`, `pnpm typecheck`, `pnpm --filter plugin watch`, `pnpm examples` (regenera `examples/*.json`).

## Vortex × MUI builder

`apps/web-mui` é um laboratório para editar os tokens Vortex (base, semantic, specific) e ver o efeito em telas reais de MUI v7, nos modos claro e escuro.

```bash
pnpm dev     # http://localhost:5174 (a fonte Satoshi é baixada automaticamente)
```

O menu **Exportar** gera quatro arquivos, todos com os mesmos nomes de token do Figma:

| Arquivo | Conteúdo |
|---|---|
| `vortex.tokens.json` | Tokens em DTCG, para reimportar (*Importar JSON…*) |
| `vortex.css` | Variáveis CSS: `--vx-base-*` e `--vx-*`, com `:root, [data-mode="light"]` e `[data-mode="dark"]` |
| `vortex.tailwind.css` | Tema do Tailwind v4 (`@import "./vortex.css"` + `@theme`) |
| `vortex.mui.ts` | Tema MUI autônomo: importa só `@mui/material` e `./vortex.css`, e exporta `theme` e `vortexPalette` |

No `vortex.mui.ts`, a fonte Satoshi não vem embutida (licença): instale-a no app ou passe `{ fontUrl: "/caminho/Satoshi-Variable.woff2" }` como segundo argumento de `createVortexTheme`. Renderize `<CssBaseline />` para o `@font-face`, o `body`, o anel de foco e as regras de disabled valerem.

*Restaurar padrão do laboratório* volta ao seed e apaga o rascunho salvo no navegador. A sincronização com o Figma fica para a fase 2.

## Protocolo

Envelope: `{ id: string, type: string, payload?: any }`. Tipos em `packages/protocol/src/messages.ts`.

| type | direção | payload |
| --- | --- | --- |
| `hello` | cliente → relay | `{ role: "plugin" \| "web" \| "agent" }` (obrigatório antes de qualquer outra mensagem) |
| `status` | relay → web | `{ plugin: "connected" \| "disconnected", queued, lastApplied? }` |
| `upsert-theme` | web/agent → plugin | `Theme` |
| `get-snapshot` | web/agent → plugin | — |
| `snapshot` | plugin → origem | `Theme` |
| `ack` | plugin → origem | `{ theme, created, updated, unchanged, clamped: [{token, mode, from}], durationMs, replayed? }` |
| `error` | plugin/relay → origem | `{ code, message }`, com `code` ∈ `plugin-offline`, `timeout`, `invalid`, `mode-limit`, `figma`, `no-collection` |

`ack` e `error` sempre trazem o mesmo `id` da requisição.

### HTTP

```bash
curl -X POST localhost:3055/theme -d @examples/zinc.json   # 200 ack · 202 na fila · 400 inválido · 504 timeout (5s)
curl localhost:3055/snapshot                               # tema atual lido do Figma
curl localhost:3055/status
```

## Mapeamento no Figma

- Coleção `shadcn/theme` com modos `light` e `dark`. O modo padrão é renomeado para `light`.
- `color/<token>` (COLOR) para os 31 tokens, com code syntax WEB `var(--<token>)`.
- `radius/base` (FLOAT, px = rem × 16), com escopo `CORNER_RADIUS`.
- Upsert idempotente por nome. O main thread serializa as requisições, porque dois upserts concorrentes criariam duplicatas. Valores iguais (dentro de meio passo de 8 bits) não são reescritos, então reaplicar o mesmo tema dá `updated: 0`.
- Se o plano não permitir o segundo modo, a resposta é `error` com `code: "mode-limit"`. Uma coleção recém-criada é removida nesse caso, para não deixar lixo.

## Decisões e ressalvas

- **Gamut.** Várias cores do shadcn/Tailwind v4 (destructive, chart-*, primárias coloridas) foram calibradas para P3 e ficam fora do sRGB. Elas passam pelo gamut mapping do CSS Color 4 (`toGamut("rgb","oklch")`) e aparecem em `ack.clamped`. Cores a menos de 0.002 da borda são cortadas sem aviso, porque a diferença é invisível.
- **Snapshot.** Volta como `oklch()` com 4 casas em L e C. Com 3 casas, perto da borda do gamut o arredondamento move um canal em ~2/255. Aliases (`VARIABLE_ALIAS`) são resolvidos.
- **Fila offline.** Só o último `upsert-theme` fica guardado. Quem enviou o tema substituído recebe `error plugin-offline`. Pelo HTTP, a resposta é `202` na hora, sem esperar os 5s, e o tema é aplicado quando o plugin reconectar. O ack desse replay vem com `replayed: true`.
- **Uma instância de plugin.** Se um segundo plugin conectar, o relay fecha o anterior (código 4000), e esse não tenta reconectar.
- **Auto-envio.** Só dispara em edições do usuário, com debounce de 150ms. Abrir a página ou importar do Figma não sobrescreve o arquivo.
