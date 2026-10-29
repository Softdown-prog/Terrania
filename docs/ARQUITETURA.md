# Arquitetura — Terrania: Origins

## Front-end
HTML5 + TypeScript, Vite para build e Canvas 2D, hospedado no Cloudflare Pages.

Pastas:
- `src/world/`: seed determinística, terrenos, chunks e colisão.
- `src/render/`: representação visual procedural do terreno e entidades.
- `src/actors/`: herói e slime, compartilhados com o servidor nas regras puras.
- `src/input/`: teclado e joystick touch.
- `src/game/`: ciclo de atualização, câmera, save local e integração.
- `src/net/`: cliente WebSocket e reconexão.
- `src/shared/`: protocolo e validadores usados por ambos os lados.

## Gerador e memória
Cada tile é função da seed e coordenada global; os chunks são 16×16 tiles com tiles de 32 pixels. O cliente desenha chunks próximos do viewport em Canvas auxiliar e preserva até 24 chunks num cache LRU, gerando novamente os mais antigos quando necessário. O cliente renderiza apenas objetos que chegam à área visível.

A seed só descreve o terreno natural. Mudanças persistentes (inventário, mineração, construções e quests) exigirão armazenamento de deltas e banco transacional; não serão derivadas da seed.

## Back-end
Node.js 22, TypeScript e ws num processo separado, destinado à VPS.
- Um `Room` controla jogadores, slimes, colisão, ataques e vida.
- A direção/ataque vêm do cliente; posição e vida não são aceitos como autoridade.
- Taxa de simulação inicial: 20 Hz; snapshots de entidades próximas: cerca de 10 Hz.
- Máximo experimental: 48 clientes, 8 salas, até 12 clientes por sala.
- Sem autenticação e sem persistência nesta versão.
- Healthcheck em `GET /health`.

## Limites de segurança
- CORS não protege WebSockets: validar header Origin no upgrade, mas Origin não substitui autenticação.
- Validar formato/taxa/tamanho das mensagens e usar TLS via proxy.
- Servidor decide dano, cura e ganhos, nunca confiar no cliente.
- Não expor porta interna 8787 diretamente na internet.
- Antes de produção: autenticação, métricas, antiabuso, limites por IP, persistência e backup.

## Decisões de operação
- Cloudflare Pages não roda o processo WebSocket persistente.
- Servidor em container Docker próprio, isolado de Softload V4 e demais aplicações.
- Não alterar Caddy/Cloudflare/DNS sem inspecionar rede e configurar plano de reversão.
