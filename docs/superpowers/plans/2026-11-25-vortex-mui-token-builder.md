# Vortex × MUI Token Builder (fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um pacote de tokens Vortex (base → semantic → specific, regras, exports) e um app web MUI onde o usuário monta o tema e vê telas MUI reagirem ao vivo.

**Architecture:** `packages/tokens` é TypeScript puro: modelo, resolução, regras (só avisos), edições puras e geradores (DTCG, CSS vars, Tailwind, valores de palette MUI). `apps/web-mui` escreve as variáveis `--vx-*` num stylesheet de runtime e cria o tema MUI uma vez, com `styleOverrides` que leem `var(--vx-…)`. A `palette` do MUI recebe valores resolvidos só para as Lacunas.

**Tech Stack:** pnpm workspace, TypeScript (ESM, imports com sufixo `.ts`), vitest, culori, Vite, React 19, MUI v7 + Emotion, @mui/icons-material, @testing-library/react + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-25-vortex-mui-token-builder-design.md` (cada task cita a seção). Documentação Vortex em `docs/vortex/` (gerada na Task 1).

## Global Constraints

- Nomes de token idênticos ao Figma (`text/on-action-primary`). Fora do Figma muda só a forma: `/` → `-` em CSS, `.` em caminhos DTCG.
- Nenhum componente nem override MUI lê variável `--vx-base-*`. Só semantic e specific (anti-objetivo da spec §3).
- Regras só geram avisos. Nenhuma edição troca referência automaticamente.
- CSS: base em `--vx-base-<nome>`, semantic/specific em `--vx-<nome>`. Medidas em rem (px/16), exceto `border-width` em px. `opacity` em 0–1. `font-weight` sem unidade.
- Seletores de modo: `:root, [data-mode="light"]` e `[data-mode="dark"]` (constante `MODE_ATTR = "data-mode"`).
- Copy da UI em português do Brasil.
- `apps/web-mui` roda na porta 5174. Pacote novo: `@token-bridge/tokens`.
- `packages/tokens` não importa React nem MUI.
- `apps/web` (shadcn), `apps/relay`, `apps/plugin` e `packages/protocol` não mudam, exceto o script `dev` da raiz.

## Review Focus

1. Referência para um token inexistente ou de grupo desligado (JSON importado, specific criado à mão): a resolução não lança erro, gera aviso `broken-ref` e o CSS cai para `initial`. Teste na Task 2 e na Task 6.
2. JSON importado malformado ou de outro formato: mensagem de erro, e o estado atual não muda. Teste na Task 3 (`parseDtcg` lança `TokenFormatError`) e na Task 14.
3. `localStorage` indisponível, cheio ou com rascunho corrompido: o app abre com o seed. Teste na Task 9.
4. Hex de marca extremo ou inválido (`#ffffff`, `#000000`, `#ffff00`, `"abc"`): `generateScale` devolve 11 passos válidos e monotônicos, ou lança `InvalidColorError` para o inválido. Teste na Task 4.
5. Specific com nome igual a um semantic ou specific existente: `upsertSpecific` recusa com erro. Teste na Task 7.

---

## File Structure

```
docs/vortex/                         # Task 1: documentação extraída (markdown)
packages/tokens/
  package.json, tsconfig.json
  seed/figma-export.json             # Task 1: export bruto do Figma (formato RawFigmaExport)
  seed/vortex.tokens.json            # Task 3: seed DTCG gerado
  scripts/build-seed.ts              # Task 3
  src/index.ts                       # reexporta tudo
  src/types.ts                       # Task 2: tipos do modelo
  src/raw.ts                         # Task 2: RawFigmaExport → TokenSet
  src/groups.ts                      # Task 2: grupos, flexibilidade, grupos opcionais, refs válidas
  src/resolve.ts                     # Task 2: resolução por modo
  src/dtcg.ts                        # Task 3
  src/color.ts                       # Task 4: contraste, escala, distância
  src/rules/contrast.ts              # Task 5
  src/rules/par.ts                   # Task 5: parsing da linha "Par:"
  src/rules/structure.ts             # Task 6
  src/rules/naming.ts                # Task 6
  src/rules/index.ts                 # Task 5/6: validate()
  src/edits.ts                       # Task 7
  src/describe.ts                    # Task 7: linha "Valor:"
  src/export/css.ts                  # Task 8
  src/export/tailwind.ts             # Task 8
  src/export/mui-palette.ts          # Task 8
  test/*.test.ts
apps/web-mui/
  package.json, tsconfig.json, vite.config.ts, index.html
  public/fonts/Satoshi-Variable.woff2
  src/main.tsx, src/App.tsx
  src/state/store.ts                 # Task 9
  src/runtime/sheet.ts               # Task 9
  src/theme/createVortexTheme.ts     # Task 9 (base) + Task 10 (overrides)
  src/theme/overrides/*.ts           # Task 10
  src/fonts.ts                       # Task 9
  src/shell/Header.tsx               # Task 9
  src/showcase/{Dashboard,Signup,Settings,Overlays}.tsx, Spot.tsx, spots.ts  # Task 10–11
  src/editor/{BaseTab,SemanticTab,SpecificTab,WarningsDrawer}.tsx           # Task 12–13
  src/export/{ExportMenu.tsx,mui-module.ts,download.ts}                     # Task 14
  test/*.test.ts(x)
```

---

### Task 1: Extrair o seed e a documentação do Figma

**Executor: a sessão principal**, que tem o Figma MCP autenticado. Não delegar a um subagent sem acesso ao MCP.

**Files:**
- Create: `packages/tokens/seed/figma-export.json`
- Create: `docs/vortex/01-comece-aqui.md` … `docs/vortex/10-configurar-com-ia.md`, `docs/vortex/mui-integracao.md`

**Interfaces:**
- Produces: o arquivo `figma-export.json` no formato abaixo, consumido por `fromFigmaExport` (Task 2). O plugin da fase 2 deve emitir o mesmo formato.

```ts
interface RawFigmaExport {
  fileKey: string;            // "hXapRD3m5N74rS4yYwEKRJ"
  exportedAt: string;         // ISO
  collections: Array<{
    name: "base" | "semantic" | "specific";
    modes: string[];          // ["value"] | ["light","dark"]
    variables: Array<{
      name: string;
      type: "COLOR" | "FLOAT" | "STRING";
      scopes: string[];
      description: string;
      values: Record<string, RawValue>;   // chave = nome do modo
    }>;
  }>;
  textStyles: Array<{ name: string; description: string;
    bindings: { fontSize: string; lineHeight: string; fontWeight: string; letterSpacing: string; fontFamily: string } }>; // nomes de variável semantic
  effectStyles: Array<{ name: string; description: string;
    bindings: { offsetX: string; offsetY: string; blur: string; spread: string; color: string } }>;
}
type RawValue =
  | { alias: string }                                   // nome da variável alvo, ex. "neutral/900"
  | { color: { r: number; g: number; b: number; a: number } }
  | { number: number }
  | { string: string }
  | { composite: { color: string; opacity: string } };  // shadow/*/color
```

- [ ] **Step 1: Criar a sessão no Figma MCP** (`create_session`, fileKey `hXapRD3m5N74rS4yYwEKRJ`) e carregar os skills `figma:figma-use` e `figma:figma-spec`.
- [ ] **Step 2: Extrair cada coleção com `use_figma`** (uma chamada por coleção: base, semantic, specific), devolvendo `{ name, modes, variables }`. Aliases viram `{ alias: <nome do alvo> }`. Valores `{ color: alias, opacity: alias }` viram `composite`. Se o resultado for salvo em arquivo por ser grande, extraia com `jq '.[0].text | fromjson'`.
- [ ] **Step 3: Extrair os estilos** (`getLocalTextStylesAsync`, `getLocalEffectStylesAsync`) com `boundVariables` convertidos em nomes de variável.
- [ ] **Step 4: Montar e gravar `figma-export.json`.** Conferir: base 270 variáveis, semantic 184, specific 0, 12 text styles e 2 effect styles, `brand-1/600` = `#9246d7`.
- [ ] **Step 5: Salvar as seções da documentação.** Usar `figma.spec.getContent` nos spec blocks `237:130, 238:330, 238:622, 238:924, 238:1396, 238:1660, 238:7970, 238:8468, 238:9256, 238:8957` em `docs/vortex/NN-*.md`. Salvar os textos do frame `2005:3` (página "MUI — Biblioteca integrada": Correspondências e Lacunas) em `docs/vortex/mui-integracao.md`.
- [ ] **Step 6: Commit**

```bash
git add packages/tokens/seed/figma-export.json docs/vortex
git commit -m "chore(tokens): snapshot Vortex variables, styles and docs from Figma"
```

---

### Task 2: Modelo de tokens, import do export bruto e resolução

**Files:**
- Create: `packages/tokens/{package.json,tsconfig.json}`, `src/{types,raw,groups,resolve,index}.ts`
- Test: `packages/tokens/test/model.test.ts`

**Interfaces:**
- Consumes: `figma-export.json` (Task 1).
- Produces:

```ts
// types.ts
export type Layer = "base" | "semantic" | "specific";
export type Mode = "light" | "dark";
export const MODES: readonly Mode[];
export type TokenType = "color" | "dimension" | "number" | "fontFamily" | "fontWeight";
export type Flex = "locked" | "adjustable" | "free";
export type CompositeRef = { color: string; opacity: string };   // nomes da base
export type AliasValue = string | CompositeRef;                   // string = nome da base
export interface TokenMeta { type: TokenType; scopes: string[]; description: string; flex: Flex }
export interface BaseToken extends TokenMeta { name: string; value: string | number } // cor = "#rrggbb" ou "#rrggbbaa"
export interface AliasToken extends TokenMeta { name: string; values: Record<Mode, AliasValue> }
export interface TextStyle { name: string; description: string; fontSize: string; lineHeight: string; fontWeight: string; letterSpacing: string; fontFamily: string }
export interface ShadowStyle { name: string; description: string; offsetX: string; offsetY: string; blur: string; spread: string; color: string }
export type OptionalGroup = "brand-2" | "brand-3" | "brand-4" | "data";
export interface TokenSet {
  base: Record<string, BaseToken>;
  semantic: Record<string, AliasToken>;
  specific: Record<string, AliasToken>;
  textStyles: TextStyle[]; shadowStyles: ShadowStyle[];
  disabledGroups: OptionalGroup[];
}
export type Resolved = { kind: "color"; hex: string; alpha: number } | { kind: "number"; value: number } | { kind: "string"; value: string } | { kind: "missing"; ref: string };

// raw.ts
export function fromFigmaExport(raw: RawFigmaExport): TokenSet;   // RawFigmaExport exportado daqui, igual à Task 1
// groups.ts
export function baseGroupOf(baseName: string): string;           // "brand-1/600" → "brand-1"
export function flexOfBase(name: string): Flex;                   // spec §5.2
export function allowedBaseGroups(layer: "semantic" | "specific", tokenName: string): string[]; // "Grupo certo", spec §6
export function isDisabled(set: TokenSet, layer: Layer, name: string): boolean; // §5.2: grupo opcional e dependentes
export const COLOR_PALETTES: readonly string[]; // brand-1..4, neutral, danger, warning, success, information
// resolve.ts
export function resolve(set: TokenSet, layer: Layer, name: string, mode: Mode): Resolved;
export function tokenKey(layer: Layer, name: string): string;    // "semantic:text/primary"
```

Mapeamento de tipo: COLOR → `color`; STRING → `fontFamily`; FLOAT em `font-weight` (base) ou `*/font-weight` (semantic) → `fontWeight`; FLOAT em `opacity` e `letter-spacing` → `number`; os demais FLOAT → `dimension` (px). Cores raw 0–1 → hex minúsculo, com alfa só se `a < 1`.

`allowedBaseGroups`: `text|icon|background|border` → `COLOR_PALETTES`; `data/*` → `data-1..6`; `space/*` e `shadow/*/{offset-x,offset-y,blur,spread}` → `space`; `radius/*` → `radius`; `border-width/*` → `border-width`; `opacity/*` → `opacity`; `typography/*/{font-size,line-height,font-weight,letter-spacing,font-family}` → o grupo de mesmo nome; `shadow/*/color` → `COLOR_PALETTES` (cor) + `opacity`.

Dependentes de grupo opcional: `brand-n` → `background/accent-n/*`, `text/on-accent-n-strong`, `icon/on-accent-n-strong`; `data` → base `data-1..6` e semantic `data/*`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
const set = fromFigmaExport(JSON.parse(readFileSync("seed/figma-export.json", "utf8")));
it("loads counts", () => { expect(Object.keys(set.base)).toHaveLength(270); expect(Object.keys(set.semantic)).toHaveLength(184); expect(set.textStyles).toHaveLength(12); expect(set.shadowStyles).toHaveLength(2); });
it("resolves by mode", () => {
  expect(resolve(set, "semantic", "text/primary", "light")).toEqual({ kind: "color", hex: "#1a1a1a", alpha: 1 });
  expect(resolve(set, "semantic", "text/primary", "dark")).toEqual({ kind: "color", hex: "#fafafa", alpha: 1 });
  expect(resolve(set, "semantic", "space/medium", "light")).toEqual({ kind: "number", value: 16 });
  expect(resolve(set, "semantic", "typography/body/font-family", "dark")).toEqual({ kind: "string", value: "Satoshi Variable" });
});
it("resolves composite shadow color", () => { expect(resolve(set, "semantic", "shadow/raised/color", "light")).toEqual({ kind: "color", hex: "#000000", alpha: 0.1 }); });
it("missing ref does not throw", () => {
  const s = structuredClone(set); s.semantic["text/primary"].values.light = "neutral/123";
  expect(resolve(s, "semantic", "text/primary", "light")).toEqual({ kind: "missing", ref: "neutral/123" });
});
it("flex and groups", () => {
  expect(flexOfBase("brand-1/500")).toBe("free"); expect(flexOfBase("neutral/500")).toBe("adjustable"); expect(flexOfBase("space/16")).toBe("locked");
  expect(allowedBaseGroups("semantic", "radius/small")).toEqual(["radius"]);
  expect(isDisabled({ ...set, disabledGroups: ["brand-2"] }, "semantic", "text/on-accent-2-strong")).toBe(true);
});
```

- [ ] **Step 2: Rodar.** `pnpm --filter @token-bridge/tokens test`. Esperado: FAIL (módulos inexistentes).
- [ ] **Step 3: Implementar** os arquivos acima. `package.json` copia o formato de `packages/protocol` (main/types/exports para `./src/index.ts`, scripts `test` e `typecheck`, dependência `culori`). Uma referência a um token desligado resolve como `missing`.
- [ ] **Step 4: Rodar os testes e o typecheck.** `pnpm install && pnpm --filter @token-bridge/tokens test && pnpm --filter @token-bridge/tokens typecheck`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(tokens): Vortex token model, Figma export import and resolution`

---

### Task 3: Formato DTCG e geração do seed

**Files:**
- Create: `packages/tokens/src/dtcg.ts`, `packages/tokens/scripts/build-seed.ts`, `packages/tokens/seed/vortex.tokens.json`
- Modify: `packages/tokens/package.json` (script `"seed": "tsx scripts/build-seed.ts"`)
- Test: `packages/tokens/test/dtcg.test.ts`

**Interfaces:**
- Consumes: `TokenSet`, `fromFigmaExport` (Task 2).
- Produces:

```ts
export class TokenFormatError extends Error {}
export function toDtcg(set: TokenSet): DtcgDocument;          // objeto JSON
export function parseDtcg(json: unknown): TokenSet;           // lança TokenFormatError
export function loadSeed(): TokenSet;                         // parseDtcg do seed/vortex.tokens.json (import JSON)
```

Layout (decidido aqui, spec §5.4):
- Raiz: `{ "base": {...}, "semantic": {...}, "specific": {...}, "styles": { "typography": {...}, "shadow": {...} }, "$extensions": { "vortex": { "version": 1, "disabledGroups": [] } } }`.
- Caminho = nome dividido por `/`.
- Token base: `{ "$type", "$value", "$description", "$extensions": { "vortex": { "scopes", "flex" } } }`. Os valores de `$value` são: cor como hex; `dimension` como `{ "value": 16, "unit": "px" }`; `number`/`fontWeight` como número; `fontFamily` como string.
- Token semantic/specific: `"$value"` = alias do modo light (`"{base.neutral.900}"`), e `"$extensions.vortex.modes"` = `{ "light": "{…}", "dark": "{…}" }`. Para composto: `{ "color": "{base.neutral.1000}", "opacity": "{base.opacity.10}" }` em cada modo, e `$value` = o light.
- Estilos: `styles.typography.body.medium` = `{ "$type": "typography", "$value": { "fontFamily": "{semantic.typography.body.font-family}", "fontSize": "{semantic.typography.body.medium.font-size}", "fontWeight": …, "lineHeight": …, "letterSpacing": … }, "$description" }`. Shadow igual, com `$type: "shadow"` e campos `offsetX, offsetY, blur, spread, color`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it("round-trips the seed", () => { const set = fromFigmaExport(raw); expect(parseDtcg(JSON.parse(JSON.stringify(toDtcg(set))))).toEqual(set); });
it("writes aliases, not values", () => { const d = toDtcg(fromFigmaExport(raw)) as any;
  expect(d.semantic.text.primary.$extensions.vortex.modes).toEqual({ light: "{base.neutral.900}", dark: "{base.neutral.50}" });
  expect(d.base.space["16"].$value).toEqual({ value: 16, unit: "px" }); });
it("rejects foreign json", () => { expect(() => parseDtcg({ hello: 1 })).toThrow(TokenFormatError); expect(() => parseDtcg(null)).toThrow(TokenFormatError); });
it("seed file is current", () => { expect(loadSeed()).toEqual(fromFigmaExport(raw)); });
```

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar `toDtcg`, `parseDtcg` e `loadSeed`.** `parseDtcg` valida a presença de `base`, `semantic`, `specific` e `$extensions.vortex.version === 1`, além de cada alias no formato `{base.…}`. Uma mensagem em português descreve o primeiro problema. `build-seed.ts` lê `figma-export.json` e grava `vortex.tokens.json` com indentação de 2 espaços.
- [ ] **Step 4: Gerar o seed e rodar.** `pnpm --filter @token-bridge/tokens seed && pnpm --filter @token-bridge/tokens test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(tokens): DTCG serialization and generated seed`

---

### Task 4: Matemática de cor (contraste, escala, distância)

**Files:**
- Create: `packages/tokens/src/color.ts`
- Test: `packages/tokens/test/color.test.ts`

**Interfaces:**
- Produces:

```ts
export class InvalidColorError extends Error {}
export const SCALE_STEPS: readonly [50,100,200,300,400,500,600,700,800,900,950];
export function contrastRatio(fg: string, bg: string): number;           // WCAG 2.x; hex com alfa é composto sobre bg
export function generateScale(hex: string): Record<(typeof SCALE_STEPS)[number], string>; // spec §5.5
export function deltaEOk(a: string, b: string): number;                  // culori differenceEuclidean("oklab")
export function hueOf(hex: string): number | undefined;                  // OKLCH, undefined se acromática
export function oklchLightness(hex: string): number;
```

`generateScale`: alvos de L (OKLCH) por passo, em ordem decrescente. O hex informado fica no passo cujo alvo de L é o mais próximo, e o croma é escalado em torno dele (menor nas pontas). Saída gamut-mapped (`toGamut("rgb","oklch")`), hex minúsculo, determinística. Os alvos exatos ficam a critério do implementador (spec §13).

- [ ] **Step 1: Escrever os testes que falham**

```ts
expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
expect(contrastRatio("#1a1a1a", "#ffffff")).toBeCloseTo(17.4, 0);
expect(contrastRatio("#00000080", "#ffffff")).toBeCloseTo(contrastRatio("#808080", "#ffffff"), 0);
for (const hex of ["#9246d7", "#ffffff", "#000000", "#ffff00", "#12cee4"]) {
  const s = generateScale(hex); const ls = SCALE_STEPS.map((k) => oklchLightness(s[k]));
  expect(ls.every((l, i) => i === 0 || l < ls[i - 1]!)).toBe(true);           // monotônico
  expect(Object.values(s).every((h) => /^#[0-9a-f]{6}$/.test(h))).toBe(true);
  expect(generateScale(hex)).toEqual(s);                                        // determinístico
}
expect(Object.values(generateScale("#9246d7"))).toContain("#9246d7");           // ancora o hex (in-gamut)
expect(() => generateScale("abc")).toThrow(InvalidColorError);
```

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.** Para `#ffffff` e `#000000`, o passo ancorado é o extremo, e os demais continuam estritamente monotônicos.
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat(tokens): contrast, palette scale generation and color distance`

---

### Task 5: Regras de contraste e motor de validação

**Files:**
- Create: `packages/tokens/src/rules/{par,contrast,index}.ts`
- Test: `packages/tokens/test/rules-contrast.test.ts`

**Interfaces:**
- Consumes: `resolve`, `isDisabled` (Task 2); `contrastRatio` (Task 4).
- Produces:

```ts
export type RuleId = "contrast-text" | "contrast-icon" | "contrast-control" | "contrast-focus" | "contrast-data"
  | "feedback-palette" | "wrong-group" | "size-order" | "line-height" | "focus-width" | "neutral" | "data-palettes"
  | "font-weight" | "specific-name" | "broken-ref" | "disabled-group-in-use";
export interface Warning { id: string; token: string /* tokenKey */; mode?: Mode; rule: RuleId; message: string; actual?: string; expected?: string; against?: string }
export interface ValidateOptions { fontWeights?: Record<string, number[]> }   // família → pesos disponíveis
export function validate(set: TokenSet, opts?: ValidateOptions): Warning[];
export function parsePar(description: string, known: (name: string) => boolean): string[]; // nomes semantic da linha "Par:"
```

`parsePar`: pega a linha que começa com `Par:` e extrai os nomes `[a-z0-9-]+(/[a-z0-9-]+)+` que existem (`known`). Se o texto contém "e seus estados" logo após um nome, adiciona `-hover` e `-pressed` quando eles existem. Retorna `[]` para `—`.

Regras desta task (spec §6). Em todas, os dois modos são avaliados, e tokens desligados e alvos `missing` são ignorados:
- `contrast-text`: `text/*` ≥ 4,5 contra cada `background/*` do seu Par.
- `contrast-icon`: `icon/*` ≥ 3 contra cada `background/*` do Par (o Par de `icon` é o de `text` de mesmo nome quando a descrição de `icon` não tiver um).
- `contrast-control`: `border/strong`, `border/selected` ≥ 3 contra `background/canvas` e `background/surface`.
- `contrast-focus`: `border/focus` ≥ 3 contra `background/canvas`, `/surface` e `/surface-raised`.
- `contrast-data`: `data/categorical-*` ≥ 3 contra `background/canvas` e `/surface`.
- `broken-ref`: referência que resolve para `missing` (qualquer camada).
- `message` em português, com `actual` = `"1.9:1"` e `expected` = `"4.5:1"`; `against` = nome do fundo.

- [ ] **Step 1: Escrever os testes que falham**

```ts
const seed = loadSeed();
it("parses Par", () => { expect(parsePar("Par: background/canvas, background/surface\nFlexibilidade: x", n => n in seed.semantic)).toEqual(["background/canvas", "background/surface"]); });
it("seed baseline", () => { expect(validate(seed).filter(w => w.rule.startsWith("contrast"))).toEqual(SEED_CONTRAST_BASELINE); });
it("yellow brand breaks on-action-primary (doc example)", () => {
  const s = structuredClone(seed); s.base["brand-1/600"].value = "#facc15";
  const w = validate(s).find(w => w.token === "semantic:text/on-action-primary" && w.mode === "light" && w.against === "background/action/primary");
  expect(w?.rule).toBe("contrast-text"); expect(Number(w!.actual!.split(":")[0])).toBeLessThan(4.5);
});
it("broken ref", () => { const s = structuredClone(seed); s.semantic["border/subtle"].values.dark = "neutral/123";
  expect(validate(s)).toContainEqual(expect.objectContaining({ rule: "broken-ref", token: "semantic:border/subtle", mode: "dark" })); });
```

`SEED_CONTRAST_BASELINE` começa como `[]`. Se o seed do laboratório violar alguma regra, confirme o cálculo à mão, documente cada item como `// padrão do Figma viola: …` e coloque-o na constante.

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.** O `id` do aviso é `${rule}:${token}:${mode ?? ""}:${against ?? ""}` (estável, usado como chave na UI).
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat(tokens): contrast rules driven by the Par lines`

---

### Task 6: Regras estruturais e de nome de specific

**Files:**
- Create: `packages/tokens/src/rules/{structure,naming}.ts`
- Modify: `packages/tokens/src/rules/index.ts` (inclui as novas regras em `validate`)
- Test: `packages/tokens/test/rules-structure.test.ts`

**Interfaces:**
- Consumes: `validate`, `Warning`, `RuleId` (Task 5); `allowedBaseGroups`, `baseGroupOf` (Task 2); `deltaEOk`, `hueOf`, `oklchLightness` (Task 4).
- Produces: as regras abaixo dentro de `validate`, mais `export function checkSpecificName(name: string): Warning[]` (usado pelo formulário da Task 13; `token` = `specific:<name>`).

Regras (spec §6, valores exatos):
- `feedback-palette`: nome sem `on-` que contém o segmento `danger|warning|success|information` precisa referenciar a paleta de mesmo nome.
- `wrong-group`: o grupo da referência fora de `allowedBaseGroups`.
- `size-order`: `space`: `none ≤ xx-small ≤ x-small ≤ small ≤ medium ≤ large ≤ x-large ≤ xx-large`; `radius`: a mesma ordem, com `full` fora.
- `line-height`: esperado = múltiplo de 4 mais próximo de `size × 1.3` (display, heading) ou `× 1.5` (body, label), com empate para cima.
- `focus-width`: `border-width/focus` ≥ 2.
- `neutral`: `neutral/0` = `#ffffff`, `neutral/1000` = `#000000`, L estritamente decrescente em 0, 50…950, 1000.
- `data-palettes` (se `data` ativo): os passos `/600` de `data-1..6` dois a dois com `deltaEOk` ≥ limiar, e matiz a mais de um limiar da matiz `/600` de `danger|warning|success|information`. Os limiares ficam a critério do implementador, com o seed passando e os testes abaixo falhando.
- `font-weight`: peso resolvido de `typography/*/font-weight` ausente em `opts.fontWeights[família]` (só se a família estiver no mapa).
- `disabled-group-in-use`: specific que referencia base de grupo desligado.
- `specific-name`: formato rígido `^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*){1,2}$` (até 4 partes em `typography`/`shadow`). O primeiro nível precisa estar no vocabulário de propriedades (Apêndice A da spec). Também é rejeitado o nome igual a um semantic existente. Avisos heurísticos (mesmo `rule`, `message` diferente): palavra fora do vocabulário do Apêndice A, palavra de cor (lista PT/EN + nomes de paleta) e palavra de componente (lista de nomes de componentes MUI em minúsculas: `button`, `card`, `chip`, `dialog`, `menu`, `tab`, `table`, `tooltip`, `avatar`, `badge`, `alert`, `snackbar`, `drawer`, `list`, `input`, `field`).

- [ ] **Step 1: Escrever os testes que falham**

```ts
it("seed has no structural warnings", () => { expect(validate(seed).filter(w => !w.rule.startsWith("contrast"))).toEqual([]); });
it("feedback palette", () => { const s = clone(); s.semantic["text/danger"].values.light = "brand-1/700"; expect(rules(s)).toContain("feedback-palette"); });
it("wrong group", () => { const s = clone(); s.semantic["space/medium"].values.light = "radius/16"; expect(rules(s)).toContain("wrong-group"); });
it("size order", () => { const s = clone(); s.semantic["space/small"].values.light = "space/20"; expect(rules(s)).toContain("size-order"); });
it("line height", () => { const s = clone(); s.semantic["typography/body/medium/line-height"].values.light = "line-height/20"; expect(rules(s)).toContain("line-height"); });
it("focus width", () => { const s = clone(); s.semantic["border-width/focus"].values.dark = "border-width/1"; expect(rules(s)).toContain("focus-width"); });
it("neutral", () => { const s = clone(); s.base["neutral/0"].value = "#fefefe"; expect(rules(s)).toContain("neutral"); });
it("data distinct", () => { const s = clone(); for (const k of STEPS) s.base[`data-2/${k}`].value = s.base[`data-1/${k}`].value; expect(rules(s)).toContain("data-palettes"); });
it("data vs status hue", () => { const s = clone(); for (const k of STEPS) s.base[`data-1/${k}`].value = s.base[`danger/${k}`].value; expect(rules(s)).toContain("data-palettes"); });
it("font weight", () => { expect(validate(seed, { fontWeights: { "Satoshi Variable": [400, 500] } }).some(w => w.rule === "font-weight")).toBe(true); });
it("specific names", () => {
  expect(checkSpecificName("background/reading").filter(w => w.message.startsWith("Formato"))).toEqual([]);
  expect(checkSpecificName("Background/Reading")[0]?.rule).toBe("specific-name");
  expect(checkSpecificName("background/action/primary/hover").length).toBeGreaterThan(0);
  expect(checkSpecificName("background/sepia").map(w => w.message).join()).toMatch(/cor/);
  expect(checkSpecificName("background/reader-card").map(w => w.message).join()).toMatch(/componente/);
});
```

(`rules(s) = validate(s).map(w => w.rule)`; `clone()` = `structuredClone(seed)`; `STEPS` = `SCALE_STEPS`.) Prefixo das mensagens de formato: `"Formato:"`.

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat(tokens): structural and naming rules`

---

### Task 7: Edições puras e linha "Valor"

**Files:**
- Create: `packages/tokens/src/{edits,describe}.ts`
- Test: `packages/tokens/test/edits.test.ts`

**Interfaces:**
- Consumes: Task 2 (tipos, `isDisabled`), Task 4 (`generateScale`), Task 6 (`checkSpecificName`).
- Produces (todas retornam um **novo** `TokenSet`, sem mutar):

```ts
export class EditError extends Error {}
export function setBaseValue(set: TokenSet, name: string, value: string | number): TokenSet;   // EditError se flex === "locked"
export function applyScale(set: TokenSet, palette: string, hex: string): TokenSet;            // gera 50–950; neutral mantém /0 e /1000
export function setRef(set: TokenSet, layer: "semantic" | "specific", name: string, mode: Mode, ref: AliasValue): TokenSet;
export function setGroupEnabled(set: TokenSet, group: OptionalGroup, enabled: boolean, seed: TokenSet):
  { ok: true; set: TokenSet } | { ok: false; blockedBy: string[] };   // religar restaura do seed; desligar bloqueia se specific depende (spec §5.2)
export function upsertSpecific(set: TokenSet, token: AliasToken): TokenSet;  // EditError se o nome é de um semantic, ou se checkSpecificName dá erro "Formato:"
export function removeSpecific(set: TokenSet, name: string): TokenSet;
// describe.ts
export function valueLine(set: TokenSet, layer: Layer, name: string): string;
export function withValueLine(description: string, line: string): string;    // troca ou acrescenta "Valor: …"
```

Formatos de `valueLine` (seção 05):
- cor semantic: `neutral/900 | neutral/50` (um só nome se os modos são iguais);
- medida: `space/16 (16 px · 1 rem)`;
- `border-width`: `border-width/2 (2 px)`;
- peso: `font-weight/400 (400 · Regular)` (100 Thin, 200 ExtraLight, 300 Light, 400 Regular, 500 Medium, 600 SemiBold, 700 Bold, 800 ExtraBold, 900 Black);
- composto: `neutral/1000 a opacity/10 (10%)`;
- cor base: `#9246D7` (maiúsculo);
- medida base: `16 px · 1 rem`.

Toda edição reescreve a linha `Valor:` da descrição dos tokens afetados: o próprio token na base, ou o token de referência. Os semantic que apontam para um base editado não mudam de texto, porque o Valor deles é a referência.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it("locked base", () => { expect(() => setBaseValue(seed, "space/16", 20)).toThrow(EditError); });
it("does not mutate", () => { const s = setRef(seed, "semantic", "text/secondary", "light", "neutral/800"); expect(seed.semantic["text/secondary"].values.light).toBe("neutral/700"); expect(s.semantic["text/secondary"].description).toMatch(/^Valor: neutral\/800 \| neutral\/300$/m); });
it("scale", () => { const s = applyScale(seed, "brand-1", "#16a34a"); expect(Object.keys(s.base).filter(k => k.startsWith("brand-1/"))).toHaveLength(11); });
it("neutral keeps extremes", () => { const s = applyScale(seed, "neutral", "#78716c"); expect(s.base["neutral/0"].value).toBe("#ffffff"); expect(s.base["neutral/1000"].value).toBe("#000000"); });
it("toggle group blocked by specific", () => {
  const s = upsertSpecific(seed, spec("background/reading", "brand-2/50", "brand-2/900"));
  expect(setGroupEnabled(s, "brand-2", false, seed)).toEqual({ ok: false, blockedBy: ["background/reading"] });
});
it("re-enable restores seed", () => { const off = (setGroupEnabled(applyScale(seed, "brand-3", "#000000"), "brand-3", false, seed) as any).set; const on = (setGroupEnabled(off, "brand-3", true, seed) as any).set; expect(on.base["brand-3/600"].value).toBe(seed.base["brand-3/600"].value); });
it("specific collides with semantic", () => { expect(() => upsertSpecific(seed, spec("text/primary", "neutral/900", "neutral/50"))).toThrow(EditError); });
it("value lines", () => {
  expect(valueLine(seed, "semantic", "space/medium")).toBe("space/16 (16 px · 1 rem)");
  expect(valueLine(seed, "semantic", "border-width/strong")).toBe("border-width/2 (2 px)");
  expect(valueLine(seed, "semantic", "shadow/raised/color")).toBe("neutral/1000 a opacity/10 (10%)");
  expect(valueLine(seed, "semantic", "typography/body/medium/font-weight")).toBe("font-weight/400 (400 · Regular)");
});
```

(`spec(name, light, dark)` monta um `AliasToken` com `type: "color"`, `scopes: ["FRAME_FILL","SHAPE_FILL"]`, `flex: "free"` e a descrição com os seis rótulos, Situação "Proposto".)

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat(tokens): pure edit operations and value lines`

---

### Task 8: Exports CSS vars, Tailwind v4 e valores de palette MUI

**Files:**
- Create: `packages/tokens/src/export/{css,tailwind,mui-palette}.ts`
- Test: `packages/tokens/test/export.test.ts` (+ `__snapshots__`)

**Interfaces:**
- Consumes: Task 2 e Task 3.
- Produces:

```ts
export const MODE_ATTR = "data-mode";
export function cssVarName(layer: Layer, name: string): string;            // ("base","radius/full") → "--vx-base-radius-full"
export interface CssVarMap { root: Record<string, string>; light: Record<string, string>; dark: Record<string, string> }
export function cssVarMap(set: TokenSet): CssVarMap;                        // root = base + estilos compostos; light/dark = semantic+specific
export function toCss(set: TokenSet): string;
export function toTailwind(set: TokenSet, opts?: { inlineCss?: boolean }): string;
export interface MuiPaletteValues { primary: string; secondary: string | null; error: string; warning: string; info: string; success: string;
  textPrimary: string; textSecondary: string; backgroundDefault: string; backgroundPaper: string; divider: string }
export function muiPaletteValues(set: TokenSet, mode: Mode): MuiPaletteValues;   // hex resolvidos, mapeamento da spec §8
```

Regras de valor (spec §7):
- semantic → `var(--vx-base-…)`; ref `missing` → `initial`;
- dimension → `${px/16}rem`, exceto o grupo `border-width` em base e semantic, que fica em `${px}px`;
- `opacity` → `/100`;
- `fontFamily` → `"Satoshi Variable", system-ui, sans-serif`;
- composto → `rgb(from var(--vx-base-neutral-1000) r g b / var(--vx-base-opacity-10))`;
- vars de conveniência em `light`/`dark`: `--vx-shadow-raised: var(--vx-shadow-raised-offset-x) var(--vx-shadow-raised-offset-y) var(--vx-shadow-raised-blur) var(--vx-shadow-raised-spread) var(--vx-shadow-raised-color)` (idem `overlay`).

Tokens desligados não aparecem.
- `toCss`: um cabeçalho de comentário e três blocos: `:root { base }`, `:root, [data-mode="light"] { … }` e `[data-mode="dark"] { … }`.
- `toTailwind`: `@import "./vortex.css";` (ou o CSS inline), `@custom-variant dark (&:where([data-mode="dark"], [data-mode="dark"] *));` e `@theme inline { … }` só com semantic e specific: `--color-<nome>` para `text|icon|background|border|data`, `--spacing-<tamanho>`, `--radius-<tamanho>`, `--text-<papel>-<tamanho>` + `--text-<papel>-<tamanho>--line-height` + `--text-<papel>-<tamanho>--font-weight`, `--font-<papel>`, `--shadow-raised|overlay`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
expect(cssVarName("base", "radius/full")).toBe("--vx-base-radius-full");
const m = cssVarMap(seed);
expect(m.light["--vx-text-primary"]).toBe("var(--vx-base-neutral-900)");
expect(m.dark["--vx-text-primary"]).toBe("var(--vx-base-neutral-50)");
expect(m.root["--vx-base-space-16"]).toBe("1rem");
expect(m.root["--vx-base-border-width-0_5"]).toBe("0.5px");
expect(m.root["--vx-base-opacity-40"]).toBe("0.4");
expect(Object.keys(m.light).some(k => k.startsWith("--vx-base-"))).toBe(false);
expect(toCss(seed)).toMatchSnapshot(); expect(toTailwind(seed)).toMatchSnapshot();
expect(toTailwind(seed)).not.toMatch(/--color-base-/);
expect(muiPaletteValues(seed, "light")).toMatchObject({ primary: "#9246d7", textPrimary: "#1a1a1a", backgroundDefault: "#ffffff", divider: "#e6e6e6" });
expect(muiPaletteValues({ ...seed, disabledGroups: ["brand-2"] }, "light").secondary).toBeNull();
const off = cssVarMap({ ...seed, disabledGroups: ["data"] }); expect(off.light["--vx-data-categorical-1"]).toBeUndefined();
```

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.** `index.ts` reexporta tudo das Tasks 2–8.
- [ ] **Step 4: Rodar a suíte do pacote e o typecheck.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat(tokens): CSS vars, Tailwind v4 and MUI palette exporters`

---

### Task 9: App `web-mui`: scaffold, runtime de vars, store e tema-base

**Files:**
- Create: `apps/web-mui/{package.json,tsconfig.json,vite.config.ts,index.html}`, `public/fonts/Satoshi-Variable.woff2`, `src/{main.tsx,App.tsx,fonts.ts}`, `src/state/store.ts`, `src/runtime/sheet.ts`, `src/theme/createVortexTheme.ts`, `src/shell/Header.tsx`
- Modify: `package.json` (raiz: `dev` inclui `--filter web-mui`)
- Test: `apps/web-mui/test/{sheet.test.ts,store.test.ts,app.test.tsx}`

**Interfaces:**
- Consumes: `@token-bridge/tokens` (`loadSeed`, `cssVarMap`, `validate`, `muiPaletteValues`, edições, `MODE_ATTR`).
- Produces:

```ts
// runtime/sheet.ts
export class RuntimeSheet { constructor(doc?: Document); sync(map: CssVarMap): void; }  // diff contra o último map; só setProperty/removeProperty do que mudou; <style id="vx-runtime">
// state/store.ts
export type Tab = "base" | "semantic" | "specific";
export interface EditorState { set: TokenSet; seed: TokenSet; mode: Mode; tab: Tab; warnings: Warning[]; warningsOpen: boolean; focusToken?: string }
export const store: { get(): EditorState; subscribe(fn: () => void): () => void; update(fn: (s: EditorState) => EditorState): void; replaceSet(set: TokenSet): void; reset(): void };
export function useEditor<T>(select: (s: EditorState) => T): T;
export const DRAFT_KEY = "vortex-builder:draft:v1";
// theme/createVortexTheme.ts (autocontido: só importa @mui/material; a Task 14 o embute no export)
export function createVortexTheme(palette: { light: MuiPaletteValues; dark: MuiPaletteValues }): Theme;
// fonts.ts
export const FONT_CATALOG: Array<{ family: string; weights: number[]; source: "local" | "google" }>;  // Satoshi Variable [300..900] local + ~20 Google Fonts populares com pesos
export function ensureFontLoaded(family: string): void;   // injeta <link> do Google Fonts css2 uma vez
```

Pontos decididos:
- `createTheme({ cssVariables: { colorSchemeSelector: '[data-mode="%s"]' }, colorSchemes: { light: { palette }, dark: { palette } }, … })`. Se o MUI v7 instalado não aceitar esse seletor, use o que ele aceitar e ajuste `MODE_ATTR`/`toCss` para o mesmo seletor, mantendo os dois em sincronia.
- Fundações nesta task: `typography` (variants `h1–h3` → display, `h4–h6` → heading, `body1` → body/medium, `body2` e `caption` → body/small, `button` → label/medium, `textTransform: "none"`, todos com `var(--vx-typography-…)`); `shadows` (`[none, ...11 × var(--vx-shadow-raised), ...13 × var(--vx-shadow-overlay)]`); `MuiButtonBase.defaultProps.disableRipple = true`; `MuiCssBaseline` com `body { background: var(--vx-background-canvas); color: var(--vx-text-primary) }`, `@font-face` da Satoshi e `:focus-visible { outline: var(--vx-border-width-focus) solid var(--vx-border-focus); outline-offset: 2px }`; regra global `.Mui-disabled { opacity: var(--vx-opacity-disabled) }`.
- Store: rascunho em `localStorage` (debounce 300 ms). Leitura e escrita ficam em try/catch, e um rascunho inválido (`parseDtcg` lança) é descartado. `warnings` é recalculado a cada mudança de `set`, com `fontWeights` vindo de `FONT_CATALOG`. Com `brand-2` desligado, o store acrescenta o aviso de UI `{ rule: "disabled-group-in-use", token: "semantic:background/accent-2/strong", message: "Chip e Badge Secondary usam accent-2, que está desligado: voltam ao padrão do MUI" }` (spec §5.2). Teste: `store.update(s => ({ ...s, set: { ...s.set, disabledGroups: ["brand-2"] } }))` → `warnings` contém esse aviso.
- `App`: `useEditor` → `RuntimeSheet.sync(cssVarMap(set))` a cada mudança de `set`. O tema é recriado com debounce de 150 ms quando o `JSON.stringify` de `muiPaletteValues` (light + dark) muda. O modo vai para `useColorScheme().setMode` e para `document.documentElement.dataset.mode`.
- `Header`: título "Vortex Builder", abas Base / Semantic / Specific, botão de avisos com contagem (abre o drawer da Task 13), seletor ☀ claro / ☾ escuro e um placeholder "Exportar" (Task 14). Embaixo, a faixa do editor (vazia nesta task) e a área da vitrine.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// sheet.test.ts (jsdom)
const sheet = new RuntimeSheet(document); sheet.sync({ root: { "--vx-base-x": "1" }, light: { "--vx-a": "var(--vx-base-x)" }, dark: {} });
expect(document.getElementById("vx-runtime")!.textContent ?? cssText()).toContain("--vx-a");
const spy = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
sheet.sync({ root: { "--vx-base-x": "2" }, light: { "--vx-a": "var(--vx-base-x)" }, dark: {} }); expect(spy).toHaveBeenCalledTimes(1);
// store.test.ts
localStorage.setItem(DRAFT_KEY, "{broken"); expect(freshStore().get().set).toEqual(loadSeed());
vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); }); expect(() => freshStore()).not.toThrow();
// app.test.tsx
render(<App />); expect(cssText()).toContain("--vx-text-primary");
expect(emotionCss()).toContain("var(--vx-shadow-raised)");
```

(`cssText()` concatena as regras de `#vx-runtime`; `emotionCss()` concatena `document.head` `style[data-emotion]`; `freshStore()` reimporta o módulo com `vi.resetModules()`.)

- [ ] **Step 2: Rodar.** `pnpm install && pnpm --filter web-mui test`. Esperado: FAIL.
- [ ] **Step 3: Baixar a fonte.** Pegar o zip da Satoshi na Fontshare (`https://api.fontshare.com/v2/fonts/download/satoshi`) e copiar `Satoshi-Variable.woff2` para `public/fonts/`. Licença ITF FFL, ver spec §8.
- [ ] **Step 4: Implementar** os arquivos. Dependências: `react@19`, `react-dom@19`, `@mui/material@7`, `@mui/icons-material@7`, `@emotion/react`, `@emotion/styled`. Dev: `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`. Configuração do vitest no `vite.config.ts` com `environment: "jsdom"`.
- [ ] **Step 5: Rodar os testes, o typecheck e o build.** `pnpm --filter web-mui test && pnpm --filter web-mui typecheck && pnpm --filter web-mui build`. Esperado: PASS. `pnpm dev` abre `http://localhost:5174` com o cabeçalho temado em Satoshi.
- [ ] **Step 6: Commit** `feat(web-mui): app scaffold, runtime CSS vars, editor store and base MUI theme`

---

### Task 10: Overrides da tabela de Correspondências + telas Painel e Cadastro

**Files:**
- Create: `apps/web-mui/src/theme/overrides/{actions,inputs,selection,data-display,surfaces,feedback,navigation}.ts`, `src/showcase/{Dashboard,Signup,Spot}.tsx`, `src/showcase/spots.ts`
- Modify: `src/theme/createVortexTheme.ts` (junta os overrides), `src/App.tsx` (vitrine)
- Test: `apps/web-mui/test/overrides.test.tsx`

**Interfaces:**
- Consumes: `createVortexTheme` (Task 9).
- Produces:

```ts
// showcase/spots.ts: liga cada peça da vitrine aos tokens que ela consome (fonte: tabela §8 da spec)
export const SPOTS: Record<string, string[]>;   // ex. "button-contained-primary": ["background/action/primary","background/action/primary-hover","background/action/primary-pressed","text/on-action-primary"]
// showcase/Spot.tsx
export function Spot(props: { id: keyof typeof SPOTS; children: React.ReactNode }): JSX.Element;  // contorno âmbar 1px tracejado se algum token do spot tem aviso
```

Overrides: implementar **cada linha** da tabela "Correspondências" da spec §8 (Button, IconButton, Disabled, Campo, Checkbox/Radio/Switch/Slider, aba/página/passo, Chip/Badge, Avatar, Alert, Snackbar/Tooltip, superfícies e elevação, divisores, Backdrop, Link, raio por componente, espaço e espessura), sempre com `var(--vx-<semantic>)`. Disabled usa a aparência habilitada + a opacity global da Task 9. As Lacunas não ganham override. Chip e Badge `color="secondary"` usam `background/accent-2/strong` só quando `brand-2` está ativo (a App passa `disabledGroups` para `createVortexTheme` via `palette.light.secondary === null`).

Telas (spec §9.2): **Painel** e **Cadastro**, com os componentes listados lá, cada peça dentro de `<Spot>`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
render(<ThemeProvider theme={createVortexTheme(pal)}><Button variant="contained">x</Button><TextField error label="e" /><Chip color="primary" label="c" /></ThemeProvider>);
const css = emotionCss();
for (const v of ["--vx-background-action-primary", "--vx-text-on-action-primary", "--vx-border-danger", "--vx-background-accent-1-strong", "--vx-radius-x-small"]) expect(css).toContain(`var(${v})`);
expect(css).not.toMatch(/var\(--vx-base-/);
render(<Dashboard />); render(<Signup />);          // monta sem erro
```

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar** os overrides e as duas telas.
- [ ] **Step 4: Rodar os testes e o build.** Esperado: PASS. Em `pnpm dev`, conferir visualmente o botão principal roxo `#9246D7` no claro e `#C090F0` no escuro.
- [ ] **Step 5: Commit** `feat(web-mui): MUI overrides from the Vortex mapping table, dashboard and signup screens`

---

### Task 11: Telas Configurações e Overlays

**Files:**
- Create: `apps/web-mui/src/showcase/{Settings,Overlays}.tsx`
- Modify: `src/showcase/spots.ts`, `src/App.tsx` (abas internas ou grade da vitrine)
- Test: `apps/web-mui/test/showcase.test.tsx`

**Interfaces:**
- Consumes: `Spot`, `SPOTS` (Task 10).

Componentes conforme a spec §9.2 (Configurações e Overlays). O Dialog abre com Backdrop (`background/backdrop` + `opacity/backdrop`).

- [ ] **Step 1: Escrever os testes que falham**

```ts
render(<Wrapped><Overlays /></Wrapped>); await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));
expect(screen.getByRole("dialog")).toBeInTheDocument();
expect(emotionCss()).toContain("var(--vx-background-backdrop)");
render(<Wrapped><Settings /></Wrapped>); expect(screen.getAllByRole("alert")).toHaveLength(12);   // 3 estilos × 4 paletas
```

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat(web-mui): settings and overlays showcase screens`

---

### Task 12: Aba Base

**Files:**
- Create: `apps/web-mui/src/editor/BaseTab.tsx`, `src/editor/PaletteCard.tsx`
- Modify: `src/App.tsx` (faixa do editor)
- Test: `apps/web-mui/test/base-tab.test.tsx`

**Interfaces:**
- Consumes: `store`, `useEditor` (Task 9); `applyScale`, `setBaseValue`, `setGroupEnabled`, `flexOfBase`, `FONT_CATALOG`, `ensureFontLoaded`.

Comportamento (spec §9.1, Base):
- Um cartão por paleta (`brand-1..4`, `neutral`, `data-1..6`) com 11 amostras, um campo de hex com "Gerar escala" e a edição de cada passo (clicar na amostra abre `<input type="color">` + campo hex).
- Um switch por grupo opcional. Quando `setGroupEnabled` devolve `blockedBy`, aparece um Alert warning com a lista.
- Paletas de feedback e escalas Travadas ficam recolhidas, só para leitura, com o rótulo "Travado".
- Dois selects de fonte (primary, secondary) com `FONT_CATALOG`.
- Os avisos da camada base aparecem como um ícone ⚠ no cartão, com tooltip.

- [ ] **Step 1: Escrever os testes que falham**

```ts
render(<Providers><BaseTab /></Providers>);
await user.clear(screen.getByLabelText("Hex de brand-1")); await user.type(screen.getByLabelText("Hex de brand-1"), "#16a34a");
await user.click(screen.getByRole("button", { name: "Gerar escala de brand-1" }));
expect(store.get().set.base["brand-1/600"].value).not.toBe("#9246d7");
expect(screen.queryByLabelText("Hex de space")).toBeNull();               // travado não edita
```

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar.** Esperado: PASS. Em `pnpm dev`, trocar a cor de `brand-1` atualiza os botões sem recriar o tema (ver no profiler que só `#vx-runtime` muda).
- [ ] **Step 5: Commit** `feat(web-mui): base layer editor`

---

### Task 13: Aba Semantic, aba Specific e drawer de avisos

**Files:**
- Create: `apps/web-mui/src/editor/{SemanticTab,RefPicker,SpecificTab,WarningsDrawer}.tsx`
- Test: `apps/web-mui/test/semantic-tab.test.tsx`, `apps/web-mui/test/specific-tab.test.tsx`

**Interfaces:**
- Consumes: `setRef`, `upsertSpecific`, `removeSpecific`, `checkSpecificName`, `allowedBaseGroups`, `valueLine`, `parsePar`, `contrastRatio`, `resolve`, `store`.
- Produces: `RefPicker` reutilizado em Semantic e Specific: `function RefPicker(p: { layer: "semantic"|"specific"; name: string; mode: Mode }): JSX.Element` (lista só refs de `allowedBaseGroups`, com amostra).

Comportamento (spec §9.1):
- **Semantic:** sub-abas por grupo. Tabela *token · claro · escuro · par/contraste*. A coluna de contraste mostra, para cada fundo do Par, a razão nos dois modos, com ⚠ e cor de aviso quando falha, **independente do modo da vitrine**. Clicar no nome expande a descrição com a linha Valor atual. Typography e shadow ficam agrupados por estilo. `focusToken` no store rola até a linha e a destaca.
- **Specific:** lista e formulário (nome, grupo de propriedade, refs claro/escuro via `RefPicker`, Uso, Não usar, Par; Situação fixa "Proposto"; Flexibilidade "Livre"; Valor calculado). Os avisos de `checkSpecificName` aparecem ao digitar. O `EditError` aparece no Alert do formulário. Escopos vêm do grupo (tabela da spec §5.3).
- **WarningsDrawer:** lista agrupada por regra. Clicar num aviso troca a aba e define `focusToken`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// semantic-tab
store.update(s => ({ ...s, set: setBaseValue(s.set, "brand-1/600", "#facc15") }));
render(<Providers><SemanticTab /></Providers>); await user.click(screen.getByRole("tab", { name: "text" }));
const row = screen.getByRole("row", { name: /text\/on-action-primary/ }); expect(within(row).getByText(/⚠/)).toBeInTheDocument();
await user.selectOptions?.(within(row).getByLabelText("claro"), "neutral/900");  // ou o equivalente com MUI Select
expect(store.get().set.semantic["text/on-action-primary"].values.light).toBe("neutral/900");
expect(store.get().warnings.some(w => w.token === "semantic:text/on-action-primary" && w.mode === "light")).toBe(false);
// specific-tab
render(<Providers><SpecificTab /></Providers>); await user.type(screen.getByLabelText("Nome"), "text/primary"); await user.click(screen.getByRole("button", { name: "Criar" }));
expect(screen.getByRole("alert")).toHaveTextContent(/já existe/);
```

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar.** Esperado: PASS.
- [ ] **Step 5: Commit** `feat(web-mui): semantic and specific editors, warnings drawer`

---

### Task 14: Exportar, importar e restaurar

**Files:**
- Create: `apps/web-mui/src/export/{ExportMenu.tsx,mui-module.ts,download.ts}`
- Modify: `src/shell/Header.tsx`, `README.md` (seção "Vortex × MUI builder": como rodar e o que cada export contém)
- Test: `apps/web-mui/test/export.test.ts`

**Interfaces:**
- Consumes: `toDtcg`, `parseDtcg`, `TokenFormatError`, `toCss`, `toTailwind`, `muiPaletteValues`, `store.replaceSet`, `store.reset`.
- Produces: `export function toMuiModule(set: TokenSet): string;` em `mui-module.ts`. Ele importa `../theme/createVortexTheme.ts?raw` e retorna `import "./vortex.css";` + o código da factory + `export const vortexPalette = { light: …, dark: … };` + `export const theme = createVortexTheme(vortexPalette);`. O módulo gerado não pode importar nada além de `@mui/material` (spec §10).

Menu "Exportar ▾": `vortex.tokens.json`, `vortex.css`, `vortex.tailwind.css`, `vortex.mui.ts`, separador, "Importar JSON…" (file input → `parseDtcg`; em `TokenFormatError` aparece um Snackbar de erro e o estado não muda), "Restaurar padrão do laboratório" (confirmação → `store.reset()`).

- [ ] **Step 1: Escrever os testes que falham**

```ts
const mod = toMuiModule(loadSeed());
expect(mod).toContain('import "./vortex.css"'); expect(mod).toContain("export const theme");
expect([...mod.matchAll(/^import .* from "([^"]+)"/gm)].map(m => m[1]).every(s => s.startsWith("@mui/material"))).toBe(true);
expect(mod).toContain('"#9246d7"');
const before = store.get().set; await importFile(new File(["{\"x\":1}"], "x.json")); expect(store.get().set).toBe(before);
```

(`importFile` é o handler exportado por `ExportMenu.tsx`.)

- [ ] **Step 2: Rodar.** Esperado: FAIL.
- [ ] **Step 3: Implementar.** `download.ts`: `downloadText(filename: string, text: string, mime: string): void` via Blob + `<a download>`.
- [ ] **Step 4: Rodar tudo.** `pnpm test && pnpm typecheck && pnpm --filter web-mui build`. Esperado: PASS em todo o workspace (o shadcn continua verde).
- [ ] **Step 5: Conferência manual (spec §12).** Com o seed, comparar a vitrine com as instâncias do Playground (seção 08 da página "MUI — Biblioteca integrada" do Figma) nos dois modos. Anotar no PR as diferenças que não são Lacunas.
- [ ] **Step 6: Commit** `feat(web-mui): exports (DTCG, CSS, Tailwind, MUI), JSON import and reset`
