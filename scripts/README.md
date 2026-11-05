# Ferramentas e automação

**Papel:** Scripts de build, índices, verificação e CI.

**Ponto de entrada:** consulte [registro central](../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Executar architecture:index quando arquivos/caminhos mudarem e manter validações em CI.

**Verificação:** npm run architecture:check, typecheck, unit e browser.

**Limites:** Scripts de documentação não devem ler segredos nem chamar serviços/SSH da VPS.

## MCP de navegação (local e somente leitura)

`scripts/mcp/navigator.mjs` consulta os índices e docs. `scripts/mcp/server.mjs` oferece cinco ferramentas pelo protocolo MCP via stdio, sem abrir portas nem alterar o repositório. Execute `npm run architecture:check` antes de iniciar `npm run mcp:navigator`. Veja [guia completo](../docs/MCP_NAVEGACAO.md).
