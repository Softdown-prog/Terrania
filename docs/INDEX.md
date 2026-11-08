# Terrania — índice de módulos e arquivos

> Gerado por `npm run architecture:index`. Não editar à mão. Fonte canônica: [architecture/modules.json](../architecture/modules.json).

Este índice informa **onde procurar**. Estado active = módulo utilizado na arquitetura atual; experimental/lab não implica serviço em produção nem capacidade validada.

| Módulo | Estado | Arquivos | Responsabilidade |
| --- | --- | ---: | --- |
| [Site e HUD Angular](indexes/angular-site.md) | active | 26 | Páginas do site, navegação, HUD e ações de interface. Não calcula regras autoritativas. |
| [Orquestração Phaser](indexes/phaser-game.md) | active | 3 | Integra loop, inputs, simulação, câmera, render e rede. Evitar transferir regras do motor para este adaptador. |
| [Renderização e adaptadores Canvas](indexes/renderer.md) | active | 17 | Desenha entidades e mundo; GameUi separa o Angular do orquestrador do jogo. |
| [Regras e simulação offline](indexes/simulation.md) | active | 16 | Combate, progressão, inventário, equipamento, loot e navegação; sem DOM, Phaser ou Angular. |
| [Entidades jogáveis](indexes/actors.md) | active | 4 | Estado e comportamento do herói e das criaturas; catálogo inicial de espécies separado das instâncias. |
| [Terreno, colisões e NPCs](indexes/world.md) | active | 15 | Mundo procedural determinístico regionalizado, biomas, dificuldade, tiles, colisão, vila e marcos. |
| [Entrada e controles](indexes/input.md) | active | 4 | Normalização de teclado, joystick e toque; regras de gameplay pertencem à simulação. |
| [Rede cliente: presença e catálogo](indexes/client-network.md) | active | 3 | Consultas HTTP do site: contador de quem está jogando e catálogo de itens. O jogo é solo e offline; não há conexão de jogo. |
| [Persistência local](indexes/local-save.md) | active | 2 | Save no navegador, versão e compatibilidade; não é persistência autoritativa online. |
| [QA e testes](indexes/quality.md) | active | 52 | Testes unitários e navegador desktop/Android; cenários de regressão e robôs de QA. |
| [Servidor Node atual](indexes/node-server.md) | active | 22 | Serviço HTTP: contador de quem está jogando, catálogo de itens (PostgreSQL) e saúde. Sem salas nem WebSocket; o jogo é solo e offline. |
| [Motor Go autoritativo em validação](indexes/go-engine.md) | experimental | 23 | Implementação Go de regras e paridade; substituição do backend ativo requer decisão e validação separadas. |
| [Executáveis e presença Go](indexes/go-runtime.md) | experimental | 28 | Worker, gateway, laboratório de capacidade, presença e scripts de paridade. |
| [Cluster e recuperação experimental Go](indexes/go-cluster.md) | lab | 62 | Handoff, epochs, autoscale e laboratórios de quorum. Não pressupor produção, failover ou capacidade comprovada. |
| [Módulo Rust espacial e entidades](indexes/rust-spatial.md) | experimental | 10 | Kernel Rust e FFI opt-in; não é servidor de rede. |
| [Scripts, automação e CI](indexes/tooling.md) | active | 26 | Build, verificação, testes automatizados, deploys e índice; operações de produção são fluxos distintos. |

**Outros arquivos:** [documentos, configurações e arquivos de entrada](indexes/_outros.md) (75).

Para regras de alteração, veja [AGENTS.md](../AGENTS.md), [manutenção](MANUTENCAO.md) e [ADR 0001](adr/0001-catalogo-e-fronteiras.md).
