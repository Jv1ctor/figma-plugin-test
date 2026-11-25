# **Seção 02 - Princípios**

As outras seções dizem o que fazer nos casos comuns. Os princípios servem para quando nenhuma regra responde à sua dúvida: leia cada um como uma pergunta que você faz antes de decidir. Se, mesmo assim, a dúvida continuar, pergunte à lead de design.

## **1. Padronize a estrutura, não a aparência**

Todos os projetos usam os mesmos nomes e as mesmas regras. As cores e as famílias tipográficas são de cada um. O laboratório não quer produtos iguais, quer produtos construídos da mesma forma, para que qualquer pessoa entenda qualquer arquivo.

| **Certo** | **Errado** |
|---|---|
| O botão principal do Projeto A e o do Projeto B usam `background/action/primary`, cada um com a cor da própria marca. | Obrigar todos os projetos a usar o mesmo azul. |

## **2. O nome diz o que não muda**

Se o valor muda de projeto para projeto, o nome diz o papel. Se o valor nunca muda, o nome diz o valor. Assim o nome nunca fica errado, mesmo quando a marca muda.

| **Certo** | **Errado** |
|---|---|
| `space/16` vale 16 em todo projeto. `text/primary` muda de cor, mas é sempre o texto principal. | `background/blue`, que vira mentira quando a marca do projeto é verde. |

## **3. Reutilize antes de criar**

Antes de propor um token novo, procure um que já sirva. Cada token a mais é mais um nome para todo mundo aprender e manter.

| **Certo** | **Errado** |
|---|---|
| Usar `text/secondary` numa legenda. | Criar `text/caption` com o mesmo valor de `text/secondary`. |

## **4. Comece no projeto; promova com evidência**

O que nasce da necessidade de um projeto fica nele, na coleção Específicos. Só vira token de todos quando se repete em vários projetos. A seção 06 explica o caminho.

| **Certo** | **Errado** |
|---|---|
| `background/reading` nasce na camada Específicos e sobe para a Semântica se três projetos precisarem dele. | Criar um token novo na camada Semântica que só um projeto usa. |

## **5. Todo token diz quanto pode mudar**

A descrição de cada token informa se ele é Travado, Ajustável ou Livre. Você lê isso antes de mexer, e não depois.

| **Certo** | **Errado** |
|---|---|
| A descrição de `border/strong` diz se ele é Travado, Ajustável ou Livre e qual é o limite. | Um token sem descrição, que alguém muda sem saber o efeito nas telas. |

## **6. Prefira regras verificáveis a bom senso**

Uma regra boa é aquela que qualquer pessoa consegue conferir sem perguntar a ninguém. "Bom senso" muda de pessoa para pessoa; um número, não.

| **Certo** | **Errado** |
|---|---|
| "texto com contraste de pelo menos 4,5:1"; "medidas em múltiplos de 4". | "contraste suficiente"; "espaçamento confortável". |

## **7. Registre o porquê**

Toda decisão e todo token guardam o motivo. Quem chegar depois de você precisa entender por que algo existe antes de mudar.

| **Certo** | **Errado** |
|---|---|
| A descrição diz quando usar e quando não usar o token; o Histórico guarda o par antigo e indica o novo quando um nome muda. | Renomear um token sem registrar qual é o substituto. |
