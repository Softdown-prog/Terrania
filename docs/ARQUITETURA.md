# Arquitetura técnica — Terrania: Origins

## Destinos
- Cloudflare Pages publica só o frontend estático compilado pelo Vite.
- VPS executa só o backend Node.js/WebSocket atrás do Caddy, com um único Dockerfile em `server/Dockerfile`.
- A renderização procedural fica no navegador; o backend não instala Canvas, React, Chromium nem ferramentas gráficas.

## Camadas
```text
src/main.ts                       bootstrap mínimo do navegador
src/game/Game.ts                  controlador que liga entrada/motor/render/rede
src/engine/OfflineSimulation.ts   regras offline sem DOM, Canvas ou rede
src/actors/                       herói e slimes, compartilhados com o backend
src/world/                        seed, terreno e colisão determinística
src/render/WorldRenderer.ts       cache de chunks e culling no Canvas
src/render/actors.ts, terrain.ts  desenhos procedurais
src/ui/CanvasScene.ts             desenha mundo e personagens na tela
src/ui/Hud.ts                     interface HTML
src/storage/localSave.ts          persistência local (isolada do motor)
src/input/                        teclado e touch
src/net/                          WebSocket do cliente
src/shared/                       tipos e protocolo
server/src/Room.ts                salas e simulação online autoritativa
server/src/main.ts                bootstrap HTTP/WebSocket, heartbeat e limites
server/Dockerfile                 build multi-stage só para a VPS
```

O motor offline recebe a direção/ataque, simula e devolve estado. Nenhuma biblioteca visual é importada por ele. O servidor reutiliza exclusivamente `src/actors`, `src/world` e `src/shared`, e valida movimentos, dano e monstros. O jogo online mantém predição visual no cliente; a posição oficial vem da VPS.

## Chunks e desempenho
Cada tile mede 32×32 px; chunks de 16×16 tiles (512×512 px). O par seed/coordenadas gera os mesmos tiles, incluindo coordenadas negativas. O Canvas cacheia no máximo 24 chunks (até ~24 MiB de buffers RGBA, antes de overhead no navegador). Só chunks visíveis são desenhados. A simulação ainda usa delta limitado e não tem passo fixo completo; isso é melhoria futura.

## Persistência e segurança
Offline salva localmente; multiplayer usa estado temporário em memória por sala e ainda não tem contas, banco de dados, autorização ou proteção contra abuso para produção em larga escala. Nunca enviar segredos em variáveis `VITE_`. Para custos e deploy, consultar `docs/ESTRUTURA_E_CUSTOS.md`.
