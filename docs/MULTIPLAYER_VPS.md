# Servidor na VPS (antes "multiplayer")

> **Atualização 2026-11-08 — modo multiplayer retirado** ([ADR 0012](adr/0012-retirada-do-multiplayer.md)). O jogo é solo e offline. Este documento descrevia salas, simulação a 20 Hz e WebSocket, que **não existem mais**. Hoje o servidor só atende HTTP.

## O que o servidor faz hoje
| Rota | Função |
| --- | --- |
| `GET /health` | Saúde, revisão (`GIT_SHA`) e prontidão do PostgreSQL |
| `GET /presence` | Quantas abas estão jogando agora (`online`, `updatedAt`, `scope`) |
| `POST /presence/heartbeat` | Sinal anônimo `{ "id": "<16–64 caracteres [A-Za-z0-9_-]>" }`; exige `Origin` permitido |
| `GET /market/catalog`, `GET /market/health` | Catálogo público de itens (PostgreSQL) |

Limites: corpo do sinal até 256 bytes; no máximo 5.000 ids vivos; id expira ~45 s após o último sinal; sinais repetidos em menos de 5 s não renovam o prazo; `Origin` fora de `ALLOWED_ORIGINS` recebe 403. **Não existe `/ws`** (responde 404). URL malformada responde 400 sem derrubar o processo.

O servidor **não** guarda save, posição, itens ou qualquer estado de jogo. O contador é informativo (quem controla o navegador pode inventar ids até o limite).

## Topologia e operação
- O site estático fica no Cloudflare; o navegador consulta o servidor por HTTPS.
- Caddy na VPS faz `reverse_proxy` até o container Node (`127.0.0.1:8787` no host).
- `ALLOWED_ORIGINS` aceita o domínio HTTPS da página de jogo. Em produção a variável é obrigatória.
- `VITE_MULTIPLAYER_URL` (nome histórico) continua sendo lida pelo site **apenas para derivar o endereço HTTP** do servidor (`wss://…/ws` vira `https://…/presence`). Pode ser trocada por `VITE_PRESENCE_URL` (URL HTTPS completa de `/presence`). Nunca coloque segredos em variáveis `VITE_*`.
- Deploy, rollback e verificação: veja [DEPLOY-VPS.md](DEPLOY-VPS.md). **Deploy exige aprovação explícita** (AGENTS.md).
- Os identificadores `terrania-multiplayer` e `terrania-origins-multiplayer-1` (imagem e projeto Docker) foram mantidos de propósito: são configuração da VPS.

## Teste local
Terminal 1: `cd server && npm install && npm run dev`
Terminal 2, na raiz: `npm install && VITE_MULTIPLAYER_URL=ws://localhost:8787/ws npm run dev`
Abra `http://localhost:5173/jogar/`; `curl http://localhost:8787/presence` deve mostrar `online: 1` em segundos.

## Histórico
A versão anterior (salas de até 12 jogadores, 8 salas, 48 conexões, 20 Hz) foi revisada em [REVISAO_MULTIPLAYER_20261108.md](REVISAO_MULTIPLAYER_20261108.md) antes da retirada.
