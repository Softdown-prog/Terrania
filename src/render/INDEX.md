# Índice — desenho procedural e câmera

- [WorldRenderer.ts](WorldRenderer.ts): composição e cache do cenário.
- [Camera.ts](Camera.ts), [Effects.ts](Effects.ts): câmera e efeitos.
- [terrain.ts](terrain.ts), [scenery.ts](scenery.ts): terreno, água e cenário.
- [actors.ts](actors.ts), [npcs.ts](npcs.ts), [interior.ts](interior.ts): personagens e interiores.

Integração: [../ui/CanvasScene.ts](../ui/CanvasScene.ts) desenha em Canvas; [../game/PhaserGame.ts](../game/PhaserGame.ts) apresenta a CanvasTexture e controla o loop; [../game/Game.ts](../game/Game.ts) coordena.

Não criar segundo `requestAnimationFrame` de gameplay nem deslocar colisão ou combate para o renderizador.
