# Terrania — mapa de arquivos para agentes de IA

Encontre o subsistema antes de ler código. **Este mapa aponta para índices locais e contratos; não é um catálogo de cada arquivo.**

| Tarefa | Índice local | Pontos de entrada |
| --- | --- | --- |
| Rotas, site, HUD, inventário visual, presença | [Angular](../src/app/INDEX.md) | `src/app/routes.ts`, `src/app/game-page.component.ts` |
| Simulação, combate, loot, navegação | [Motor local](../src/engine/INDEX.md) | `src/engine/OfflineSimulation.ts`, `src/engine/combat.ts` |
| Cena Phaser, Canvas, desenho | [Renderização](../src/render/INDEX.md) | `src/game/PhaserGame.ts`, `src/game/Game.ts` |
| Jogador, terreno, rede e protocolo | [Mapa do navegador](../src/INDEX.md) | `src/actors/Player.ts`, `src/shared/protocol.ts` |
| WebSocket e simulação Node | [Node](../server/INDEX.md) | `server/src/main.ts`, `server/src/Room.ts` |
| Servidor, gateway, mobs e escala Go | [Go](../server-go/INDEX.md) | `server-go/engine/room.go`, `server-go/cmd/gateway/main.go` |
| Busca espacial opcional Rust | [Rust](../rust/spatial-kernel/INDEX.md) | `rust/spatial-kernel/src/lib.rs` |
| Regressões e QA | [Testes](../tests/INDEX.md) | `tests/browser/`, `server/tests/` |
| Estrutura, decisões e operação | [Arquitetura](ARQUITETURA.md) | [Roadmap](ROADMAP.md), [escala Go](GO_SCALE_1000.md) |

## Encontrar arquivos sem listar milhares de caminhos

A busca usa somente caminhos versionados do Git, não lê conteúdo dos arquivos nem adiciona pacotes:

```bash
npm run ai:find -- player --scope src --limit 20
npm run ai:find -- spatial --scope server-go --json
npm run ai:find -- 'room runtime' --limit 10
```

Limite padrão: **20 caminhos**, máximo **100** por chamada. Para encontrar símbolos **dentro** do código, use `rg -n` no módulo já identificado. A busca por caminhos é complementar aos `INDEX.md`, não substitui os índices de arquitetura.

## Navegação eficiente
1. Leia [AGENTS.md](../AGENTS.md) e o índice local **somente** da tarefa atual.
2. Busque símbolos com `rg -n 'NomeDoSimbolo' src server server-go rust` e caminhos com `rg --files src/engine` (ajuste a pasta).
3. Leia chamadas e testes relacionados; modifique o menor conjunto de arquivos possível.
4. Atualize o índice se mudar responsabilidades, nomes ou locais.

## Escala para 10–15 mil arquivos
- Crie `INDEX.md` em novos módulos **quando tiverem responsabilidades próprias**, cerca de 30–50 arquivos relevantes, ou muitos submódulos. Não faça índice em cada pasta vazia ou para cada arquivo.
- Descreva **o que a pasta faz, arquivos de entrada, contratos, dependências e testes**. Não copie código nem duplique o README inteiro.
- Não liste milhares de caminhos num único Markdown. A listagem completa deve ser obtida sob demanda com `rg --files <pasta>` ou `git ls-files`.
- Exclua `node_modules/`, `dist/`, `target/`, `coverage/` e artefatos gerados das buscas de código-fonte.
- `npm run check:ai-index` verifica links dos índices; ele não comprova que todas as descrições arquiteturais estejam atualizadas.
- `AGENTS.md` é a orientação principal. Para outras ferramentas, [GEMINI.md](../GEMINI.md) e [Copilot](../.github/copilot-instructions.md) encaminham ao mesmo mapa.

**Não crie `index.ts` só para ajudar IA a navegar:** barrel exports mudam imports do código; estes índices `.md` são independentes do runtime.
