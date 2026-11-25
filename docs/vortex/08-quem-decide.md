# **Seção 08 - Quem decide e registro de mudanças**

Esta seção responde: quem decide o quê, e onde fica registrado? Hoje o modelo é centralizado: os estagiários trabalham com a lead de design e o lead de front. Quando os projetos passarem a consumir os tokens por conta própria, o modelo vira federado, e esta seção muda. Os registros ficam no quadro Registro do arquivo do Figma de cada projeto. O designer preenche, e a lead aprova ali. As tabelas desta seção são exemplos de preenchimento.

## **Quem faz o quê**

| **Quem** | **O que faz** | **O que não faz** |
|---|---|---|
| Designer | Usa os tokens, propõe Específicos, registra o projeto, os Específicos e as exceções no quadro Registro | Muda a Base ou o arquivo do laboratório |
| Lead de design | É a curadora: revisa e aprova no quadro Registro, decide divergências, muda a Base e publica as versões. Tudo é documentado sob a responsabilidade dela | — |
| Lead de front e quem cuida do front-end do projeto | O lead de front garante o código. Quem cuida do front-end do projeto recebe o JSON e converte. Os dois propõem tokens por pull request ou na sprint (seção 06) | Cria token direto no código |
| IA | Aplica os valores seguindo a documentação | Cria token novo (fora do Catálogo) |

## **Quem aprova o quê**

| **Mudança** | **Quem aprova** | **Onde fica registrado** |
|---|---|---|
| Específico novo | A lead de design | Quadro Registro: Específicos aprovados |
| Promoção à Semântica (mesma necessidade em 3 ou mais projetos) | A lead inicia e escolhe o nome | Quadro Registro: Histórico de versões |
| Mudança na Base (passo novo, paleta nova, nome novo) | Só a lead | Quadro Registro: Histórico de versões |
| Arquivo e documentação do laboratório | Só a lead atualiza; os outros só visualizam | Quadro Registro: Histórico de versões |
| Desvio de uma regra que não é token | Só a lead | Quadro Registro: Exceções às regras |

## **Situações de um token**

| **Situação** | **O que quer dizer** | **Quem muda** | **Cor no figma** |
|---|---|---|---|
| Proposto | O token foi criado e espera aprovação | Quem propõe cria assim | `warning` |
| Em uso | Aprovado; pode ser aplicado | A lead, ao aprovar | `success` |
| Em desuso | Vai sair na próxima versão; use o substituto | A lead, ao publicar | `danger` |

## **Desuso**

Um token não sai de uma vez. Primeiro ele fica em desuso por uma versão, com o substituto escrito na descrição, e só sai na versão seguinte. O histórico guarda para sempre o par antigo → novo.

Exemplo de descrição, no rótulo Situação: “Em desuso desde 2027.03.05. Use `text/secondary`.”

**Certo**: marcar em desuso numa versão, com o substituto, e remover na seguinte.

**Errado**: apagar o token na mesma versão, ou marcar em desuso sem dizer o que usar no lugar.

## **Versões**

A versão é a data da publicação, como 2026.12.04. Cada projeto sabe de qual versão saiu, pela lista de projetos. Para atualizar, leia no histórico as linhas depois da sua versão de origem: onde a coluna “Os projetos precisam ajustar algo?” diz Sim, siga o que está em Antigo → novo.

## **Lista de projetos**

Quem preenche: o designer, ao duplicar o arquivo do laboratório.

| **Projeto** | **Versão de origem** | **Quem duplicou** | **Data** | **Usa o grupo** **`data`****?** |
|---|---|---|---|---|
| Exemplo: app de leitura  | 2026.12.04  | Nome do designer  | 2026.12.10  | Não |

## **Específicos aprovados**

Quem preenche: o designer; a lead aprova. A coluna Necessidade é o que mostra quando projetos diferentes pedem a mesma coisa com nomes diferentes.

| **Projeto** | **Token** | **Uso** | **Necessidade (uma frase)** | **Data** | **Aprovado por** | **Situação** |
|---|---|---|---|---|---|---|
| Exemplo: app de leitura | `background/reading` | Fundo da tela no modo de leitura | Um fundo mais quente só para leitura longa | 2026.12.15 | Lead de design | Em uso |

## **Histórico de versões**

Quem preenche: a lead, ao publicar.

| **Versão** | **O que mudou** | **Antigo → novo** | **Os projetos precisam ajustar algo?** | **Quem publicou** |
|---|---|---|---|---|
| 2026.12.04 | Primeira publicação | — | Não | Lead de design |

## **Exceções às regras**

Quem preenche: o designer; a lead aprova. Vale para o desvio de uma regra que não é token. Token novo segue a seção 06, e o que fica fora dos tokens já é uma lista fechada.

| **Projeto** | **Regra** | **O que foi feito** | **Por quê** | **Alternativas** | **Quem aprovou** | **Data** | **Situação** |
|---|---|---|---|---|---|---|---|
| Exemplo: sistema antigo | Texto com 4,5:1 | Uma tela antiga fica abaixo de 4,5:1 até o redesenho | A tela sai na próxima versão do sistema | Trocar a referência só nessa tela (mudaria o projeto todo) | Lead de design | 2026.12.20 | Aberta até o redesenho |
