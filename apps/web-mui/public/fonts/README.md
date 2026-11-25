# Fontes

`Satoshi-Variable.woff2` não é versionado: a licença da Satoshi (ITF Free Font License, Fontshare) proíbe
distribuí-la por repositório ou servidor público. O arquivo é baixado da Fontshare por `pnpm --filter web-mui fonts`
(`scripts/fetch-fonts.ts`), que roda sozinho antes de `dev` e `build`. Sem rede, o app sobe com o fallback
(`local("Satoshi Variable")`, depois `system-ui`). Também dá para baixar o zip em https://www.fontshare.com/fonts/satoshi
e copiar `Fonts/WEB/fonts/Satoshi-Variable.woff2` para esta pasta.
