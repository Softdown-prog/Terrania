# Migração experimental para TypeScript 7.0.2 (compilador nativo)

- Dependência TypeScript 7.0.2 no front e no servidor, com locks consistentes e pacotes opcionais nativos multiplataforma.
- `server/tsconfig.json` declara explicitamente `types: ["node"]`: TypeScript 7 não carrega tipos globais por padrão.
- `tsc --noEmit` no cliente, `tsc` com `rewriteRelativeImportExtensions` no servidor. Vite continua responsável pelos arquivos do navegador.
- Não alterar protocolos de jogo, gameplay, serviços nem deploys.
- Conferir `npm ci && npm run typecheck && npm test && npm run build` e `npm ci --prefix server && npm run typecheck --prefix server && npm test --prefix server && npm run build --prefix server`.
- Na integração, aprovar apenas após CI Linux e smoke Docker; não confundir CI aprovado com publicação em produção.
- Se o compilador nativo apontar incompatibilidades, corrigir na branch; jamais trocar `npm ci` por `npm install` para encobrir lock inconsistente.
