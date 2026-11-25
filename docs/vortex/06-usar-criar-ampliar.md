# **Seção 06 - Usar, criar e ampliar**

Esta seção responde a uma pergunta: não achei o token, e agora? Leia antes de criar qualquer token. Quase sempre a resposta é usar um que já existe.

## **Usar**

- Na tela, aplique só tokens da Semântica ou os Específicos do seu projeto. Nunca aplique um token da Base direto.
- Escolha pelo Uso e pelo Não usar do catálogo (seção 05). O nome diz para que o token serve, não qual é a cor.
- Sobre um fundo forte, use o par `on-` desse fundo. Sobre `background/action/primary`, o texto é `text/on-action-primary`.
- Não achou o que precisa? Responda as quatro perguntas abaixo, nesta ordem.

**Certo**: o texto de ajuda abaixo de um campo usa `text/secondary`.

**Errado**: aplicar `neutral/600` direto no texto de ajuda, ou digitar o código de um cinza.

| **Pergunta** | **Se a resposta é sim** | **Se a resposta é não** |
|---|---|---|
| **1.** Algum token que já existe serve? | Use esse token, mesmo que o valor não seja exatamente o que você imaginou | Vá para a pergunta 2 |
| **2.** A necessidade é só deste projeto? | Crie um Específico (passo a passo abaixo) | Vá para a pergunta 3 |
| **3.** A mesma necessidade já apareceu em 3 ou mais projetos? | Avise a lead de design: ela leva o token para a Semântica | Por enquanto, é um Específico: volte para a pergunta 2 |
| **4.** A necessidade exige um valor que a Base não tem? | Só a lead de design muda a Base (veja Mudar a Base) | Siga com o Específico ou com o pedido à lead |

A pergunta 1 tem um detalhe. Se o token certo existe, mas o valor não serve no projeto todo, troque a referência na Semântica, dentro do limite do Ajustável (seção 05). A troca muda o projeto inteiro. Se o valor não serve só em um lugar, é um Específico.

**Certo**: a marca é amarela, e o texto branco no botão principal não passa 4,5:1. Você troca a referência de `text/on-action-primary` para `neutral/900` e confere os dois modos.

**Errado**: criar `text/on-yellow`.

## **Criar um Específico**

**1.** Confira as quatro perguntas. O Específico é a resposta “sim” da pergunta 2.

**2.** Dê o nome com as regras da seção 04: propriedade, papel e, se precisar, ênfase ou estado. Use as palavras da lista; se o papel não existir, crie uma palavra que descreva o uso. Nunca use a aparência, o componente nem o nome do projeto.

**3.** Crie a variável na coleção `specific` do arquivo do projeto.

**4.** Aponte para um token da Base. Nunca digite o valor e nunca aponte para um token da Semântica.

**5.** Preencha os dois modos, light e dark, e confira o contraste nos dois com a tabela da seção 05.

**6.** Defina o escopo, para a variável aparecer só onde pode ser usada. Um fundo aparece só em preenchimento.

**7.** Escreva a descrição com os seis rótulos: Uso, Não usar, Par, Flexibilidade, Situação e Valor. A situação começa como Proposto.

**8.** Registre a proposta no quadro Propostas de tokens, na página de Específicos do arquivo do projeto: duplique a tabela do modelo e preencha a coluna Valor.

**9.** Espere a aprovação da lead de design. Registre o token em Específicos aprovados, no quadro Registro. A lead aprova ali, e a situação passa para Em uso.

**10.** Avise quem cuida do front-end do seu projeto. Essa pessoa recebe o JSON e converte para o código.

**Certo**: um app de leitura precisa de um fundo mais quente só no modo de leitura. `background/surface` não serve, e trocar a referência dele mudaria o projeto todo. Você cria `background/reading`, aponta para a Base nos dois modos e registra a proposta.

**Errado**: `background/sepia` (aparência); `background/reader-card` (componente); `leitura/background/reading` (nome do projeto). Também é errado criar um Específico para algo que um token já cobre: triagem urgente num app de saúde é `danger`, porque `danger` vale para o que é crítico ou urgente, não só para erro.

## **Modelo da proposta de tokens:**

| **Campo** | **O que escrever** | **Exemplo** |
|---|---|---|
| Nome | O nome completo | `background/reading` |
| Coleção | Sempre `specific` | `specific` |
| Uso | Para que serve | Fundo da tela no modo de leitura |
| Não usar | Onde ele erra | Para cartões e áreas comuns: use `background/surface` |
| Par | Os tokens que trabalham com ele | `text/primary`, `text/secondary` |
| Claro | O token da Base no modo `light` | Um passo de uma paleta da Base |
| Escuro | O token da Base no modo `dark` | Um passo de uma paleta da Base |
| Por que nenhum token serve | O que falta nos tokens que existem | `background/surface` é o fundo de todas as áreas; trocar a referência mudaria o projeto todo |
| Projeto | O nome do projeto | O app de leitura |
| Quem propõe | Nome de quem propõe | Quem desenhou a tela |
| Data | O dia da proposta (AAAA.MM.DD) | O dia em que você registra |
| Situação | Sempre Proposto | Proposto |

A proposta aprovada já é a descrição do token: ninguém reescreve.

## **Pedir um token para a Semântica**

Quando a mesma necessidade aparece em 3 ou mais projetos, mesmo com nomes diferentes, a lead de design inicia a promoção desses tokens à camada Semântica. Se você notar a repetição, avise a lead. Com nomes diferentes, ela escolhe um, e os outros projetos renomeiam o seu Específico. O nome escolhido não muda ao subir. Na atualização seguinte, cada projeto apaga o seu Específico e aplica o token da Semântica, que tem o mesmo nome; o código não muda.

**Certo**: três projetos criaram `background/reading`, `background/reader` e `background/long-text` para a mesma coisa. A lead escolhe `background/reading`, e dois projetos renomeiam.

**Errado**: cada projeto seguir com o seu nome, ou manter o Específico depois que o token chegou à Semântica.

## **Mudar a Base**

Só a lead de design muda a Base. Exemplos: um passo novo numa escala, uma paleta nova ou um nome novo. Se a sua tela precisa de um valor que a Base não tem, leve o caso para a lead.

**Certo**: o designer precisa de uma borda de 10 px, vê que a escala de `border-width` vai até 8 e leva o caso para a lead. Se o projeto só quer bordas mais grossas, como 3 px, não é caso para a lead: `border-width/3` já existe, e basta trocar a referência na Semântica.

**Errado**: criar `border-width/10` na Base do próprio projeto.

## **Recuperar um grupo opcional**

Você apagou `data` ou uma paleta `brand-n` e agora o projeto precisa dela. O grupo volta igual ao do arquivo do laboratório: não invente nomes nem valores.

**1.** No arquivo do laboratório, localize o grupo nas páginas Base e Semantic: na Base, `data-1` a `data-6` (ou `brand-n`); na Semântica, `data/*` (ou `background/accent-n/*`, `text/on-accent-n-strong` e `icon/on-accent-n-strong`).

**2.** Peça à IA que recrie as variáveis no seu arquivo com os mesmos nomes, escopo e descrição, pelo prompt “Recuperar grupo opcional” da seção 10, “Configurar o projeto com IA”. Envie junto o link da documentação oficial.

**3.** Na Base, use os valores do laboratório (`data`) ou os da sua marca (`brand-n`). Na Semântica, use as referências padrão do Catálogo nos dois modos.

**4.** Confira o contraste com a tabela da seção 05.

**5.** Avise quem cuida do front-end: o JSON do projeto muda.

## **O que fica fora dos tokens**

Só o que não é interface fica fora dos tokens. A lista é fechada:

- ilustração;
- foto;
- logo de terceiros, como parceiro ou patrocinador.
- o desenho dos ícones (forma, traço e espessura do traço), que vem da biblioteca de ícones do projeto. A cor do ícone continua usando `icon/*`.

Todo o resto usa token, inclusive gráficos: eles têm o grupo opcional data (seção 05). Se você está digitando um código de cor ou um número solto em qualquer outra coisa, pare e volte às quatro perguntas.

**Certo**: a ilustração de 12 cores da tela inicial fica como está. 

**Errado**: criar 12 Específicos, de `background/illustration-1` a `-12`.

**Certo**: o ícone da biblioteca entra com o traço que tem e recebe a cor `icon/secondary`.

**Errado**: criar um Específico para o traço de 1,5 px do ícone.

## **Desenvolvedores**

Quem desenvolve segue as mesmas quatro perguntas. Para propor um token, abra um pull request ou leve na sprint, com o designer do projeto ou a lead de design. Nunca crie o token direto no código.

**Certo**: precisa de uma sombra para um item sendo arrastado, confere se `shadow/overlay` serve e, se não servir, propõe na sprint.

**Errado**: criar a sombra direto no código.

## **Casos**

| **Situação** | **Caminho certo** | **Erro comum** |
|---|---|---|
| O texto de ajuda abaixo de um campo precisa ser mais discreto | Pergunta 1: `text/secondary` já existe | Criar `text/helper` ou digitar um cinza |
| A marca é amarela, e o texto branco no botão principal não passa 4,5:1 | Trocar a referência de `text/on-action-primary` para `neutral/900` e conferir os dois modos | Criar `text/on-yellow` |
| Um app de saúde precisa de um fundo para triagem urgente | Pergunta 1: `background/danger/subtle` ou `/strong` já servem. danger vale para o que é crítico ou urgente, não só para erro | Criar `background/triage-urgent` |
| Um app de leitura precisa de um fundo mais quente só no modo de leitura | Pergunta 2: Específico `background/reading`, apontando para a Base nos dois modos, com proposta e aprovação da lead | Trocar a referência de `background/surface` (muda o projeto todo); `background/sepia`; `leitura/background/reading` |
| Um único card precisa de 20 px de padding | Pergunta 1 primeiro: `space/medium` (16) ou `space/large` (24) servem? Se o design precisa de 20 só ali, Específico com nome de uso | Trocar `space/medium` para 20 (muda o projeto todo); `space/card` (nome de componente); digitar 20 |
| Três projetos criaram nomes diferentes para a mesma coisa | Pergunta 3: a lead inicia a promoção, escolhe um nome, e os outros projetos renomeiam | Cada projeto seguir com o seu |
| O projeto quer bordas de 3 px no lugar de 2 | Pergunta 1: `border-width/3` existe na Base. Trocar a referência de `border-width/strong` para `border-width/3` (Ajustável). Só um valor fora da escala de 0,5 a 8 vai para a lead (pergunta 4) | Criar um Específico como `border-width/thick` ou digitar 3 |
| A tela inicial tem uma ilustração com 12 cores | A ilustração fica fora dos tokens | Criar 12 Específicos |
| O desenvolvedor precisa de uma sombra para um item sendo arrastado | Pergunta 1: `shadow/overlay` serve? Se não, propõe na sprint ou por pull request | Criar a sombra direto no código |
