# Índice — scripts de build e ferramentas de desenvolvimento

## Navegação entre modelos de IA
- [find-ai-files.mjs](find-ai-files.mjs): busca limitada de arquivos versionados pelo nome/caminho (`npm run ai:find`).
- [audit-ai-navigation.mjs](audit-ai-navigation.mjs): contagem de arquivos, módulos maiores e sugestões de índices (`npm run ai:audit`).
- [check-ai-navigation.mjs](check-ai-navigation.mjs): verifica links locais dos guias (`npm run check:ai-index`).
- [ai-navigation-api.mjs](ai-navigation-api.mjs): funções puras e contrato JSON estável para futuros adaptadores MCP.
- [ai-navigation-query.mjs](ai-navigation-query.mjs): consultas `find`, `audit` e `guide` em JSON via `npm run ai:query`, sem abrir portas.

## Publicação e verificação
- [write-runtime-config.mjs](write-runtime-config.mjs): configurações públicas usadas no build.
- [emit-route-shells.mjs](emit-route-shells.mjs), [routes.json](routes.json): entradas e metadados das rotas.
- [verify-build.mjs](verify-build.mjs), [check-published-frontend.mjs](check-published-frontend.mjs): verificações do frontend compilado/publicado.
- [resolve-worker-target.mjs](resolve-worker-target.mjs): destino de publicação.
- [verify-live-theme.mjs](verify-live-theme.mjs): identidade visual na publicação.

**Não inclua segredos nas configurações `VITE_*`.** As ferramentas de IA são executadas manualmente ou em CI; não fazem parte do bundle do navegador. Veja [../docs/AI_NAVIGATION.md](../docs/AI_NAVIGATION.md) e [../tests/INDEX.md](../tests/INDEX.md).
