# **Seção 07 - O que evitar**

Esta lista junta os erros que mais aparecem. Confira antes de entregar uma tela ou uma proposta de token. Cada linha diz o que fazer no lugar e a seção que explica a regra.

## **Ao usar**

| **#** | **O que evitar** | **Em vez disso** | **Onde** |
|---|---|---|---|
| 1 | Digitar um valor solto (16, #1A73E8) quando existe token | Usar o token; se nenhum serve, seguir as quatro perguntas | 06 |
| 2 | Usar um token da Base direto na tela (`space/16`, `brand-1/500`) | Usar o token da Semântica que aponta para ele | 03 |
| 3 | Escolher um token pela cor, não pelo uso: `text/danger` num título só porque é vermelho, ou `background/action/primary` num badge que não é clicável, ou `text/link` num texto de marca que não navega | Escolher pelo Uso do catálogo; para destacar sem significado, `accent-n` (no badge, `background/accent-1/strong`); para texto de marca, `text/brand` | 05 |
| 4 | Indicar estado ou feedback só por cor | Cor, ícone e texto juntos | 05 |
| 5 | Aceitar algum elemento abaixo do contraste da seção 05, ou desenhar o anel de foco colado no elemento | Conferir o contraste ao criar ou trocar uma referência; desenhar o foco com vão | 05 |
| 6 | Usar uma paleta de status numa série de gráfico | `data/categorical-1` a `-6`; o vermelho fica para alerta | 05 |

## **Ao criar**

| **#** | **O que evitar** | **Em vez disso** | **Onde** |
|---|---|---|---|
| 7 | Criar token semântico para um caso de um projeto só | Criar em Específicos; promover com 3 projetos | 06 |
| 8 | Trocar a referência de um semântico para resolver o caso de uma tela | Criar um Específico: a troca vale para o projeto todo | 06 |
| 9 | Criar um Específico quando o projeto todo quer outro valor (`border-width/thick`) | Trocar a referência na Semântica | 05, 06 |
| 10 | Criar um Específico para o que um token já cobre (`background/triage-urgent`) | Usar o token: `danger` vale para erro, crítico ou urgente | 05, 06 |
| 11 | Apontar um Específico para um token da Semântica | Apontar para a Base | 03, 06 |
| 12 | Criar token de componente (`button/background`) | Usar o token do papel (`background/action/primary`) | 03 |
| 13 | Criar token “para o futuro”, sem uso real | Criar quando a primeira tela precisar | 02 |
| 14 | Criar token sem descrição ou com todos os escopos | Descrição com os seis rótulos e o escopo do grupo | 06 |
| 15 | Fazer espaço e raio dividirem a mesma escala | Grupos separados, mesmo com valores iguais | 03 |

## **Ao nomear e mudar**

| **#** | **O que evitar** | **Em vez disso** | **Onde** |
|---|---|---|---|
| 16 | Pôr cor ou valor no nome do semântico (`text/on-dark`, `background/blue`) | Nomear pelo papel (`text/on-inverse`, `background/accent-1/subtle`) | 04 |
| 17 | Pôr o nome do projeto ou do componente num Específico (`leitura/background/reading`, `background/reader-card`) | Nomear pelo uso: `background/reading` | 04 |
| 18 | Nomear feedback pela matiz (`red`, `green`) | `danger`, `warning`, `success`, `information` | 04 |
| 19 | Fazer do estado um grupo (`background/action/primary/hover`) | Estado com hífen no último nível: `primary-hover` | 04 |
| 20 | Mudar o valor de um token da Base com valor no nome (`space/16` = 20) | Trocar a referência na Semântica | 03 |
| 21 | Manter o Específico depois que o token subiu para a Semântica | Apagar o Específico e aplicar o da Semântica | 06 |
| 22 | Remover um token na mesma versão em que entra em desuso, ou sem substituto | Uma versão em desuso, com o substituto na descrição; sai na seguinte | 08 |

## **Antes de entregar suas tasks/tokens**

Responda as seis perguntas. Um “sim” nas três primeiras ou um “não” nas três últimas pede ajuste.

**1.** Tem algum valor digitado solto na tela? (item 1)

**2.** Tem algum token da Base aplicado direto? (item 2)

**3.** Algum elemento fica abaixo do contraste da tabela da seção 05 em um dos modos? (item 5)

**4.** Todo Específico novo tem proposta registrada? (item 14; seção 06, passo 8)

**5.** Todo nome novo descreve o uso, sem projeto, componente nem cor? (itens 16 e 17)

**6.** Toda variável e todo estilo que você mudou dizem o valor novo na linha Valor (seção 05, “A descrição acompanha o valor”)?
