# **Seção 05 - Catálogo e flexibilidade dos tokens**

Esta seção lista todos os tokens do laboratório. Para cada um, você encontra o nome, para que serve, o valor padrão e quanto o seu projeto pode mudar.

Use o catálogo para duas coisas: achar um token antes de pensar em criar outro e saber o que você pode ajustar ao personalizar o projeto.

## **Como ler este catálogo**

- Cada linha é um token. O valor padrão é o que vem no arquivo inicial do Figma quando você o duplica.
- Na Semântica, cada token tem Uso (para que serve), Não usar (onde ele erra) e Par (os tokens que trabalham com ele). Quando a coluna Par traz —, o token não tem par.
- Na Base, o valor está no nome: `space/16` vale 16 px. A Base não tem Uso nem Não usar, porque não é aplicada direto na tela.
- Na Semântica, as colunas Claro e Escuro mostram para qual token da Base o nome aponta em cada modo preferencialmente, mas pode mudar dependendo da personalização do seu projeto.
- As medidas aparecem em px e em rem (16 px = 1 rem). A espessura de borda aparece só em px.
- Procure pelo nome com Ctrl+F. Se não achar o token de que precisa, leia a seção 06 antes de criar um.
- Uso e Não usar dizem o papel na interface: para que o token serve e em que situação, nunca em qual componente. Nomes de componente aparecem só na coluna Exemplos, como ilustração, não como regra.

## **Quanto o seu projeto pode mudar?**

Todo token tem um nível de flexibilidade. A seção 01 apresenta os três níveis; aqui está o que cada um permite.

| **Nível** | **O que quer dizer** | **Exemplos** |
|---|---|---|
| Travado | O projeto não muda. É igual em todos os projetos do laboratório | Todos os nomes; as escalas da Base (`space`, `radius`, `font-size` e as outras medidas); os valores das paletas de feedback |
| Ajustável | O projeto pode trocar o valor, dentro de um limite | As referências da Semântica, inclusive as de feedback (dentro da própria paleta); a paleta `neutral`; as paletas `data-1` a `data-6`  |
| Livre | O projeto define o valor | As paletas `brand-1` a `brand-4`; as fontes `primary` e `secondary`; os Específicos |

Na Semântica, ajustar é trocar a referência: o nome continua o mesmo e passa a apontar para outro token da Base. A troca vale para o projeto todo.

| **Grupo** | **Limite do Ajustável** |
|---|---|
| Cor (`text`, `icon`, `background`, `border`) | A nova referência passa no contraste da tabela abaixo, nos dois modos. A cor de feedback continua na própria paleta: `text/danger` aponta sempre para `danger` |
| Tipografia | Tamanho, altura de linha e peso só com valores da Base. A altura de linha é 1,3 vez o tamanho em `display` e `heading` e 1,5 vez em `body` e `label`, arredondada para o múltiplo de 4 mais próximo; no empate, para cima. A Base tem a altura de linha de todos os tamanhos da lista. |
| `space` e `radius` | Só valores da Base. Um nome nunca fica maior que o seguinte: `small` pode ser igual a `medium`, nunca maior. Uma marca de cantos retos pode levar todo `radius`, menos `full`, para `radius/0`. |
| `border-width` | Qualquer valor da Base, de 0,5 a 8 px. O foco nunca fica abaixo de 2, para continuar visível |
| `neutral` (Base) | `/0` continua branco e `/1000` continua preto. Os passos do meio podem ganhar outro tom, como um cinza mais quente, sempre do mais claro para o mais escuro |
| `data-1` a `data-6` (Base) | As seis continuam distintas entre si, inclusive para quem tem daltonismo, e passam 3:1 contra o fundo. Nenhuma usa o tom das paletas de status |
| `opacity` | Só valores da Base, em múltiplos de 5, de 0 a 100 |
| `shadow` (deslocamento, desfoque, espalhamento) | Só valores de `space` da Base |
| `shadow` (cor) | Uma cor e uma opacidade da Base. O padrão é `neutral/1000` com `opacity/10` (raised) e `/15` (overlay) |
| Família por papel (`typography/{papel}/font-family`) | Aponta para `font-family/primary` ou `/secondary` |
| `letter-spacing` | Só valores da Base (hoje, só `letter-spacing/0`) |

**Certo**: a marca do projeto é clara, e o texto branco sobre `background/action/primary` não passa no contraste mínimo de 4,5:1 (WCAG). Você troca a referência do modo claro de `brand-1/600` para `brand-1/700` e confere o contraste de novo.

**Errado**: mudar o valor de `space/16` para 20. `space/16` é Travado: o nome diz o valor. Se o projeto precisa de mais espaço, troque a referência de `space/medium` para `space/20`.

**Errado**: trocar a referência de `space/medium` para resolver um único card. A troca muda o projeto todo. Para um caso só, veja a seção 06.

## **Contraste: o que cada elemento precisa**

Confira cada elemento contra o fundo onde ele fica, nos modos claro e escuro, um de cada vez. O mínimo segue a WCAG 2.2 nível AA. No texto, o mínimo depende do tamanho: texto grande (24 px ou mais, ou 18,66 px ou mais em negrito) pede 3:1; o resto, 4,5:1. Ao conferir os tokens, sem tela, todo `text/*` precisa de 4,5:1, porque o mesmo token aparece em texto pequeno. Os 3:1 do texto grande valem só ao conferir uma tela, onde o tamanho do texto é conhecido. Se estiver conferindo uma tela com IA pelo MCP, peça que ela meça o tamanho e o peso de cada texto.

| **Elemento** | **Mínimo** | **Contra o quê** | **Tokens** |
|---|---|---|---|
| Texto, inclusive placeholder | 4,5:1. Numa tela, texto grande (24 px ou mais, ou 18,66 px ou mais em negrito) pode ter 3:1 | O fundo onde está | `text/*` |
| Ícone que informa | 3:1 | O fundo onde está | `icon/*` |
| Limite de controle (contorno de campo, de checkbox e de radio, trilho do switch, borda de item selecionado) | 3:1 | O fundo ao redor | `border/strong`, `border/selected`, `background/*` do controle |
| Anel de foco | 3:1 | O fundo que aparece no vão (veja “Como desenhar o foco”, em Catálogo de cor – Borda) | `border/focus` |
| Série de gráfico | 3:1 | `background/canvas` e `background/surface` | `data/*` |
| Elemento desabilitado | Isento | — | `opacity/disabled` |
| Decoração (divisor, fundo atrás do modal, ilustração) | Sem mínimo | — | `border/subtle`, `background/backdrop` |

## **Catálogo - Base**

A Base guarda os valores e alimenta as camadas Semântico e Específicos. Você não aplica um token da Base direto na tela: aplica um token da Semântica ou um Específico, e eles apontam para a Base.

| **Grupo** | **Tokens** | **Flexibilidade** |
|---|---|---|
| `brand-1` a `brand-4` | `/50`, `/100`, `/200`… `/950`. `brand-1` é obrigatória; as outras, opcionais. Cada paleta alimenta o destaque de mesmo número (`accent-1` a `accent-4`) | Livre: o valor é a marca do projeto |
| `neutral` | `/0` (branco), `/50`, `/100` … `/900`, `/950`, `/1000` (preto) | Ajustável, com o limite acima |
| `danger`, `warning`, `success`, `information` | `/50`, `/100` … `/950` | Travado |
| `data-1` a `data-6` (opcionais) | `/50`, `/100` … `/950` | Ajustável, com o limite acima |
| `space` | 0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 128 | Travado |
| `radius` | 0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, `full` (9999) | Travado |
| `border-width` | 0,5 (`border-width/0_5`), 1, 1,5 (`border-width/1_5`), 2, 3, 4, 6, 8 | Travado |
| `opacity` | 0 a 100, de 5 em 5 | Travado |
| `font-size` | 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72 | Travado |
| `line-height` | 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 84, 92, 96, 108  | Travado |
| `font-weight` | `100, 200 … 900.` O nome do peso (Bold, por exemplo) fica na descrição | Travado |
| `font-family` | `primary`, `secondary` | Livre: as fontes do projeto |
| `letter-spacing` | `0` | Travado |

As paletas de feedback e de gráficos vêm do Tailwind v4: `danger` = red, `warning` = amber, `success` = green, `information` = blue; `data-1` a `data-6` = violet, cyan, orange, pink, teal, stone. As paletas `brand` e `neutral` podem ser geradas no [<ins>uicolors.app</ins>](https://uicolors.app/generate) a partir do hex da marca do seu projeto.

As medidas são múltiplos de 4. As exceções são a espessura de borda (de 0,5 a 8 px) e os tamanhos de fonte 14 e 18. A altura de linha desses tamanhos continua em múltiplos de 4: 14/20 e 18/28. O Figma não aceita ponto no nome da variável, então 0,5 e 1,5 usam sublinhado: `border-width/0_5` e `border-width/1_5`.

As paletas de gráficos são opcionais: `data-1` a `data-6`, cada uma de `/50` a `/950`, como as outras. São Ajustáveis: o projeto pode trocar o tom, desde que as seis continuem distintas entre si e passem no contraste de 3:1 contra o fundo (WCAG). Nenhuma usa o tom das paletas de status, para uma série não ser lida como erro ou sucesso.

## **Catálogo - Tipografia**

São 12 estilos: quatro papéis com três tamanhos cada. Os valores abaixo são o padrão; o projeto pode ajustar, com o limite acima. A fonte vem de `typography/{papel}/font-family`, que aponta para `font-family/primary` ou `/secondary` da Base (Livre).

| **Estilo** | **Uso** | **Não usar** | **Exemplos** | **Par** | **Tamanho** | **Altura de linha** | **Peso** | **Fonte** |
|---|---|---|---|---|---|---|---|---|
| `display/large` | Maior título da tela, em abertura e página de destaque | Dentro de uma superfície ou de uma seção | — | — | 64 px · <br>4 rem | 84 px · <br>5,25 rem | 700 | `primary` |
| `display/medium` | Título de destaque em telas menores | Dentro de uma superfície ou de uma seção | — | — | 48 px · <br>3 rem | 64 px · <br>4 rem | 700 | `primary` |
| `display/small` | Título de destaque no celular | Dentro de uma superfície ou de uma seção | — | — | 40 px · <br>2,5 rem | 52 px · <br>3,25 rem | 700 | `primary` |
| `heading/large` | Título da página | Para texto corrido ou rótulo | — | — | 32 px · <br>2 rem | 40 px · <br>2,5 rem | 700 | `primary` |
| `heading/medium` | Título de seção | Para texto corrido ou rótulo | — | — | 24 px · <br>1,5 rem | 32 px · <br>2 rem | 700 | `primary` |
| `heading/small` | Título de superfície e de grupo de conteúdo | Para texto corrido ou rótulo | Cartão | — | 20 px · <br>1,25 rem | 28 px · <br>1,75 rem | 700 | `primary` |
| `body/large` | Texto corrido de leitura longa | Para rótulo de controle: use `label` | — | — | 18 px · <br>1,125 rem | 28 px · <br>1,75 rem | 400 | `secondary` |
| `body/medium` | Texto corrido padrão | Para rótulo de controle: use `label` | — | — | 16 px · <br>1 rem | 24 px · <br>1,5 rem | 400 | `secondary` |
| `body/small` | Texto de apoio, legenda | Para rótulo de controle: use `label` | — | — | 14 px · <br>0,875 rem | 20 px · <br>1,25 rem | 400 | `secondary` |
| `label/large` | Rótulo de controle, tamanho grande | Para parágrafo | Botão grande | — | 16 px · <br>1 rem | 24 px · <br>1,5 rem | 500 | `secondary` |
| `label/medium` | Rótulo de controle, tamanho padrão | Para parágrafo | Botão, campo, menu | — | 14 px · <br>0,875 rem | 20 px · <br>1,25 rem | 500 | `secondary` |
| `label/small` | Rótulo de controle pequeno e de marcação curta | Para parágrafo | Tag, selo | — | 12 px · <br>0,75 rem | 20 px · <br>1,25 rem | 500 | `secondary` |

No Figma, cada linha é um estilo de texto (`body/medium`) ligado a cinco variáveis da Semântica, agrupadas pelo estilo: `typography/body/medium/font-size`, `/line-height`, `/font-weight`, `/letter-spacing` e `typography/body/font-family`. A família aponta para `font-family/primary` (display e heading) ou `/secondary` (body e label); o espaçamento, para `letter-spacing/0`. 

## **Catálogo - Espaço**

| **Token** | **Uso** | **Não usar** | **Exemplos** | **Par** | **Padrão** |
|---|---|---|---|---|---|
| `space/none` | Elementos colados | Para separar conteúdo | — | — | 0 |
| `space/xx-small` | Entre ícone e texto | Entre blocos | — | — | 4 px · <br>0,25 rem |
| `space/x-small` | Entre itens de um grupo pequeno, como um rótulo e o controle que ele nomeia | Entre grupos | Rótulo e campo | — | 8 px · <br>0,5 rem |
| `space/small` | Padding interno de componente pequeno | Entre seções | — | — | 12 px · <br>0,75 rem |
| `space/medium` | Espaço interno padrão de controles e superfícies; entre itens de uma lista | Entre seções | Cartão, campo | — | 16 px · <br>1 rem |
| `space/large` | Entre grupos de uma seção | Dentro de componente pequeno | — | — | 24 px · <br>1,5 rem |
| `space/x-large` | Entre seções | Dentro de componente | — | — | 32 px · <br>2 rem |
| `space/xx-large` | Entre blocos grandes da página; margem de página | Dentro de componente | — | — | 48 px · <br>3 rem |

## **Catálogo - Raio**

| **Token** | **Uso** | **Não usar** | **Exemplos** | **Par** | **Padrão** |
|---|---|---|---|---|---|
| `radius/none` | Forma sem arredondamento: o que encosta em outra borda | — | Tabela, imagem de borda a borda | — | 0 |
| `radius/xx-small` | Controle ou marcação muito pequena | Em superfície que agrupa conteúdo | Checkbox, tag pequena | — | 4 px · <br>0,25 rem |
| `radius/x-small` | Controle de tamanho padrão: o que a pessoa aciona ou preenche | Em superfície que agrupa conteúdo | Botão, campo | — | 8 px · <br>0,5 rem |
| `radius/small` | Superfície pequena, inclusive a que flutua | Em controle | Cartão pequeno, menu | — | 12 px · <br>0,75 rem |
| `radius/medium` | Superfície que agrupa conteúdo | Em controle | Cartão | — | 16 px · <br>1 rem |
| `radius/large` | Superfície grande sobreposta à tela | Em elemento pequeno | Modal | — | 24 px · <br>1,5 rem |
| `radius/x-large` | Superfície grande que entra por uma borda da tela | Em elemento pequeno | Bottom sheet | — | 32 px · <br>2 rem |
| `radius/xx-large` | Superfície grande de destaque | Em elemento pequeno | — | — | 40 px · <br>2,5 rem |
| `radius/full` | Forma totalmente arredondada: círculo ou pílula | Em superfície que agrupa conteúdo | Pílula, avatar, botão redondo | — | 9999 px |

## **Catálogo - Borda, opacidade e sombra**

| **Token** | **Uso** | **Não usar** | **Exemplos** | **Par** | **Padrão** |
|---|---|---|---|---|---|
| `border-width/default` | Divisor e contorno de superfície e de controle | Para foco | Cartão, campo | `border/subtle`, `border/strong` | 1 px |
| `border-width/strong` | Contorno que precisa de mais destaque | Para foco: use `border-width/focus` | — | `border/strong` | 2 px |
| `border-width/focus` | Espessura do anel de foco | Para outra borda | — | `border/focus` | 2 px |
| `border-width/selected` | Item selecionado | Para foco | — | `border/selected` | 2 px |
| `opacity/disabled` | Elemento desabilitado inteiro | Para texto de menor destaque (use `text/tertiary`); para esconder elemento | — | — (vale para o elemento inteiro) | 40 |
| `opacity/backdrop` | Transparência da camada que escurece a tela atrás de uma superfície sobreposta | Para desabilitado | Modal | `background/backdrop` | 50 |
| `shadow/raised` | Elevação baixa: o que flutua perto do conteúdo | Para elevação alta: use `shadow/overlay` | Menu, popover, cartão elevado | `background/surface-raised` | `offset-x` 0 · `offset-y` 4 · `blur` 8 · `spread` 0 · `color` `neutral/1000` com `opacity/10`  |
| `shadow/overlay` | Elevação alta: o que se sobrepõe à tela inteira | Para elevação baixa: use `shadow/raised` | Modal | `background/surface-raised`, `background/backdrop` | `offset-x` 0 · `offset-y` 8 · `blur` 24 · `spread` 0 · `color` `neutral/1000` com `opacity/15`  |

Os deslocamentos, o desfoque e o espalhamento apontam para `space`; a cor aponta para `neutral/1000`, com a opacidade ligada à Base.

**Cor com transparência funciona de dois jeitos.** Na sombra, a variável `shadow/{papel}/color` guarda a cor e a opacidade juntas (`neutral/1000` a 10%): você aplica o estilo e pronto. No fundo atrás do modal, `background/backdrop` guarda só a cor, opaca; a transparência vem de `opacity/backdrop`, aplicada no campo Opacidade da camada. Por isso o fundo do modal usa sempre os dois tokens juntos.

**Certo**: camada com preenchimento `background/backdrop` e opacidade `opacity/backdrop`. 

**Errado**: digitar 50% na cor do preenchimento.

## **Catálogo de cor**

`icon` tem os mesmos nomes, valores e Par de `text`, mas não tem `link`. Para o Uso e o Não usar, copie os de `text` e troque “texto” por “ícone”. Três tokens têm texto próprio:

- `icon/placeholder` — Uso: Ícone dentro de um controle vazio, ao lado do texto de exemplo. Não usar: Para ícone de ação, controle preenchido ou ícone desabilitado (desabilitado usa `opacity/disabled`).
- `icon/tertiary` — Não usar: Para ícone essencial.
- `icon/brand` — Não usar: Para ícone de menor destaque: use `icon/tertiary`; para status: use as paletas de feedback.

As paletas de feedback valem pelo significado: `danger` é erro, crítico ou urgente; `warning`, atenção; `success`, concluído; `information`, aviso neutro.

Os `on-` que ficam sobre a cor da marca (`text/on-action-primary`, `text/on-action-secondary`, `text/on-accent-n-strong` e os `icon/` de mesmo nome) mostram os valores do arquivo do laboratório, que servem de exemplo. A cor de `brand-n` muda em cada projeto, e o texto sobre ela muda junto. Escolha a referência que passe 4,5:1 sobre o fundo nos dois modos (3:1 para o ícone); quase sempre é `neutral/0` ou `neutral/900`. 

## **Catálogo de cor - Texto**

| **Token** | **Uso** | **Não usar** | **Exemplos** | **Par** | **Claro** | **Escuro** |
|---|---|---|---|---|---|---|
| `text/primary` | Texto principal | Sobre fundo forte ou invertido: use o `on-` desse fundo | — | `background/canvas, background/surface, background/surface-raised` | `neutral/900` | `neutral/50` |
| `text/secondary` | Texto de apoio | Para texto que a pessoa precisa ler para agir; sobre fundo forte | — | `background/canvas, background/surface, background/surface-raised` | `neutral/700` | `neutral/300` |
| `text/tertiary` | Metadados e texto de menor destaque | Para texto essencial; para texto de exemplo dentro de um controle vazio: use `text/placeholder` | — | `background/canvas, background/surface, background/surface-raised` | `neutral/600` | `neutral/400` |
| `text/placeholder` | Texto de exemplo dentro de um controle vazio, antes do preenchimento | Para rótulo, valor preenchido ou texto desabilitado (desabilitado usa `opacity/disabled`) | Campo | `border/strong` (o contorno do controle) | `neutral/600` | `neutral/400` |
| `text/link` | Link | Para texto que não navega; para rótulo de controle que executa uma ação | — | `background/canvas`, `background/surface` | `brand-1/700` | `brand-1/400` |
| `text/brand` | Texto na cor da marca que chama atenção, sem ação nem status | Para link: use `text/link`; para texto de menor destaque: use `text/tertiary`; para status: use as paletas de feedback | — | `background/canvas, background/surface, background/surface-raised` | `brand-1/600` | `brand-1/400` |
| `text/danger, text/success, text/information` | Mensagem de status | Sobre fundo forte de status: use `text/on-[paleta]-strong`; como cor decorativa | — | `background/[paleta]/subtle` ou `background/canvas` | `/700` da paleta | `/300` da paleta |
| `text/warning` | Mensagem de atenção | Sobre `background/warning/strong`: use `text/on-warning-strong`; como cor decorativa | — | `background/warning/subtle` ou `background/canvas` | `warning/700` | `warning/300` |
| `text/on-inverse` | Texto sobre `background/inverse` | Sobre qualquer outro fundo | — | `background/inverse` | `neutral/0` | `neutral/900` |
| `text/on-action-primary` | Texto sobre a ação principal | Fora de `background/action/primary` | — | `background/action/primary` e seus estados | `neutral/0` | `neutral/900` |
| `text/on-action-secondary` | Texto sobre a ação secundária | Fora de `background/action/secondary` | — | `background/action/secondary` e seus estados | `brand-1/800` | `brand-1/100` |
| `text/on-action-danger` | Texto sobre a ação destrutiva | Fora de `background/action/danger` | — | `background/action/danger` e seus estados | `neutral/0` | `neutral/900` |
| `text/on-danger-strong, text/on-information-strong` | Texto sobre fundo forte de status | Sobre o fundo suave (subtle): use `text/primary` | — | `background/[paleta]/strong` | `neutral/0` | `neutral/900` |
| `text/on-success-strong` | Texto sobre fundo forte de status | Sobre o fundo suave (subtle): use `text/primary` | — | `background/success/strong` | `neutral/900` | `neutral/900` |
| `text/on-warning-strong` | Texto sobre fundo forte de atenção | Sobre outro fundo | — | `background/warning/strong` | `neutral/900` | `neutral/900` |
| `text/on-accent-1-strong, text/on-accent-4-strong` | Texto sobre fundo forte de destaque | Sobre outro fundo | — | `background/accent-n/strong` de mesmo número | `neutral/0` | `neutral/900` |
| `text/on-accent-2-strong, text/on-accent-3-strong` | Texto sobre fundo forte de destaque | Sobre outro fundo | — | `background/accent-n/strong` de mesmo número | `neutral/900` | `neutral/900` |
| `text/on-neutral-strong` | Texto sobre fundo neutro forte | Sobre outro fundo | — | `background/neutral/strong` | `neutral/0` | `neutral/900` |

## **Catálogo de cor - Fundo**

Os destaques são para o que não tem ação nem status, como um badge na cor da marca ou a cor de uma categoria. `accent-n` usa a `brand-n` de mesmo número: `accent-1` usa `brand-1` e existe em todo projeto; `accent-2` a `accent-4` só existem se o projeto tiver a paleta, e o projeto apaga os que não usar ao duplicar o arquivo. O destaque pode ter a mesma cor de um botão; o que mostra que ele não é clicável é a forma do componente.

**Certo**: o badge “Novo” na cor da marca usa `background/accent-1/strong` com `text/on-accent-1-strong`.

**Errado**: usar `background/action/primary` no badge só porque a cor é a mesma.

| **Token** | **Uso** | **Não usar** | **Exemplos** | **Par** | **Claro** | **Escuro** |
|---|---|---|---|---|---|---|
| `background/canvas` | Fundo da página | Para superfícies sobre a página: use `background/surface` | — | `text/primary, text/secondary, text/tertiary` | `neutral/0` | `neutral/950` |
| `background/surface` | Superfície que agrupa conteúdo sobre a página | Para superfície que flutua acima do conteúdo: use `background/surface-raised` | Cartão | `text/primary, text/secondary, text/tertiary; border/subtle` | `neutral/50` | `neutral/900` |
| `background/surface-raised` | Superfície que flutua acima do conteúdo, com sombra | Para superfície que não flutua | Menu, popover | `shadow/raised` | `neutral/0` com `shadow/raised` | `neutral/800` |
| `background/inverse` | Superfície com as cores invertidas em relação à página, para mensagem curta sobreposta | Para ação principal ou destaque | Tooltip, snackbar | `text/on-inverse, icon/on-inverse` | `neutral/900` | `neutral/50` |
| `background/backdrop` | Camada que escurece a tela atrás de uma superfície sobreposta; a transparência vem de `opacity/backdrop`, aplicada na camada | Como fundo de elemento; para escurecer imagem | Modal | `opacity/backdrop` | `neutral/1000` (opacidade na camada: `opacity/backdrop`) | igual |
| `background/action/primary, -hover, -pressed` | Ação principal | Para mais de uma ação principal na mesma área; em elemento que não é clicável | — | `text/on-action-primary, icon/on-action-primary` | `brand-1/600` · `/700` · `/800` | `brand-1/400` · `/300` · `/200` |
| `background/action/secondary, -hover, -pressed` | Ação secundária | Em elemento que não é clicável | — | `text/on-action-secondary, icon/on-action-secondary` | `brand-1/50` · `/100` · `/200` | `brand-1/900` · `/800` · `/700` |
| `background/action/tertiary-hover, -pressed` | Ação sem fundo, ao interagir | Em repouso: a ação terciária não tem fundo parado | — | `text/primary` | `neutral/100 · /200` | `neutral/700 · /600` |
| `background/action/danger, -hover, -pressed` | Ação destrutiva | Para mensagem de erro: use `background/danger/subtle` | — | `text/on-action-danger`, `icon/on-action-danger` | `danger/600 · /700 · /800` | `danger/400 · /300 · /200` |
| `background/selected` | Item selecionado | Para hover; para ação principal | — | `border/selected`; `text/primary` | `brand-1/50` | `brand-1/900` |
| `background/danger/subtle, /strong` (o mesmo para `information`) | Fundo de status | Para ação destrutiva: use `background/action/danger`; como decoração | — | subtle: `text/primary`; strong: `text/on-[paleta]-strong` | `/50 · /600 da paleta` | `/900 · /400 da paleta` |
| `background/success/subtle`, `/strong` | Fundo de status | Para ação destrutiva: use `background/action/danger`; como decoração | — | subtle: `text/primary`; strong: `text/on-success-strong` | `success/50 · /400` | `success/900 · /400` |
| `background/warning/subtle` | Fundo suave de atenção | Como decoração | — | `text/primary` | `warning/50` | `warning/900` |
| `background/warning/strong` | Fundo forte de atenção | Como decoração | — | `text/on-warning-strong` | `warning/400` | `warning/400` |
| `background/accent-n/subtle, /strong` (`n` de 1 a 4) | Destaque sem ação nem status: marca uma categoria ou agrupa itens por cor | Para ação: use `background/action/primary` e as outras ações; para status: use as paletas de feedback | Badge, tag | subtle: `text/primary`; strong: `text/on-accent-n-strong` | `brand-n/50 · /600` | `brand-n/900 · /400` |
| `background/neutral/subtle, /strong` | Marcação curta sem significado de cor | Para status | Tag, selo | `subtle: text/primary; strong: text/on-neutral-strong` | `neutral/100 · /700` | `neutral/800 · /300` |

## **Catálogo de cor - Borda**

| **Token** | **Uso** | **Não usar** | **Exemplos** | **Par** | **Claro** | **Escuro** |
|---|---|---|---|---|---|---|
| `border/subtle` | Divisor e contorno de superfície, sem exigência de contraste | Para contorno de controle (não passa 3:1): use `border/strong` | Cartão | `border-width/default` | `neutral/200` | `neutral/700` |
| `border/strong` | Contorno que delimita um controle (3:1) | Para divisor decorativo | Campo | `border-width/default` | `neutral/500` | `neutral/400` |
| `border/focus` | Anel de foco: traço que contorna o elemento por fora, separado dele por um vão (3:1 contra o fundo do vão) | Colado no elemento; para seleção ou erro. Nunca remova o foco | — | `border-width/focus` | `brand-1/600` | `brand-1/400` |
| `border/selected` | Item selecionado | Para foco | — | `border-width/selected, background/selected` | `brand-1/600` | `brand-1/400` |
| `border/danger, border/success, border/information` | Borda de status | Como decoração | — | `background/[paleta]/subtle` | `/600 da paleta` | `/400 da paleta` |
| `border/warning` | Borda de atenção | Como decoração | — | `background/warning/subtle` | `warning/600` | `warning/400` |

### **Como desenhar o foco**

O foco é um anel separado do elemento, como no Material Design 3. Desenhe um contorno com `border/focus` e `border-width/focus` em volta do elemento, deixando um vão entre os dois. O vão mostra o fundo que está atrás (`background/canvas`, `/surface` ou `/surface-raised`), e é contra esse fundo que o anel precisa passar 3:1. Assim o foco aparece mesmo quando o elemento tem a cor do anel, como o botão principal. A medida do vão entra com o design system.

**Certo**: botão principal com o anel afastado, sobre `background/canvas`.

**Errado**: contorno `border/focus` colado no preenchimento do botão principal: os dois têm a mesma cor, e o foco some.

## **Catálogo de cor - Gráficos / Visualização de dados**

O grupo data serve para qualquer gráfico, mapa ou legenda. É opcional: o projeto sem gráfico apaga o grupo ao duplicar o arquivo. Use as cores na ordem: a primeira série é sempre `data/categorical-1`. Com mais de 6 séries, agrupe o resto em “Outros”. Eixo e grade usam `border/subtle`; rótulos, `text/secondary`; alerta no gráfico, `danger`. Cada cor passa no contraste de 3:1 contra `background/canvas` e `background/surface` nos dois modos, e as seis se distinguem para quem tem daltonismo.

### **Tabela categórica**

| **Token** | **Uso** | **Não usar** | **Exemplos** | **Par** | **Claro** | **Escuro** |
|---|---|---|---|---|---|---|
| `data/categorical-1` | Primeira série de um gráfico | Para status: use `danger`, `warning`, `success` ou `information`; fora de gráfico: use `accent-n` | — | `border/subtle`, `text/secondary` | `data-1/600` | `data-1/400` |
| `data/categorical-2` | Segunda série | Para status; fora de gráfico | — | `border/subtle`, `text/secondary` | `data-2/600` | `data-2/400` |
| `data/categorical-3` | Terceira série | Para status; fora de gráfico | — | `border/subtle`, `text/secondary` | `data-3/600` | `data-3/400` |
| `data/categorical-4` | Quarta série | Para status; fora de gráfico | — | `border/subtle`,  `text/secondary` | `data-4/600` | `data-4/400` |
| `data/categorical-5` | Quinta série | Para status; fora de gráfico | — | `border/subtle`, `text/secondary` | `data-5/600` | `data-5/400` |
| `data/categorical-6` | Sexta série | Para status; fora de gráfico | — | `border/subtle`, `text/secondary` | `data-6/600` | `data-6/400` |

A escala sequencial serve para dado com ordem, do menor ao maior: mapa de calor, mapa por região, ocupação de 0 a 100%. São cinco tons de `data-1`: quanto mais forte o tom, maior o valor. No modo escuro a ordem inverte, para o maior valor continuar sendo o que mais se destaca. Os passos claros não passam 3:1 sozinhos, então o gráfico sempre leva legenda ou rótulo com o valor.

### **Tabela sequencial**

| **Token** | **Uso** | **Não usar** | **Exemplos** | **Par** | **Claro** | **Escuro** |
|---|---|---|---|---|---|---|
| `data/sequential-1` | Menor faixa de valor | Para séries sem ordem: use `categorical`; para status | — | Legenda com o valor | `data-1/100` | `data-1/900` |
| `data/sequential-2` | Segunda faixa | Para séries sem ordem; para status | — | Legenda com o valor | `data-1/300` | `data-1/700` |
| `data/sequential-3` | Faixa do meio | Para séries sem ordem; para status | — | Legenda com o valor | `data-1/500` | `data-1/500` |
| `data/sequential-4` | Quarta faixa | Para séries sem ordem; para status | — | Legenda com o valor | `data-1/700` | `data-1/300` |
| `data/sequential-5` | Maior faixa de valor | Para séries sem ordem; para status | — | Legenda com o valor | `data-1/900` | `data-1/100` |

## **Específicos**

Este catálogo não lista Específicos. Cada projeto cria os seus na coleção `specific`, com a mesma estrutura de nomes da Semântica (Seção 04), apontando só para a Base. Você registra cada um no quadro Registro do arquivo do Figma, e a lead de design aprova ali. Como criar um está na seção 06.

## **Onde ver o valor do seu projeto?**

Este catálogo mostra o padrão do laboratório e é a fonte da descrição de cada token. No Figma, a descrição é copiada daqui, sem a coluna Exemplos, com os rótulos Uso, Não usar, Par, Flexibilidade, Situação e Valor. O valor que o seu projeto usa está no arquivo do Figma do projeto.

Na Semântica e nos Específicos, a descrição tem seis rótulos, um por linha. Na cor, o Valor mostra a referência do claro e do escuro (`neutral/900 | neutral/50`); na medida, a referência com px e rem (`space/16 (16 px · 1 rem)`). Na Base, a descrição tem só o Valor. 

**Linhas que valem para vários tokens.** Algumas linhas do Catálogo valem para uma família inteira. Para escrever a descrição de cada token, troque `[paleta]` pelo nome da paleta e `n` pelo número: a linha de `text/danger`, `text/success`, `text/information` vira, em `text/success`, "Par: `background/success/subtle` ou `background/canvas`". Em `icon`, copie a linha de `text` trocando “texto” por “ícone”, menos nas três exceções do início do Catálogo de cor.

**Variáveis de tipografia e sombra.** O Catálogo lista os estilos; as variáveis que formam cada estilo seguem este modelo:

| **Variável** | **Uso** | **Não usar** | **Par** | **Flexibilidade** | **Valor (exemplo)** |
|---|---|---|---|---|---|
| `typography/{papel}/{tamanho}/font-size`, `/line-height`, `/font-weight` | O Uso do estilo | O Não usar do estilo | — | Ajustável: só valores da Base; altura de linha pela regra 1,3 × ou 1,5 × | `font-size/16 (16 px · 1 rem)`; `font-weight/400 (400 · Regular)` |
| `typography/{papel}/{tamanho}/letter-spacing` | Espaçamento entre letras do estilo `{papel}/{tamanho}` | Em outro estilo: cada estilo tem o seu | — | Ajustável: aponta só para valores da Base | `letter-spacing/0 (0)` |
| `typography/{papel}/font-family` | Fonte do papel `{papel}` | Em outro papel de texto: cada papel tem a sua | — | Ajustável: aponta só para `font-family/primary` ou `/secondary` | `font-family/secondary` |
| `shadow/{papel}/offset-x`, `/offset-y`, `/blur`, `/spread` | Deslocamento horizontal (vertical, desfoque, espalhamento) da sombra `{papel}` | Fora do estilo `shadow/{papel}` | `shadow/{papel}` | Ajustável: aponta só para `space` da Base | `space/4 (4 px)` |
| `shadow/{papel}/color` | Cor da sombra `{papel}`, com a opacidade junto | Como cor de fundo ou de texto | `shadow/{papel}` | Ajustável: uma cor e uma opacidade da Base | `neutral/1000 a opacity/10 (10%)` |
| Estilo de texto | O Uso do Catálogo – Tipografia | O Não usar do Catálogo | — | — | Rótulos do estilo: Uso, Não usar, Variáveis, Valor (`16/24 px · 400 · [fonte]`) |
| Estilo de efeito | O Uso do Catálogo | O Não usar do Catálogo | O Par do Catálogo | — | Rótulos: Uso, Não usar, Par, Variáveis, Valor |

**A descrição acompanha o valor.** Quando trocar o valor de um token da Base ou a referência de um token da Semântica, atualize no mesmo momento a linha Valor da descrição dessa variável. Se a variável faz parte de um estilo de texto ou de sombra, atualize também a linha Valor do estilo.

**Certo**: trocou `typography/display/large/font-size` para `font-size/72`; a variável passa a dizer "Valor: font-size/72 (72 px · 4,5 rem)" e o estilo `display/large`, "Valor: 72/92 px · 700 · \[fonte do projeto\]".

**Errado**: trocar a fonte do projeto e deixar "Valor: Inter" na descrição de `font-family/primary`.
