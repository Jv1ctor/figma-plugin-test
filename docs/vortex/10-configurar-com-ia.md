# **Seção 10 - Configurar o projeto com IA**

## **Como usar**

**1.** Duplique o arquivo do laboratório no Figma. A IA só trabalha no arquivo duplicado, nunca no original.

**2.** Responda o questionário de identidade abaixo.

**3.** Abra a IA que tem acesso ao Figma (pelo MCP ou pela Plugin API) e envie, na mesma mensagem: o link da documentação oficial, o link do arquivo duplicado, o questionário respondido e o prompt principal.

**4.** A IA trabalha em etapas e para no fim de cada uma. Leia o que ela mostrou e responda "ok" ou peça a correção antes de seguir.

**5.** No fim, copie a linha do relatório para a lista de projetos do quadro Registro, na página Specifics do seu arquivo (modelo na seção 08), e avise quem cuida do front-end.

Sempre envie o link da documentação oficial. Sem ele, a IA trabalha pelo que lembra e erra nomes, limites e descrições.

## **Questionário de identidade**

Responda em texto, uma linha por pergunta. Quando não souber, escreva "padrão": a IA mantém o valor do laboratório.

**1.** Nome do projeto.

**2.** Cor principal da marca (vira brand-1): um código de cor ou a paleta de 50 a 950.

**3.** Cores secundárias (brand-2 a brand-4): um código de cor para cada, ou "não usa".

**4.** Neutro: padrão do laboratório, mais quente, mais frio ou paleta própria (0 a 1000).

**5.** Fonte dos títulos (display e heading) e os pesos que ela tem.

**6.** Fonte do texto (body e label) e os pesos que ela tem.

**7.** Peso dos títulos: padrão (700) ou outro peso que a fonte tenha.

**8.** Densidade: compacta, padrão ou arejada.

**9.** Cantos: retos, suaves, padrão ou bem arredondados.

**10.** Bordas: finas, padrão ou grossas.

**11.** Tamanho dos títulos de destaque (display): menores, padrão ou maiores.

**12.** Página e superfícies: página branca com superfície tingida, ou página tingida com superfície branca.

**13.** O projeto tem gráficos? Sim ou não.

Não existe tabela fixa que converta cada resposta em tokens. A IA propõe as trocas de referência dentro dos limites da seção 05 e espera o seu ok.

## **Prompt para configurar**

```plain
# Papel
Você vai configurar os Design Tokens de um projeto no Figma, num arquivo duplicado do arquivo do laboratório. O arquivo já tem todas as coleções, variáveis, estilos e páginas. Você ajusta o que o questionário pede, apaga os grupos opcionais que o projeto não usa e confere. Você aplica e documenta; não decide. Nunca crie um token, nunca mude um nome e nunca invente um valor.
# Fontes, em ordem de autoridade
1. A documentação oficial: [link]. O Catálogo (seção 05) é a lista completa de tokens, descrições e limites.
2. O questionário de identidade respondido (abaixo).
3. Este prompt.
Se duas fontes se contradizem, vale a de cima. Se a documentação for ambígua ou não responder, pare e pergunte. Não escolha por conta própria.
# Arquivo
- Arquivo duplicado do projeto: [link]
- Versão de origem da documentação: [ex.: 2026.12.04]
# Questionário de identidade
[cole aqui as 13 respostas]
# Regras que não mudam
- Coleções: base (um modo, value), semantic e specific (modos light e dark). Nenhuma outra.
- Nomes exatamente como no Catálogo, em inglês e minúsculas. Barra entre os níveis; hífen só dentro do nível e no estado (background/action/primary-hover). Casa decimal com sublinhado (border-width/0_5).
- base: só valores, sem escopo. semantic e specific: só referências para variáveis da base, nos dois modos. Nunca valor digitado, nunca referência para outra variável da semantic, nunca variável de outro arquivo.
- Travado não muda: escalas de space, radius, border-width, opacity, font-size, line-height, font-weight e letter-spacing da base; paletas de feedback; neutral/0 = #FFFFFF e neutral/1000 = #000000.
- Ajustável muda só dentro do limite da seção 05. Em space e radius, um nome nunca fica maior que o seguinte (small pode ser igual a medium, nunca maior). Em border-width da semantic, qualquer valor de 0,5 a 8 px; o foco nunca abaixo de 2.
- Medidas em px no Figma. O rem vai só na descrição (16 px = 1 rem), menos em border-width, que fica só em px.
- Escopo por grupo (nomes da Plugin API):
  text → TEXT_FILL
  icon → SHAPE_FILL, STROKE_COLOR
  background → FRAME_FILL, SHAPE_FILL
  border → STROKE_COLOR
  data → FRAME_FILL, SHAPE_FILL, STROKE_COLOR
  space → GAP
  radius → CORNER_RADIUS
  border-width → STROKE_FLOAT
  opacity → OPACITY
  typography/{papel}/{tamanho}/font-size → FONT_SIZE; /line-height → LINE_HEIGHT; /font-weight → FONT_WEIGHT; /letter-spacing → LETTER_SPACING
  typography/{papel}/font-family → FONT_FAMILY
  shadow/{papel}/offset-x, offset-y, blur, spread → EFFECT_FLOAT; shadow/{papel}/color → EFFECT_COLOR
  base → nenhum escopo
  Confira o escopo no Figma, não no JSON exportado: o JSON muda alguns nomes.
- Grupos opcionais: se brand-2, brand-3 ou brand-4 não existem, apague a paleta e o accent do mesmo número (background/accent-n/*, text/on-accent-n-strong, icon/on-accent-n-strong). Se o projeto não tem gráficos, apague data-1 a data-6 e todo o grupo data. É tudo ou nada: não deixe órfãos.
- Estilos de texto ligam só variáveis da semantic: typography/{papel}/{tamanho}/font-size, line-height, font-weight e letter-spacing, e typography/{papel}/font-family. Estilos de efeito ligam shadow/{papel}/offset-x, offset-y, blur, spread e color.
- Foco: anel que contorna o elemento por fora, separado dele por um vão. border/focus precisa de 3:1 contra o fundo que aparece no vão. Nunca remova o foco.
- background/backdrop é opaco. A transparência vem de opacity/backdrop, aplicada na camada.
# Descrições
- Toda variável da semantic tem seis rótulos, nesta ordem, um por linha:
  Uso: …
  Não usar: …
  Par: … (ou —)
  Flexibilidade: …
  Situação: Em uso
  Valor: referência claro | referência escuro
- Na medida, Valor é a referência com px e rem: space/16 (16 px · 1 rem). Em border-width, só px. No peso, o nome junto: font-weight/700 (700 · Bold).
- O texto vem do Catálogo. Linhas que valem para uma família: troque [paleta], n, {papel} e {tamanho} pelo nome real. Em icon, copie a linha de text trocando "texto" por "ícone", menos em icon/placeholder, icon/tertiary e icon/brand, que têm texto próprio no Catálogo de cor.
- Uso e Não usar dizem o papel na interface (para que serve e em que situação), nunca o componente. Nomes de componente (botão, campo, cartão, menu, modal…) não entram nas descrições do Figma.
- Estilo de texto: Uso, Não usar, Variáveis, Valor (ex.: 16/24 px · 400 · [fonte]). Estilo de efeito: Uso, Não usar, Par, Variáveis, Valor.
- Na base, a descrição tem só Valor (em font-weight, o nome do peso: 700 = Bold).
- A descrição acompanha o valor: sempre que trocar um valor da base ou uma referência da semantic, atualize na mesma hora a linha Valor da variável e, se ela faz parte de um estilo, a linha Valor do estilo.
# Ordem de trabalho
Faça uma etapa por vez. No fim de cada uma, mostre o que fez e espere o meu ok.
1. Leitura: leia a documentação e o arquivo. Liste os grupos que ficam, os que serão apagados e a contagem de variáveis por coleção. Aponte respostas do questionário que faltam ou contradizem a documentação.
2. Proposta: para cada resposta do questionário, proponha as trocas (valores da base que mudam; referências da semantic que mudam, com antes e depois nos dois modos), sempre dentro do limite da seção 05. Não aplique nada antes do meu ok.
3. Base: troque os valores aprovados (brand-n, neutral, font-family/primary e /secondary) e atualize as descrições.
4. Semantic: troque as referências aprovadas e atualize a linha Valor de cada variável mudada.
5. Grupos opcionais: apague o que o projeto não usa, sem deixar órfãos.
6. Estilos: confira as ligações dos 12 estilos de texto e dos 2 de efeito e atualize a linha Valor dos que mudaram.
7. Conferência com prova (abaixo) e relatório final.
# Conferência com prova
Rode cada teste e, para cada "conferido", cite o teste e a prova lida no arquivo (nome, valor, número). Calcule; não estime.
T-01 Nomes: todo nome do projeto existe no Catálogo; o que falta é só grupo opcional apagado.
T-02 Coleções e modos: base (value), semantic e specific (light, dark); nenhuma outra.
T-03 Referências: 100% das variáveis da semantic e da specific apontam para a base local, nos dois modos; 0 valor digitado; 0 variável de outro arquivo.
T-04 Travados: 0 diferença nas escalas e nas paletas de feedback em relação ao oficial.
T-05 Limites do Ajustável: space e radius sem nome maior que o seguinte; altura de linha 1,3 × (display e heading) ou 1,5 × (body e label) o tamanho, arredondada para um valor da base; text/danger e afins dentro da própria paleta.
T-06 Escopos: iguais à lista acima; base sem escopo.
T-07 Descrições: seis rótulos na ordem; Valor igual à referência real nos dois modos; Uso e Não usar sem nome de componente.
T-08 Grupos opcionais: nenhum órfão.
T-09 Contraste (WCAG 2.2 AA), nos dois modos, cada elemento contra o fundo onde fica:
  - texto (text/*): 4,5:1. Você confere tokens, não telas, e o mesmo token aparece em texto pequeno; não aprove nenhum text/* com menos de 4,5:1, mesmo que hoje ele só apareça em texto grande;
  - ícone que informa: 3:1;
  - limite de controle (border/strong, border/selected, fundo do controle): 3:1 contra o fundo ao redor;
  - anel de foco (border/focus): 3:1 contra o fundo do vão;
  - série de gráfico (data/*): 3:1 contra background/canvas e background/surface;
  - desabilitado: isento; decoração (border/subtle, background/backdrop): sem mínimo.
  Liste cada par com o valor calculado.
T-10 Estilos: 5 ligações à semantic por estilo de texto e 5 por estilo de efeito; descrição igual ao valor real.
T-14 Só diferenças permitidas: cada diferença em relação ao oficial é Livre, Ajustável dentro do limite ou grupo opcional.
Se um teste falhar, não corrija sozinho: mostre a falha e proponha a correção dentro do limite da seção 05.
# Quando faltar algo
- Precisa de um token que não existe: não crie. Siga as quatro perguntas da seção 06. Se a resposta for um Específico, registre a proposta no quadro Propostas de tokens da página Specifics, com Situação: Proposto. Quem preenche é o designer; a lead aprova.
- Uma resposta do questionário não cabe no limite da seção 05: pare, explique e pergunte.
# Relatório final
1. Contagem por coleção e por grupo.
2. Trocas aplicadas, com antes e depois.
3. Resultado de cada teste (T-01 a T-10 e T-14) com a prova.
4. Tabela de contraste: par, modo, mínimo exigido, valor, passa ou falha.
5. Propostas registradas e dúvidas em aberto.
6. Linha para a lista de projetos da seção 08: Projeto, Versão de origem, Quem duplicou, Data, Usa o grupo data?
```

## **Prompt extra: recuperar um grupo opcional**

```plain
# Papel
Você vai recriar um grupo opcional de Design Tokens que foi apagado deste arquivo de projeto no Figma. O grupo volta igual ao do arquivo do laboratório: mesmos nomes, escopos, descrições e referências. Não invente nomes nem valores.
# Fontes, em ordem de autoridade
1. A documentação oficial: [link]. O Catálogo (seção 05) tem todos os grupos.
2. O arquivo do laboratório: [link], só para leitura.
3. Este prompt.
# Dados
- Arquivo do projeto: [link]
- Grupo a recuperar: [data | brand-2 | brand-3 | brand-4]
- Valores (só para brand-n): [cor da marca ou paleta 50 a 950]
# O que recriar
- data: na base, data-1 a data-6 com os valores do laboratório; na semantic, todo o grupo data/*.
- brand-n: na base, a paleta brand-n com os valores da marca; na semantic, background/accent-n/*, text/on-accent-n-strong e icon/on-accent-n-strong.
# Regras
- Nomes, escopos e descrições iguais aos do laboratório, com os seis rótulos (Uso, Não usar, Par, Flexibilidade, Situação, Valor). Uso e Não usar sem nome de componente.
- Na semantic, use as referências padrão do Catálogo nos dois modos e escreva a linha Valor com a referência real.
- Não mexa em nenhuma outra variável.
# Ordem de trabalho
1. Liste o que vai criar, com nome, escopo e referência. Espere o meu ok.
2. Crie as variáveis.
3. Confira com T-01, T-03, T-06, T-07 e T-09 (contraste dos novos pares nos dois modos) e cite a prova de cada um.
4. Relatório: o que foi criado, resultado dos testes e o aviso para quem cuida do front-end de que o JSON do projeto mudou.
```
