# Arquitetura técnica — Terrania: Origins

O frontend é uma aplicação Angular 22 compilada em assets estáticos para o Worker Cloudflare. O Phaser 3.90 é carregado apenas ao abrir `/jogar/`. **O jogo é solo e offline** ([ADR 0010](adr/0010-solo-offline-e-mercado-online.md), [ADR 0012](adr/0012-retirada-do-multiplayer.md)): toda a simulação roda no navegador. O servidor Node só informa saúde, conta quem está jogando e serve o catálogo de itens (PostgreSQL). A infraestrutura Go/Rust no mesmo repositório é laboratório fora do produto.

| Camada | Responsabilidade |
| --- | --- |
| `src/main.ts`, `src/app/routes.ts` | Bootstrap Angular, rotas e metadados |
| `src/app/pages/`, `site-layout.*` | Site e navegação |
| `src/app/game-page.*`, `hud.service.ts` | HUD, opções, bolsa, ajuda e diálogos |
| `src/ui/GameUi.ts` | Contrato da interface sem dependência Angular |
| `src/game/PhaserGame.ts` | Cena Phaser, loop, textura, render final e resize |
| `src/game/Game.ts` | Coordena controles, simulação, render procedural e rede |
| `src/engine/`, `src/actors/`, `src/world/` | Regras e colisões independentes da interface |
| `src/ui/CanvasScene.ts`, `src/render/` | Arte procedural desenhada na CanvasTexture do Phaser |
| `src/net/` | Contador de quem está jogando e catálogo de itens (HTTP) |
| `src/net/presence.ts`, `src/app/presence.service.ts` | Protocolo do contador e atualização de 5 segundos |
| `server/src/` | HTTP: saúde, presença por sinal anônimo e catálogo (sem salas nem WebSocket) |
| `server-go/cmd/terrania/` | Laboratório: worker Go (fora do produto) |
| `server-go/cmd/gateway/`, `server-go/presence/` | Laboratório: roteamento e presença do cluster Go (fora do produto) |

A simulação não importa Angular nem Phaser. O servidor reutiliza regras TypeScript apenas para derivar o catálogo de itens; o laboratório Go não espelha o TypeScript (ADR 0038). Não foram introduzidas regras de física Arcade: isso alteraria o movimento/combate já existente.

O Phaser é o dono do loop: uma Scene chama `Game.update(delta)` e apresenta uma CanvasTexture com a arte procedural. Não existe um segundo `requestAnimationFrame` de gameplay. Essa adaptação preserva a arte e os saves; não significa que todos os desenhistas Canvas foram reescritos como sprites Phaser, nem pressupõe ganho de FPS.

Os tiles continuam 32×32, chunks 16×16 e cache visual limitado a 24 chunks. A simulação local mantém passo fixo de 1/60 s Ao sair da rota, são liberados Phaser, o sinal de presença, controles e observadores.

A bolsa, a coleta, a troca com Lina e Toren e a cura são regras de `src/engine/character/Inventory.ts`, aplicadas na simulação local; o save fica em `localStorage`. O [ADR 0007](adr/0007-inventario-da-sala.md) descreve o desenho original da bolsa por sala, hoje histórico.

O site usa renderização Angular no cliente. O pós-build emite dez entradas HTML com títulos e descrições próprios, base `/` e a mesma aplicação; não é SSR nem prerender do conteúdo das páginas. Pré-visualizações de mundo são estáticas e liberam seus recursos ao trocar de rota.

A contagem de pessoas jogando vem de um sinal anônimo enviado a cada 20 s por cada aba com o jogo aberto e visível (`POST /presence/heartbeat`; id aleatório só em memória; o servidor o guarda ~45 s, no máximo 5.000). Visitantes do site que não abriram o jogo não entram. É um contador informativo, não uma estimativa de pessoas distintas nem prova de capacidade; se o servidor falhar, o total é declarado indisponível.

Os Dockerfiles são só para os backends. O frontend não exige Docker. Nunca colocar segredos nas variáveis públicas `VITE_*`.

## Catálogo e regras para evolução

O [registro central](../architecture/modules.json) é a fonte versionada de ownership, camadas, estado e pontos de entrada. Use o [índice navegável](INDEX.md) para navegar por arquivos agrupados e os READMEs de seção para suas responsabilidades. O índice é gerado, verificado pela CI e documentado em [ADR 0001](adr/0001-catalogo-e-fronteiras.md).

As fronteiras de domínio são testadas por `npm run architecture:check`: regras em `src/engine`, `src/world` e `src/actors` não podem importar Angular, Phaser, apresentação, rede nem armazenamento. Isso é uma proteção limitada, **não** uma prova de arquitetura completa.

As implantações Node, protótipos Go/Rust e laboratórios de cluster possuem estados separados. Para a fase clássica e decisões ainda experimentais, veja [GAMEPLAY_CLASSICO](GAMEPLAY_CLASSICO.md) e [ROADMAP](ROADMAP.md). Para diagnóstico, crescimento, compatibilidade e restauração, veja [MANUTENCAO](MANUTENCAO.md).

## MCP de navegação (sem acoplamento ao motor)

O processo local `scripts/mcp/server.mjs` consulta apenas `architecture/modules.json`, índices derivados e docs permitidos, sem importar `Game.ts`, Angular ou o backend. É um adaptador de conhecimento, não um serviço de gameplay. Veja [MCP_NAVEGACAO.md](MCP_NAVEGACAO.md) e [ADR 0002](adr/0002-mcp-navegador-local.md).
