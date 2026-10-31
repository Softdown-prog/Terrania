# Arquitetura técnica — Terrania: Origins

O frontend é uma aplicação Angular 22 compilada em assets estáticos para o Worker Cloudflare. O Phaser 3.90 é carregado apenas ao abrir `/jogar/`. O backend autoritativo continua separado: Node em produção e infraestrutura Go de workers/gateway no mesmo repositório.

| Camada | Responsabilidade |
| --- | --- |
| `src/main.ts`, `src/app/routes.ts` | Bootstrap Angular, rotas e metadados |
| `src/app/pages/`, `site-layout.*` | Site, navegação e convites de sala |
| `src/app/game-page.*`, `hud.service.ts` | HUD, opções, bolsa, ajuda e diálogos |
| `src/ui/GameUi.ts` | Contrato da interface sem dependência Angular |
| `src/game/PhaserGame.ts` | Cena Phaser, loop, textura, render final e resize |
| `src/game/Game.ts` | Coordena controles, simulação, render procedural e rede |
| `src/engine/`, `src/actors/`, `src/world/` | Regras e colisões independentes da interface |
| `src/ui/CanvasScene.ts`, `src/render/` | Arte procedural desenhada na CanvasTexture do Phaser |
| `src/net/MultiplayerClient.ts` | Conexão, snapshots e liberação ao sair |
| `src/net/presence.ts`, `src/app/presence.service.ts` | Protocolo do contador e atualização de 5 segundos |
| `server/src/` | Salas, HTTP, WebSocket, heartbeat e presença Node |
| `server-go/cmd/terrania/` | Worker Go autoritativo e presença por worker |
| `server-go/cmd/gateway/`, `server-go/presence/` | Roteamento e soma das presenças reais dos workers |

A simulação não importa Angular nem Phaser. O servidor continua compartilhando regras TypeScript, ou verificando paridade com Go. Não foram introduzidas regras de física Arcade: isso alteraria a paridade do movimento/combate já existente.

O Phaser é o dono do loop: uma Scene chama `Game.update(delta)` e apresenta uma CanvasTexture com a arte procedural. Não existe um segundo `requestAnimationFrame` de gameplay. Essa adaptação preserva a arte e os saves; não significa que todos os desenhistas Canvas foram reescritos como sprites Phaser, nem pressupõe ganho de FPS.

Os tiles continuam 32×32, chunks 16×16 e cache visual limitado a 24 chunks. A simulação local mantém passo fixo de 1/60 s e o protocolo online continua na versão 3. Ao sair da rota, são liberados Phaser, WebSocket, temporizadores de reconexão, controles e observadores.

O site usa renderização Angular no cliente. O pós-build emite dez entradas HTML com títulos e descrições próprios, base `/` e a mesma aplicação; não é SSR nem prerender do conteúdo das páginas. Pré-visualizações de mundo são estáticas e liberam seus recursos ao trocar de rota.

A contagem online usa conexões WebSocket, pois ainda não existem contas para deduplicar pessoas em várias abas. Solo e visitantes do site não entram na contagem. No Go, reservas do lobby não são usadas como jogadores confirmados; se um worker falhar, o total é declarado indisponível.

Os Dockerfiles são só para os backends. O frontend não exige Docker. Nunca colocar segredos nas variáveis públicas `VITE_*`.
