# Save local

> **Atualização 2026-11-08:** o modo online/sala Node foi retirado ([ADR 0012](../../docs/adr/0012-retirada-do-multiplayer.md)). Trechos abaixo sobre sala, snapshot, `online` ou servidor autoritativo descrevem o que existiu e foi removido.

**Papel:** Carregamento e gravação do progresso offline no navegador.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar campos de forma compatível e testar leitura de saves antigos e dados inválidos.

**Verificação:** tests/inventory-storage e tests/simulation.

O campo opcional `awaitingRespawn` só representa uma derrota quando também há vida zero. O save é gravado na derrota e no retorno à vila. Saves antigos sem a marca continuam carregando com pelo menos um ponto de vida.

**Limites:** Save local não substitui banco, backup ou persistência da sessão multiplayer.
