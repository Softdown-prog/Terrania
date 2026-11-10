# Atores do mundo

> **Atualização 2026-11-08:** o modo online/sala Node foi retirado ([ADR 0012](../../docs/adr/0012-retirada-do-multiplayer.md)). Trechos abaixo sobre sala, snapshot, `online` ou servidor autoritativo descrevem o que existiu e foi removido.

**Papel:** Player e Slime possuem estado e atualizações. `CreatureCatalog.ts` contém a definição fixa da espécie (nome, HP máximo e dano de contato), enquanto cada criatura mantém ID, posição e HP atual próprios.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Manter tipos/estado separados de apresentação e acrescentar testes ao introduzir uma espécie.

**Verificação:** testes de simulação, colisão e combate.

**Comportamento:** as 32 espécies possuem fichas em `src/monsters/`. O Slime usa `Slime.update`, com pulsação própria. As 31 espécies regionais usam `src/monsters/behavior.ts`, com cadência, locomoção e perseguição específicas, aplicadas em `RegionalMonster.update` e `src/render/monsterMotion.ts`. A herança histórica `RegionalMonster extends Slime` ainda merece refatoração, mas o movimento do Slime não é executado pelos regionais.

### Montarias (aventura solo)
`MountCatalog.ts` concentra todas as dez fichas, requisitos de nível e Cavalaria, selas, iscas, drops e quests. Montarias não são monstros de combate; `Player.ts` continua sendo o avatar do jogador.

**Histórias e gatilhos regionais:** o catálogo não duplica fichas narrativas. As introduções e etapas das dez quests pertencem exclusivamente a `src/world/mountQuests.ts`.
