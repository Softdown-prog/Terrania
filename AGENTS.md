# Terrania — guia para agentes de IA

Comece pelo [mapa de navegação](docs/AI_NAVIGATION.md) e abra **apenas o índice do módulo** que será alterado. Não carregue todo o projeto de uma vez.

## Fronteiras do código
- Angular 22 em `src/app/`: site, rotas, menus, HUD e presença.
- Phaser 3.90 em `src/game/PhaserGame.ts`: Scene, loop, CanvasTexture e resize. Arte 2D procedural em `src/render/` e `src/ui/CanvasScene.ts`.
- Regras locais em `src/engine/`, `src/actors/`, `src/world/`: independentes de Angular, Phaser e DOM.
- `src/ui/GameUi.ts`: interface entre motor e HUD. `src/shared/protocol.ts`: protocolo multiplayer v3, que precisa manter paridade entre cliente, Node e Go.
- `server/`: backend Node de referência/produção. `server-go/`: backend Go com gateway, trabalhadores e salas. Rust: kernel espacial opcional integrado por FFI, não é outro servidor multiplayer.
- Go puro continua sendo o padrão; `rustspatial` é experimental e exige testes de paridade e benchmark antes de ativar.

## Procedimento
1. Localize o domínio no [mapa](docs/AI_NAVIGATION.md), leia o `INDEX.md` correspondente e faça busca direcionada por símbolos.
2. Confira contratos e testes antes de alterar APIs, saves, formato de snapshots, estado da sala ou lógica de mundo.
3. Frontend: `npm run typecheck && npm test && npm run build`; navegador: `npm run test:browser`.
4. Node: `npm run typecheck --prefix server && npm test --prefix server && npm run build --prefix server`.
5. Go: `cd server-go && go test -race -count=1 ./... && go vet ./...`.
6. Rust: veja [índice Rust](rust/spatial-kernel/INDEX.md) para fmt, clippy e testes.
7. Índices: `npm run check:ai-index`; atualize referências se arquivos forem movidos.

Não faça merge na `main`, PR, deploy na Cloudflare ou alteração da VPS sem solicitação explícita. Não coloque segredos em variáveis `VITE_*`. Índices Markdown são documentos, não exports `index.ts`. Se a documentação divergir do código, confirme no código e corrija o índice.
