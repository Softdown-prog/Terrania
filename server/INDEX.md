# Índice — Node, API e salas atuais

- [src/main.ts](src/main.ts): HTTP, WebSocket, origem permitida, heartbeat, salas e presença.
- [src/Room.ts](src/Room.ts): simulação autoritativa, slimes e snapshots.
- [tests/integration.test.ts](tests/integration.test.ts), [tests/room.test.ts](tests/room.test.ts): regras e protocolo.
- [scripts/online-smoke.mjs](scripts/online-smoke.mjs): smoke online.
- [Dockerfile](Dockerfile), [compose.yml](compose.yml): container independente.

Protocolo compartilhado: [../src/shared/protocol.ts](../src/shared/protocol.ts); implementação Go independente: [../server-go/INDEX.md](../server-go/INDEX.md).

Testes: `npm run typecheck --prefix server && npm test --prefix server && npm run build --prefix server`. Não alterar serviços da VPS a partir daqui sem aprovação.
