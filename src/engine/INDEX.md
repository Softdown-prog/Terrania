# Índice — simulação independente da UI

- [OfflineSimulation.ts](OfflineSimulation.ts): passo da simulação solo.
- [Inventory.ts](Inventory.ts): itens, poções e recompensas.
- [InteriorRoom.ts](InteriorRoom.ts): interiores caminháveis.
- [TapNavigator.ts](TapNavigator.ts): navegação por toque no solo.
- [combat.ts](combat.ts), [loot.ts](loot.ts): combate e drops.

Dependências: [../actors/Player.ts](../actors/Player.ts), [../actors/Slime.ts](../actors/Slime.ts), [../world/collision.ts](../world/collision.ts). Testes: [../../tests/simulation.test.ts](../../tests/simulation.test.ts), [../../tests/inventory.test.ts](../../tests/inventory.test.ts), [../../tests/interior.test.ts](../../tests/interior.test.ts) e [../../tests/tap-navigation.test.ts](../../tests/tap-navigation.test.ts).

Não importar Angular, DOM, Phaser ou Canvas para dentro deste motor. Compare regras compartilhadas com a implementação online.
