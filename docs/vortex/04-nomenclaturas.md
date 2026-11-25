# **Seção 04 - Nomenclaturas**

Todo nome segue a mesma ordem: o que o token pinta ou mede, para que serve e, quando houver, a ênfase e o estado.

![](https://www.figma.com/spec/hXapRD3m5N74rS4yYwEKRJ/image/8698c906296fb2f77a9f6d50255adbf44d5a6fce?w=2048&h=969)

Leia um nome da esquerda para a direita, como uma frase: `background/action/primary-hover` é "o fundo da ação principal quando o mouse está em cima".

## **Como se escreve**

- Tudo em minúsculas, sem acento e sem espaço.
- Barra (/) entre os grupos; hífen (-) dentro de um mesmo nível.
- Em inglês, com palavras inteiras: background, nunca bg; information, nunca info.
- **Certo**: `background/action/primary-hover`.
- **Errado**: `Background/Action/Primary/Hover` (maiúsculas e estado como grupo); `bg-primary` (abreviação e sem barra).

## **Nomes da Base**

Na Base, o nome diz qual valor está guardado. A cor leva a paleta e o passo; a medida leva o próprio valor; a família de fonte leva o papel.

| **Grupo** | **Padrão** | **Exemplo** |
|---|---|---|
| Cor | paleta/passo | `brand-1/500`, `neutral/900`, `danger/500` |
| Neutro | `neutral/` de 0 (branco) a 1000 (preto) | `neutral/0`, `neutral/1000` |
| Espaço | `space/` + valor | `space/16` |
| Raio | `radius/` + valor | `radius/8` |
| Espessura de borda | `border-width/` + valor (com `_` para indicar ponto) | `border-width/0_5`, `border-width/1` |
| Opacidade | `opacity/` + valor | `opacity/40` |
| Tamanho de fonte | `font-size/` + valor | `font-size/16` |
| Peso de fonte | `font-weight/` + valor | `font-weight/600` |
| Família de fonte | `font-family/` + papel | `font-family/primary` |
| Altura de linha | `line-height/` + valor | `line-height/24` |
| Espaçamento entre letras | `letter-spacing/` + valor | `letter-spacing/0` |

## **Nomes da Semântica**

Na Semântica, o nome diz para que o token serve. A barra separa no máximo três partes: a propriedade, o papel e o par variante-estado. O estado vai sempre colado com hífen e nunca vira um grupo próprio. Quando não há variante, o nome fica com dois níveis.

- `text/primary`: propriedade + ênfase
- `background/action/primary`: propriedade + papel + variante
- `background/action/primary-hover`: o mesmo, com o estado

Exceção, tokens compostos: tipografia e sombra seguem composto/papel/campo e podem ter quatro partes: `typography/body/medium/font-size`, `shadow/raised/blur`. Tudo de um estilo fica no mesmo grupo.

O grupo tem o mesmo nome nas duas coleções: `space/16` na Base e `space/medium` na Semântica. Quem diz a camada é a coleção, não o nome.

## **Palavras que você pode usar**

Use só as palavras da lista. Se nenhuma servir, veja "Específicos", abaixo.

| **Posição** | **Palavras** | **Onde aparecem** |
|---|---|---|
| Propriedade | `text`, `icon`, `background`, `border`, `space`, `radius`, `border-width`, `opacity`, `data` (opcional); compostos: `typography`, `shadow`  | Primeiro nível de todo nome |
| Ênfase de texto e ícone | `primary`, `secondary`, `tertiary` | `text`, `icon` |
| Ênfase de fundo e borda | `subtle`, `strong` | `background`, `border` |
| Superfície | `canvas`, `surface`, `surface-raised`, `inverse`, `backdrop` | `background` |
| Ação | `action/primary`, `action/secondary`, `action/danger`, `action/tertiary` só com estado | `background` |
| Feedback | `danger`, `warning`, `success`, `information` | `text`, `icon`, `background`, `border` |
| Destaque | `accent-1` a `accent-4`; cada um usa a `brand` de mesmo número, e `accent-2` a `accent-4` são opcionais | `background`; o par `on` em `text` e `icon` |
| Neutro | `neutral`: fundo sem significado de cor, com `subtle` e `strong` | `background`; o par `on` em `text` e `icon` |
| Série de gráfico | `categorical-1` a `categorical-6`, `sequential-1` a `sequential-5` | `data` |
| Estado no fim do nome | `hover`, `pressed` | `primary-hover` |
| Estado como papel | `selected`, `focus` | `background/selected`, `border/focus` |
| Texto e ícone específicos | `link` (só em text), `placeholder`, `brand` | `text`, `icon` |
| Tamanho | `none`, `xx-small` a `xx-large`, `full` só em `radius` | `space`, `radius` |
| Espessura | `default`, `strong`, `focus`, `selected` | `border-width` |
| Opacidade | `disabled`, `backdrop` | `opacity` |
| Tipografia | `display`, `heading`, `body`, `label`, seguidos de `/small`, `/medium`, `/large` | `typography` |
| Sombra | `raised`, `overlay` | `shadow` |
| Campo do composto | Tipografia: `font-size`, `line-height`, `font-weight`, `letter-spacing`,  `font-family`.  Sombra: `offset-x`, `offset-y`, `blur`, `spread`, `color` | Último nível de `typography` e `shadow` |

`primary` quer dizer "maior destaque", nunca "cor da marca". Desabilitado não tem token de cor: usa `opacity/disabled`.

## **Texto e ícone sobre fundo forte**

Quando o texto ou o ícone fica em cima de um fundo forte, o nome é on- + o nome do fundo sem `background/`. As barras que sobram viram hífen: `background/danger/strong` → `text/on-danger-strong`; `background/action/primary` → `text/on-action-primary`. O par não muda no hover nem no pressed.

- **Certo**: `background/action/primary` → text/on-action-primary e `icon/on-action-primary`; `background/inverse` → `text/on-inverse`
- **Errado**: `text/on-dark`, `text/white` (cor no nome; erra no modo escuro)

## **Estilos**

- Texto: papel/tamanho, como `body/medium` ou `heading/large`.
- Efeito: `shadow/raised` e `shadow/overlay`.

## **Específicos**

Um Específico segue exatamente as mesmas regras da Semântica, sem o nome do projeto. Use primeiro as palavras da lista. Se o papel não existir nela, crie uma palavra nova que descreva o uso, nunca a aparência nem o componente.

- **Certo**: `background/reading` (exemplo de Específico)
- **Errado**: `leitura/background/reading` (nome do projeto), `background/sepia` (aparência/cor), `background/reader-card` (componente)

O nome precisa nascer certo: se o token subir para a Semântica, ele não muda.

## **No Figma e no código**

No Figma, o nome é escrito exatamente assim, nas coleções `base`, `semantic` e `specific`. No código, o desenvolvimento adapta a forma à linguagem (com ponto, hífen ou maiúscula), mas as palavras são as mesmas.

## **Antes de nomear**

- Já existe um token que serve? Se sim, use ele.
- Qual é a propriedade: o que o token pinta ou mede?
- Qual papel da lista descreve o uso?
- Precisa de ênfase ou de estado?

![](https://www.figma.com/spec/hXapRD3m5N74rS4yYwEKRJ/image/64e7d19aa085bb67202742e7b72bb8a25c3df978?w=2048&h=1869)

Responda as perguntas da esquerda para a direita e escolha uma palavra de cada coluna. Quando uma pergunta não se aplica, pule a coluna: o nome fica mais curto, nunca com uma palavra inventada para preencher.

Para criar um token novo, siga a seção Usar, criar e ampliar. A lista completa de tokens está no Catálogo.
