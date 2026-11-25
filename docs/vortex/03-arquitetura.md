# **Seção 03 - Arquitetura**

A Base guarda os valores; a Semântica e os Específicos dizem para que eles servem; a tela usa só os dois últimos.

## **A tela usa a Semântica; os valores ficam na Base**

Cada seta é uma referência: o token aponta para outro em vez de guardar o valor

![](https://www.figma.com/spec/hXapRD3m5N74rS4yYwEKRJ/image/4bd8f1a14af5ea0938d22c44624374f7405845aa?w=2048&h=1546)

Leia o desenho da esquerda para a direita: o valor nasce na Base, ganha um propósito na Semântica (ou em Específicos) e só então chega à tela. Você nunca aplica um token da Base direto numa tela.

## **Base: os valores disponíveis**

A Base é a lista de tudo que pode ser usado: as cores, as medidas e as partes da tipografia. Ela não diz para que nada serve. Dois tipos de nome convivem aqui:

- Nome com o valor (`space/16`, `radius/8`): o valor nunca muda, em nenhum projeto.
- Nome com o papel (`brand-1/500`, `neutral/900`, `font-family/primary`): o nome é o mesmo em todo projeto, e o valor é o de cada um.

A Base não tem modo claro e escuro: cada token tem um valor só. Ela também não aparece nos campos do Figma para você selecionar; serve só de referência para as outras coleções (Semântica e Específicos).

| **Grupo** | **Exemplo** | **O projeto muda o valor?** |
|---|---|---|
| Cores da marca | `brand-1/500` (`brand-1` obrigatória; `brand-2` a `brand-4` opcionais). Cada paleta tem o seu destaque, de `accent-1` a `accent-4` | **Sim** |
| Neutro | `neutral/0` (branco) a `neutral/1000` (preto) | **Sim**, mantendo a progressão do claro ao escuro |
| Feedback | `danger/500`, `warning/400`, `success/600`, `information/600` | **Não** |
| Espaço | `space/16` (de 0 a 128) | **Não** |
| Raio | `radius/8`, `radius/full` | **Não** |
| Espessura de borda | `border-width/0_5` a `border-width/8` | **Não** |
| Opacidade | `opacity/40` (de 0 a 100, de 5 em 5) | **Não** |
| Tamanho de fonte | `font-size/16` (de 12 a 72) | **Não** |
| Peso de fonte | `font-weight/600` | **Não** |
| Altura de linha | `line-height/24` (de 16 a 108)  | **Não** |
| Espaçamento entre letras | `letter-spacing/0` | **Não** |
| Família de fonte | `font-family/primary`, `font-family/secondary` | **Sim** |
| Gráficos (opcional) | `data-1/500` (`data-1` a `data-6`, só em projeto com gráfico) | **Sim**, mantendo as seis distintas e com 3:1 contra o fundo |

Todas as paletas de cor têm os mesmos passos, de 50 a 950. Todas as medidas são múltiplos de 4, menos a espessura de borda (de 0,5 a 8 px) e os tamanhos de fonte 14 e 18.

## **Semântica: para que cada valor serve**

A Semântica dá um propósito a cada valor: `text/primary` é o texto principal, `background/surface` é o fundo de um card, `space/medium` é o espaço padrão entre elementos. É a coleção que você usa no dia a dia.

Cada token da Semântica:

- Aponta para um primitivo da Base, num salto só. `space/medium` aponta para `space/16`; nunca para outro token da Semântica.
- Tem valor nos modos claro e escuro. `text/primary` aponta para um tom escuro de neutral no claro e para um tom claro no escuro. O nome é o mesmo; só a referência muda.
- Tem escopo, ou seja, só aparece nos campos certos do Figma: `text`: cor de texto; `icon`: preenchimento de forma e cor de borda; `background`: preenchimento de frame e de forma; `border`: cor de borda; `data`: preenchimento e cor de borda; `space`: espaçamento (gap e padding); `radius`: raio; `border-width`: espessura de borda; `opacity`: opacidade; `typography`: o campo de mesmo nome (tamanho, altura de linha, peso, espaçamento entre letras e família); `shadow`: os campos de efeito (deslocamento, desfoque, espalhamento e cor).  
- Tem descrição, com quando usar, quando não usar, o par, a flexibilidade, a situação e o valor (com rem nas medidas).

Os grupos são `text`, `icon`, `background`, `border`, `space`, `radius`, `border-width`, `opacity`, `typography` (`typography/body/medium/font-size` e afins), `shadow` e `data`, opcional, para gráficos. Os nomes seguem a seção 04.

O projeto pode trocar para qual primitivo um token aponta, desde que cada elemento continue passando no contraste da seção 05, nos dois modos.

## **Específicos: o que só o seu projeto precisa**

Quando nenhum token da Semântica serve e a necessidade é só do seu projeto, você cria um Específico. Ele segue as mesmas regras da Semântica: mesmo formato de nome, sem o nome do projeto (`background/reading`, não `nome-do-projeto/background/reading`), aponta direto para a Base e tem valor nos dois modos.

Você documenta o porquê e registra no quadro Registro do arquivo do Figma, e a lead de design aprova ali. Quando a mesma necessidade aparece em três ou mais projetos, a lead leva o token para a Semântica com um nome só. O caminho completo está na seção 06.

## **Estilos: tokens que andam juntos (Tokens compostos)**

Tipografia e sombra precisam de vários tokens ao mesmo tempo, então viram estilos do Figma:

- Estilos de texto: 12, em quatro papéis (`display`, `heading`, `body`, `label`) com três tamanhos cada. `body/medium` junta `typography/body/medium/font-size`, `/line-height`, `/font-weight`, `/letter-spacing` e `typography/body/font-family`.
- Estilos de efeito: `shadow/raised` e `shadow/overlay`, ligados a `shadow/{papel}/offset-x`, `offset-y`, `blur`, `spread` e `color`. 

O estilo só liga variáveis da Semântica, nunca da Base. Nas telas, você aplica o estilo, não as variáveis soltas.

## **O que não existe?**

Não há tokens de componente. O botão principal usa `background/action/primary`, e não `button/background`. Isso pode mudar quando o design system começar.

## **No arquivo do figma**

| **Coleção** | **O que guarda** | **Tem modo?** |
|---|---|---|
| `base` | Os primitivos | **Não**: um valor por token (no Figma, um modo só, chamado `value`) |
| `semantic` | Os tokens com propósito | **Sim**: light e dark |
| `specific` | Os Específicos do projeto | **Sim**: light e dark |

No Figma, as páginas Base e Semantic mostram cada grupo numa tabela. Na Base: Token, Valor e Exemplo. Na Semântica: Token, Uso, Não usar, Par, Valor e Exemplo, com os modos claro e escuro lado a lado. As tabelas de estilos mostram as variáveis que cada estilo junta.

O arquivo do laboratório é só para visualização. Cada projeto duplica o seu e trabalha na própria cópia.

## **Do Figma ao código**

O Tech-lead ou estagiário do desenvolvimento responsável pelo front-end do sistema recebe o JSON exportado do arquivo do projeto e faz a conversão para o código. No Figma, as medidas ficam em px; o valor em rem (1 rem = 16 px) está na descrição de cada token, menos na espessura de borda, que fica só em px.

## **O que o projeto muda em cada camada**

| **Coleção** | **O que o projeto pode mudar** | **Nível** |
|---|---|---|
| `base` | Valores de `brand-1` a `brand-4` e das famílias de fonte | **Livre** |
| `base` | Valores de `neutral` | **Ajustável** |
| `base` | Valores de `data-1` a `data-6`, se o projeto tiver gráfico | **Ajustável** |
| `semantic` | Para qual token da Base cada token aponta, dentro da escala da Base e com o contraste exigido (feedback, na própria paleta) | **Ajustável** |
| `specific` | Criar os próprios tokens, com aprovação da lead | **Livre** |

Tudo o que não está na tabela é Travado. A lista token por token está na seção 05.
