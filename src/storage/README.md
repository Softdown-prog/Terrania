# Save local

**Papel:** Carregamento e gravação do progresso offline no navegador.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar campos de forma compatível e testar leitura de saves antigos e dados inválidos.

**Verificação:** tests/inventory-storage e tests/simulation.

**Limites:** Save local não substitui banco, backup ou persistência da sessão multiplayer.
