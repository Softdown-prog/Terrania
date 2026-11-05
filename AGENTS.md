# Terrania — guia para humanos e agentes de código

Leia primeiro [docs/INDEX.md](docs/INDEX.md), [architecture/modules.json](architecture/modules.json), [docs/ROADMAP.md](docs/ROADMAP.md) e [docs/ARQUITETURA.md](docs/ARQUITETURA.md). Depois abra somente o índice/documentação da seção envolvida. Nunca suponha que `main`, o backend em produção e a branch experimental sejam equivalentes.

## Antes de alterar um arquivo

1. Identificar **módulo dono**, estado (`active`, `experimental`, `lab`), entrada, consumidores, testes e protocolo impactado no registro.
2. Ler os arquivos estritamente necessários e sua documentação de módulo; registrar a razão da alteração. Não mover pastas inteiras por estética.
3. Implementar **uma microtarefa** com testes de regressão e checagem de dependências; comparar comportamento em desktop e Android quando tocar gameplay/UI.
4. Se mudar estrutura/caminho: atualizar `architecture/modules.json` e executar `npm run architecture:index`. Se mudar contrato, comportamento, risco ou modo de operação: atualizar documentação da seção e, para decisões duradouras, registrar ADR em `docs/adr/`.
5. Checar `npm run architecture:check`, `npm run typecheck`, `npm test`, `npm run build` e testes relevantes adicionais. **Compilar não comprova jogar bem.**
6. Trabalhar na branch designada; **não fazer merge, deploy ou alterações em VPS sem aprovação explícita**. Nunca apagar código legado funcional só para diminuir quantidade de arquivos.

## Fronteiras arquiteturais

- `src/engine/`, `src/actors/` e `src/world/`: regras independentes de Angular, Phaser, DOM e rede. O validador impede imports de UI/renderer nessas pastas.
- `src/app/`: apresenta dados e recebe ações; não contém lógica autoritativa.
- `src/game/`: orquestrador, não um segundo motor ou autoridade de jogo.
- `server/`: backend Node atual; `server-go/` e Rust têm componentes experimentais; não promover por suposição.
- `docs/indexes/`: **gerados**. Não editar à mão; alterar código/registro e regenerar.

## Diagnóstico e recuperação

Consultar [docs/MANUTENCAO.md](docs/MANUTENCAO.md). Índice, testes e MCP ajudam a localizar problemas; não são backup, rollback, telemetria, alta disponibilidade nem prova de capacidade. Tags Git preservam versões de código; dados de jogadores exigirão uma estratégia própria de persistência/backup.

## MCP local para navegação

Quando houver um cliente MCP stdio disponível, inicie `node scripts/mcp/server.mjs` no checkout da branch. Use primeiro `list_modules`, `locate_file` e `find_tests` para reduzir a área de investigação. Consulte [MCP_NAVEGACAO.md](docs/MCP_NAVEGACAO.md). Os resultados não autorizam edição, shell, deploy ou promoção dos laboratórios Go/Rust.
