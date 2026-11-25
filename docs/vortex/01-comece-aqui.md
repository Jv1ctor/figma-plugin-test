# **Seção 01 - Comece aqui**

## **Por que o laboratório usa Design Tokens?**

Cada projeto do laboratório costumava criar a própria estrutura, os próprios nomes e o próprio guia de estilo de acordo com a vivência e experiência de cada estagiário responsável pelo projeto. Como as equipes mudam a cada dois anos, quem chegava precisava aprender tudo da arquitetura  e organização, e o que foi decidido se perdia quando a pessoa saía.

Os tokens resolvem isso com uma regra simples: todos os projetos usam a mesma estrutura e os mesmos nomes, e cada um mantém a própria aparência.

## **O que é um token**

Um token é um nome que guarda uma decisão de design. Em vez de escolher uma cor pelo código (#1F1F1F) toda vez que desenha um texto, você escolhe um nome de uma lista, como `text/primary`. O nome diz para que aquilo serve; o valor fica guardado dentro dele.

No Figma, cada token é uma variável. Você aplica uma variável no mesmo lugar onde escolheria uma cor ou um número: no painel da direita, clique no ícone de variáveis ao lado do campo (preenchimento, borda, espaçamento, raio) e escolha o nome na lista.

| **A tela usa o nome; o valor fica guardado na Base** |
|---|

| **Valor** | **Base** | **Semântica** | **Tela** |
|---|---|---|---|
| #9246D7 (exemplo) | `brand-1/600` | `background/action/primary` | botão principal |
| a cor em si | guarda o valor | diz para que serve | Usa só o nome |

Você aplica nas telas só o que está na Semântica (o quadro destacado). Se a marca trocar de cor, muda-se o valor na Base uma vez, e todo botão principal muda junto.

O caminho acima é sempre o mesmo: o valor fica na Base, a Semântica aponta para ele e dá um propósito, e a tela usa o nome da Semântica.

## **Por que isso importa para você:**

- Se uma cor ou medida mudar, ela muda em todas as telas de uma vez, porque todas usam o mesmo nome.
- Quem abre o seu arquivo entende a intenção: `text/secondary` diz "texto de apoio"; um código de cor não diz nada.
- O desenvolvedor recebe os mesmos nomes no código, então design e código falam a mesma língua.

## **Na prática:** 

| **Situação** | **Sem token** | **Com token** |
|---|---|---|
| Pintar o título de um card | Escolher a cor no seletor | Aplicar `text/primary` |
| Fundo do botão principal | Copiar a cor da marca | Aplicar `background/action/primary` |
| Espaço entre dois campos | Digitar o número | Aplicar `space/medium` |
| A marca muda de cor | Procurar e trocar a cor em cada tela | Trocar o valor de `brand-1` uma vez |

| **Regra para lembrar**: se você está digitando um código de cor ou um número solto, pare e procure o token. Se nenhum servir, veja a seção 06. |
|---|

- **Base**: os valores disponíveis, como `space/16` e `brand-1/500`. Você não usa a Base direto nas telas, ela serve para alimentar a camada seguinte, a Semântica.
- **Semântica**: para que cada valor serve, como `text/primary` e `background/surface`. É o que você aplica nas telas.
- **Específicos**: o que só o seu projeto precisa, no mesmo formato da Semântica.

Os detalhes estão na seção 03.

## **Como começar um projeto?** 

**1.** Duplique o arquivo inicial do Figma do laboratório. O original é só para visualização.

**2.** Anote o nome do projeto e a data da versão de origem na lista de projetos do quadro Registro, na página Specifics do seu arquivo (modelo na seção 08).

**3.** Troque os valores de `brand-1` a `brand-4` pelas cores da marca que o seu projeto terá, ajuste o `neutral` se precisar e defina as fontes que o seu projeto terá alterando os tokens Base: `font-family/primary` e `font-family/secondary`. Se o projeto não tem gráfico, apague o grupo data e as paletas `data-1` a `data-6`. Se o projeto não usa `brand-2`, `brand-3` ou `brand-4`, apague também o destaque de mesmo número (`accent-2`, `accent-3` ou `accent-4`). Para gerar as escalas, use o [<ins>uicolors.app</ins>](https://uicolors.app/generate) a partir do hex da marca (seção 05). Se depois o projeto precisar de um grupo que você apagou, siga 'Recuperar um grupo opcional', na seção 06. Se for usar IA, preencha o questionário da seção 10, “Configurar o projeto com IA”.

**4.** Confira o contraste nos modos claro e escuro, elemento por elemento, com a tabela “Contraste: o que cada elemento precisa” da seção 05.

**5.** Nas telas, use só tokens da Semântica ou de Específicos, nunca da Base.

**6.** Quando nenhum token servir, siga as quatro perguntas da seção 06. Elas guiarão você para criar um token específico para o seu projeto.

**7.** Alinhe as criações dos tokens específicos para os responsáveis pelo desenvolvimento front-end do seu projeto (estagiário e tech leads): eles recebem o JSON exportado do arquivo do seu projeto e fazem a conversão dos tokens para o código. Dessa forma, o design do seu projeto fala a mesma língua no código e tudo se alinha.

## **O que você pode e não pode mudar?** 

| **Nível** | **O que entra** | **Exemplo** |
|---|---|---|
| Travado | Nomes da Base e da Semântica; os valores da Base que têm o valor no nome (`space`, `radius`, tamanhos de fonte e as outras medidas); os valores das paletas de feedback | `space/16` vale 16 em todo projeto e `danger/600` é o mesmo vermelho em todo projeto |
| Ajustável | Para qual token da Base cada token da Semântica aponta, escolhendo dentro da escala da Base (os de feedback, sempre na própria paleta); valores de `neutral` e das paletas `data-1` a `data-6` | `space/medium` pode apontar para `space/24` se o projeto quer mais respiro; `text/secondary` pode apontar para outro tom de `neutral`, se passar no contraste; `text/success` pode trocar `success/700` por `success/800` |
| Livre | Valores de `brand-1` a `brand-4`; famílias de fonte; Específicos | `brand-1` recebe a cor principal da marca |

A lista completa, token por token, está na seção 05.

## **Mapa da documentação**

| **Seção** | **Responde a** |
|---|---|
| Comece aqui | Como começo um projeto? |
| Princípios | Como decido quando não há regra? |
| Arquitetura | Quais camadas existem e o que cada projeto pode mudar? |
| Nomes | Como nomear um token? |
| Catálogo e flexibilidade | Quais tokens existem, o que posso mudar e o que não? |
| Usar, criar e ampliar | Quando criar um token novo? Como propor? |
| O que evitar | O que não fazer? |
| Quem decide e registro de mudanças | Quem cria, muda e aprova? |
| Conversão para o código | \\[Preencher depois com escrita do dev\\] |
| Configurar o projeto com IA | Como uso a IA para configurar meu projeto? |

## **Palavras que você vai encontrar**

**Token**: um nome para uma decisão de design.

**Base**: a camada dos valores disponíveis.

**Semântica**: a camada que diz para que cada valor serve.

**Específico**: token que só um projeto usa.

**Referência**: quando um token aponta para outro em vez de guardar um valor (`text/primary` aponta para um tom de `neutral`).

**Modo**: uma variação do mesmo tema, como claro e escuro.

**Tema**: o conjunto de valores de um projeto (cores da marca e fontes).

**Escopo**: em quais campos do Figma o token aparece (cor de texto, preenchimento, borda).

**Desuso**: situação de um token que vai sair; a descrição diz qual usar no lugar.

## **A quem perguntar?**

- Lead de design: tokens, propostas e dúvidas de uso.
- Lead de front: código e exportação.
