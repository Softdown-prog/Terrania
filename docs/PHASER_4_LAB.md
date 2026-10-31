# Laboratório Phaser 4 — substituído nesta branch

O laboratório isolado da main foi removido em `feat/angular-ui-phaser3`, conforme a decisão de usar Phaser **3** no jogo real. `/laboratorio-phaser/` agora redireciona para `/jogar/` pelo roteador Angular.

A implementação atual está em `src/game/PhaserGame.ts`. O Phaser controla cena, loop, renderização e dimensionamento; a arte procedural alimenta uma CanvasTexture. Regras locais e autoridade multiplayer permanecem independentes da biblioteca visual.

Veja [a migração atual](MIGRACAO_ANGULAR_PHASER3.md). Não usar as instruções antigas do laboratório como plano de implantação desta branch.
