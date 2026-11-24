# Orquestração Phaser

> Gerado automaticamente a partir de `architecture/modules.json`. Estado: **active** · Camada: **application**

Integra loop, inputs, simulação, câmera, render e rede. Evitar transferir regras do motor para este adaptador.

**Documentação de manutenção:** [`src/game/README.md`](../../src/game/README.md)

## Pontos de entrada

- [`src/game/Game.ts`](../../src/game/Game.ts)
- [`src/game/PhaserGame.ts`](../../src/game/PhaserGame.ts)
- [`src/game/interactions.ts`](../../src/game/interactions.ts)
- [`src/game/actions/shopActions.ts`](../../src/game/actions/shopActions.ts)
- [`src/game/TravelState.ts`](../../src/game/TravelState.ts)
- [`src/game/modes/types.ts`](../../src/game/modes/types.ts)
- [`src/game/modes/surfaceMode.ts`](../../src/game/modes/surfaceMode.ts)
- [`src/game/modes/caveMode.ts`](../../src/game/modes/caveMode.ts)
- [`src/game/modes/interiorMode.ts`](../../src/game/modes/interiorMode.ts)

## Todos os arquivos deste módulo (34)

- [`src/game/Game.ts`](../../src/game/Game.ts)
- [`src/game/PhaserGame.ts`](../../src/game/PhaserGame.ts)
- [`src/game/README.md`](../../src/game/README.md)
- [`src/game/TravelState.ts`](../../src/game/TravelState.ts)
- [`src/game/actions/center/bankActions.ts`](../../src/game/actions/center/bankActions.ts)
- [`src/game/actions/center/shrineActions.ts`](../../src/game/actions/center/shrineActions.ts)
- [`src/game/actions/say.ts`](../../src/game/actions/say.ts)
- [`src/game/actions/shopActions.ts`](../../src/game/actions/shopActions.ts)
- [`src/game/actions/shopContext.ts`](../../src/game/actions/shopContext.ts)
- [`src/game/actions/south/alchemyActions.ts`](../../src/game/actions/south/alchemyActions.ts)
- [`src/game/interactions.ts`](../../src/game/interactions.ts)
- [`src/game/messages/capitalInn.ts`](../../src/game/messages/capitalInn.ts)
- [`src/game/messages/center/bank.ts`](../../src/game/messages/center/bank.ts)
- [`src/game/messages/center/shrine.ts`](../../src/game/messages/center/shrine.ts)
- [`src/game/messages/classIntro.ts`](../../src/game/messages/classIntro.ts)
- [`src/game/messages/classRules.ts`](../../src/game/messages/classRules.ts)
- [`src/game/messages/inventoryFeedback.ts`](../../src/game/messages/inventoryFeedback.ts)
- [`src/game/messages/mountMessages.ts`](../../src/game/messages/mountMessages.ts)
- [`src/game/messages/noMana.ts`](../../src/game/messages/noMana.ts)
- [`src/game/messages/south/well/analysis-needs-sample.ts`](../../src/game/messages/south/well/analysis-needs-sample.ts)
- [`src/game/messages/south/well/analyzed.ts`](../../src/game/messages/south/well/analyzed.ts)
- [`src/game/messages/south/well/heard-gorrak.ts`](../../src/game/messages/south/well/heard-gorrak.ts)
- [`src/game/messages/south/well/heard-khemet.ts`](../../src/game/messages/south/well/heard-khemet.ts)
- [`src/game/messages/south/well/heard-sylrael.ts`](../../src/game/messages/south/well/heard-sylrael.ts)
- [`src/game/messages/south/well/index.ts`](../../src/game/messages/south/well/index.ts)
- [`src/game/messages/south/well/report-wallet-full.ts`](../../src/game/messages/south/well/report-wallet-full.ts)
- [`src/game/messages/south/well/reported.ts`](../../src/game/messages/south/well/reported.ts)
- [`src/game/messages/south/well/sign-needs-witnesses.ts`](../../src/game/messages/south/well/sign-needs-witnesses.ts)
- [`src/game/messages/south/well/well-inspected.ts`](../../src/game/messages/south/well/well-inspected.ts)
- [`src/game/messages/staffEffects.ts`](../../src/game/messages/staffEffects.ts)
- [`src/game/modes/caveMode.ts`](../../src/game/modes/caveMode.ts)
- [`src/game/modes/interiorMode.ts`](../../src/game/modes/interiorMode.ts)
- [`src/game/modes/surfaceMode.ts`](../../src/game/modes/surfaceMode.ts)
- [`src/game/modes/types.ts`](../../src/game/modes/types.ts)
