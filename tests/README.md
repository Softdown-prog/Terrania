# Qualidade do projeto

**Papel:** Testes de regras TypeScript e testes E2E com Playwright para desktop e Android.

**Ponto de entrada:** consulte [registro central](../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar regressão próxima da regra alterada; não aceitar apenas build como prova de comportamento.

**Verificação:** npm test; npm run test:browser; check de arquitetura.

**Limites:** Testes não substituem observabilidade real nem carga de 500 jogadores.
