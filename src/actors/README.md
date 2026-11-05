# Atores do mundo

**Papel:** Player e Slime possuem estado e atualizações. `CreatureCatalog.ts` contém a definição fixa da espécie (nome, HP máximo e dano de contato), enquanto cada criatura mantém ID, posição e HP atual próprios.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Manter tipos/estado separados de apresentação e acrescentar testes ao introduzir uma espécie.

**Verificação:** testes de simulação, colisão e combate.

**Limites:** O catálogo contém somente Slime. `CreatureView` permite ler uma criatura sem depender da classe que executa sua IA. Spawn, loot, arte, saves e protocolo online continuam com seus contratos existentes.
