# Índice — cliente TypeScript (`src/`)

| Módulo | Arquivos principais | Responsabilidade |
| --- | --- | --- |
| [app/](app/INDEX.md) | `routes.ts`, `game-page.component.ts` | Angular, páginas, HUD, contador |
| [engine/](engine/INDEX.md) | `OfflineSimulation.ts`, `Inventory.ts` | Simulação local, regras, itens |
| [render/](render/INDEX.md) | `WorldRenderer.ts`, `Effects.ts` | Arte procedural, câmera |
| [game/](game/Game.ts) | [PhaserGame.ts](game/PhaserGame.ts) | Controlador do jogo e ciclo Phaser |
| [actors/](actors/Player.ts) | [Slime.ts](actors/Slime.ts) | Atores e criaturas |
| [world/](world/terrain.ts) | [collision.ts](world/collision.ts), [village.ts](world/village.ts) | Mundo determinístico e colisão |
| [input/](input/Input.ts) | `Input.ts` | Teclado, joystick, ataques e toque |
| [net/](net/MultiplayerClient.ts) | [presence.ts](net/presence.ts) | WebSocket e presença |
| [shared/](shared/protocol.ts) | `protocol.ts` | Contrato online v3 |
| [storage/](storage/localSave.ts) | `localSave.ts` | Save offline |
| [ui/](ui/GameUi.ts) | [CanvasScene.ts](ui/CanvasScene.ts) | Porta HUD ↔ motor e desenho Canvas |

Bootstrap: [main.ts](main.ts). Testes: [tests/INDEX.md](../tests/INDEX.md).

**Fronteira:** não importar Angular ou Phaser na simulação, no mundo nem nos atores. Mudanças de protocolo precisam de testes Node/Go.
