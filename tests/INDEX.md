# Índice — cobertura de regressões

- Angular, navegação, HUD e Phaser: [browser/app.spec.ts](browser/app.spec.ts), [browser/dialogs.spec.ts](browser/dialogs.spec.ts), [browser/session.spec.ts](browser/session.spec.ts).
- Inventário e saves: [inventory.test.ts](inventory.test.ts), [inventory-storage.test.ts](inventory-storage.test.ts), [simulation.test.ts](simulation.test.ts).
- Mundo e física: [world.test.ts](world.test.ts), [physics.test.ts](physics.test.ts), [tap-navigation.test.ts](tap-navigation.test.ts).
- Vila e interiores: [village.test.ts](village.test.ts), [npcs.test.ts](npcs.test.ts), [interior.test.ts](interior.test.ts).
- Protocolo e presença: [presence.test.ts](presence.test.ts), [../server/tests/integration.test.ts](../server/tests/integration.test.ts).
- Publicação: [cloudflare-deploy.test.ts](cloudflare-deploy.test.ts), [published-frontend.test.ts](published-frontend.test.ts).
- Backend Go e Rust: [../server-go/engine/](../server-go/engine/), [../rust/spatial-kernel/](../rust/spatial-kernel/).

Comandos: `npm test`, `npm run test:browser`, `npm test --prefix server`, `cd server-go && go test -race ./...`. O Android no Playwright é emulado, não um aparelho físico.
