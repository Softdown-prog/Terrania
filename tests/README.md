# Qualidade do projeto

**Papel:** Testes de regras TypeScript e testes E2E com Playwright para desktop e Android.

**Ponto de entrada:** consulte [registro central](../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar regressão próxima da regra alterada; não aceitar apenas build como prova de comportamento.

**Verificação:** npm test; npm run test:browser; check de arquitetura.

**Limites:** Testes não substituem observabilidade real nem carga de 500 jogadores.

**MCP:** `mcp-navigator.test.ts` verifica leitura limitada dos índices, respostas de protocolo stdio, bloqueio de caminhos maliciosos e ausência de comandos de escrita.

**Subsolo:** `tests/caves.test.ts` valida entradas determinísticas,
variação regional (incluindo sudeste pantanoso), limites, colisão do
primeiro andar e conectividade das câmaras. Antes de integrar, executar
também o Playwright de desktop/Android com descida, atlas interno e retorno
pela escada; CI verde sem esse cenário não comprova que a navegação está correta.

### Montarias
`mounts.test.ts`: dez fichas, tier/nível, stable, taming, captura idempotente, stamina, save e colisão com velocidade montada. `browser/mounts.spec.ts` exercita controles reais do mestre de estábulos e Android. As dez artes obedecem ao mesmo contrato de criaturas existente.
