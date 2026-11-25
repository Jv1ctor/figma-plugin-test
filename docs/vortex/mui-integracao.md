MUI — Biblioteca integrada aos tokens do Vortex

Objetivo

Trazer a biblioteca oficial do Material UI para dentro deste arquivo como componentes principais locais e ligá-los às variáveis e estilos do Vortex. Assim, quem altera um token na página Design Tokens vê a mudança em todos os componentes, sem editar componente por componente.

Como a integração funciona

• A página Design Tokens continua sendo a fonte de verdade. Nenhum token foi criado, renomeado ou teve valor alterado (os testes alteraram valores temporariamente e restauraram em seguida).  
• Os componentes usam só tokens da coleção semantic e os estilos de texto e de efeito do Vortex. Nenhum componente usa a base direto.  
• Onde o Vortex não tem token com Uso documentado para aquela função, a propriedade ficou como no MUI e está listada em Lacunas, abaixo.

Regras de uso

1. Nas telas, use instâncias. Troque Variant, Size, Color, State e as outras propriedades no painel da direita.  
2. Para mudar a aparência, altere o token (dentro do nível Travado, Ajustável ou Livre da seção 05), nunca o componente principal.  
3. Ao criar uma variante ou um componente novo, ligue cada cor, medida e texto a um token da semantic. Se nenhum servir, siga as quatro perguntas da seção 06.  
4. Não crie tokens de componente (button/background etc.): a seção 03 diz que eles ainda não existem.  
5. Partes que continuam ligadas a variáveis do MUI (ver Lacunas) não são referência de cor do projeto.

Origem dos componentes

Fonte: Material UI for Figma (and MUI X), versão Community, pela biblioteca publicada da MUI que o Design Kit usa. Método: cada component set foi importado pela chave e clonado como component set local, com todas as variantes, propriedades (boolean, texto, troca de instância, slot), Auto Layout e componentes aninhados. O arquivo do MUI não foi alterado.  
Inventário: 51 componentes nas seções 02 a 07 (2.033 variantes) e 63 dependências internas na seção 09 (ícones e peças como <Tab>, <PaginationItem>, <Step>, <Accordion>). As instâncias aninhadas foram trocadas para as cópias locais: 0 instâncias remotas.  
Não importáveis pela chave (fora da biblioteca publicada): <AppBar>, <CardContent>, <CardActions>. O <Checkbox> veio a partir do mestre remoto carregado pelo FormControlLabel. Data: 2026.11.17.

Correspondências aplicadas (MUI → Vortex)

Botão Contained Primary · hover · pressed

background/action/primary · -hover · -pressed; texto text/on-action-primary

Botão Contained Secondary

background/action/secondary (+ estados); texto text/on-action-secondary

Botão Contained Error

background/action/danger (+ estados); texto text/on-action-danger

Botão Outlined/Text Primary, IconButton Default/Primary

ação terciária: text/primary, icon/primary, border/strong, background/action/tertiary-hover

State=Disabled (todas as variantes)

mesma aparência da variante habilitada + opacity/disabled na camada

Campo: contorno · foco · erro

border/strong · border/focus + border-width/focus · border/danger, text/danger

Checkbox, Radio, Switch, Slider marcados

border/selected; desmarcado border/strong; botão do switch background/surface-raised

Aba, página e passo selecionados

border/selected, background/selected, text/primary

Chip e Badge

Default background/neutral/subtle; Primary accent-1/strong; Secondary accent-2/strong; status nas paletas de feedback com o par on-

Avatar

background/neutral/strong + text/on-neutral-strong; radius/full

Alert Standard · Filled · Outlined

background/[paleta]/subtle + text/primary + icon/[paleta] · background/[paleta]/strong + text/on-[paleta]-strong · border/[paleta]

Snackbar e Tooltip

background/inverse + text/on-inverse

Paper, Card, Menu, Popover, Dialog, Drawer

background/surface ou surface-raised; shadow/raised (elevação até 11) e shadow/overlay (12 ou mais, Dialog e Drawer)

Divisor, borda de tabela, conector do Stepper

border/subtle

Fundo atrás do modal

background/backdrop + opacity/backdrop na camada

Link

text/link

Tipografia

button* e menu → label/*; body1 → body/medium; body2 e caption → body/small; h1–h3 → display/*; h4–h6 → heading/*; input/value → body/medium; input/helper → body/small

Raio

Botão, campo, grupo de botões → radius/x-small; menu, popover, snackbar → radius/small; card, paper, accordion → radius/medium; dialog → radius/large; tabela → radius/none; forma circular → radius/full; demais por valor igual

Espaço e espessura

padding e gap com valor igual a um passo (4, 8, 12, 16, 24, 32, 48) → space/*; borda 1 → border-width/default, 2 → border-width/strong (foco do campo: border-width/focus)

Lacunas: o que ficou como no MUI

Mantido com a variável, o estilo ou o valor original do MUI porque o Vortex não tem token com Uso documentado para a função. Cada item é candidato ao Decision Log do design system.  
• Ação sem preenchimento na cor da marca ou de status: Outlined/Text com Color Secondary, Error, Warning, Info ou Success. O Vortex só documenta a ação terciária neutra.  
• Ação preenchida Warning, Info, Success e Inherit: os fundos de status do Vortex não são para ações.  
• Halo de foco do MUI (focusVisible, preenchimento translúcido): o Vortex define foco como anel com vão, e a medida do vão entra com o design system.  
• Hover translúcido de ações coloridas (secondary/_states/hover etc.) e foco de Chip.  
• Elevação de controles: Button Contained, Fab, botão do Switch e polegar do Slider. O Vortex só documenta shadow/raised (menu, popover, cartão) e shadow/overlay (modal).  
• Indicador de progresso (Progress circular e linear): nenhum token de cor para ele.  
• Campo Filled (fundo) e borda de hover dos campos.  
• Rating, barra de rolagem nativa e preenchimento do Breadcrumbs recolhido.  
• Larguras do Dialog ligadas aos breakpoints do MUI: o Vortex não tem tokens de breakpoint.  
• Padding de 20 px (space/20 existe só na base) e outras medidas fora dos passos semânticos.  
• Título do Alert (alert/title, 16 px Medium): nenhum estilo de texto com esse Uso.  
• Texto em caixa alta dos botões do MUI: os estilos label do Vortex não têm caixa alta, então os botões passaram para caixa normal.  
• Os 24 níveis de elevação do Paper foram reduzidos aos 2 estilos do Vortex.

Testes de propagação (2026.11.17)

A · cor: text/primary (claro) → danger/600

1.306 nós nos componentes principais e 53 nas instâncias do Playground mudaram. Restaurado para neutral/900.

B · tipografia: typography/label/medium/font-size → font-size/20

823 textos nos principais e 29 nas instâncias passaram a 20 px. Restaurado para font-size/14.

C · raio: radius/x-small → radius/24

796 camadas, 3.094 de 3.094 cantos (os 4 cantos conferidos). Correções antes do resultado final: 126 botões dentro do ButtonGroup tinham raio fixo do MUI como override, e 378 cantos ficaram soltos ao lado de um canto ligado. Ambos foram ligados ao token. Restaurado para radius/8.

C · espaço: space/medium → space/24

1.101 nós nos principais e 35 nas instâncias. Restaurado para space/16.

D · base: brand-1/600 → verde

Propagou pelos semânticos que apontam para ele (background/action/primary, border/selected, border/focus e outros): 499 nós nos principais e 20 nas instâncias. Restaurado para #9246D7.

E · variantes

2.033 de 2.033 variantes têm referências a tokens do Vortex; 255 de 255 variantes desabilitadas usam opacity/disabled; 227 propriedades de componente disponíveis no painel.

Conferência das especificações do Vortex

• Nenhuma divergência entre a documentação e as variáveis nos pontos usados pela integração: 184 variáveis na semantic, 270 na base e 0 na specific; 12 estilos de texto com 5 ligações cada e 2 estilos de efeito; escopos iguais à lista da seção 10.  
• shadow/raised/color e shadow/overlay/color apontam para neutral/1000 com a opacidade ligada a opacity/10 e opacity/15, como diz o Catálogo.  
• Só a seção 09, Conversão para o Código, ainda está vazia.
