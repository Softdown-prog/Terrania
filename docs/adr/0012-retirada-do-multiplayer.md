# ADR 0012 — Retirada do modo multiplayer

**Estado:** aplicado em 2026-11-08. Executa a direção do [ADR 0010](0010-solo-offline-e-mercado-online.md).

## Decisão

Terrania é **solo e offline**. O servidor deixa de simular salas. O online passa a servir apenas a:

1. **contador de quem está jogando** (`GET /presence`, alimentado por `POST /presence/heartbeat`);
2. **catálogo de itens** (`/market/catalog`, PostgreSQL), base da futura troca de itens raros;
3. **saúde** (`/health`).

Sem sala, sem WebSocket, sem chat, sem mapa compartilhado.

## O que foi removido

| Parte | Antes | Agora |
| --- | --- | --- |
| `server/src/Room.ts`, `/ws`, dependência `ws` | simulação autoritativa por sala | removidos |
| `src/net/MultiplayerClient.ts`, `SnapshotTimeline.ts`, `src/shared/protocol.ts` | cliente WebSocket e contrato | removidos; `InventoryOutcome` foi para `src/engine/Inventory.ts` |
| `Game.ts` | ramos solo e online | só solo (de 679 para ~470 linhas) |
| HUD e `GameUi` | `online`, `nearby`, `mapPlayers`, `travelNotice`, `status`, pendências de sala | removidos |
| Atlas | marcadores de outros jogadores | removidos |
| Site | formulário "Acessar sala" e convites | removidos; textos de guia, privacidade e termos reescritos |
| QA | cenário `onlinePatrol` (`runOnlinePatrolQa`) | removido; relatório v6 com 4 cenários |
| CI | `online-smoke` (dois jogadores via WSS) | `public-smoke`: saúde, presença e sinal anônimo |
| Testes | `room`, `integration`, `hardening`, `snapshot-timeline`, `tap-online` e trechos online do Playwright | removidos ou reescritos para o solo |

## O que foi **preservado de propósito**

- `server-go/` (worker, gateway, cluster) e `rust/spatial-kernel/`: laboratórios fora do produto, **não removidos** (AGENTS.md: não apagar código legado funcional só para reduzir arquivos). Nenhum deles importa o protocolo TypeScript removido.
- Regras compartilhadas em `src/engine`, `src/world`, `src/actors`: o solo as usa e o catálogo do servidor também.
- Nomes de infraestrutura da VPS (`terrania-multiplayer`, projeto `terrania-origins-multiplayer-1`, chave `multiplayer` em `VPS_IMAGES`) **não foram alterados**: são configuração da VPS. A variável `VITE_MULTIPLAYER_URL` continua sendo lida, só para derivar o endereço HTTP do servidor (nome histórico).

## Presença sem WebSocket

Cada aba com o jogo aberto **e visível** envia, a cada 20 s, um id aleatório (32 hex, só em memória, nunca gravado). O servidor guarda `id → último sinal` por ~45 s, no máximo 5.000 ids, ignora repetições com menos de 5 s e descarta ids inválidos. Não há IP, conta ou personagem associados no código do servidor.

**Limites conhecidos:** é um contador **informativo**. Quem controla o navegador pode inventar ids até o limite. Um sinal sem `Origin` permitido é recusado, o que reduz abuso casual mas não impede quem forja o cabeçalho. A expiração é verificada no máximo uma vez por segundo (tolerância de 1 s).

## Efeito em produção e ordem de rollout

O merge na `main` dispara `deploy-vps.yml` (servidor) e `deploy-pages.yml` (site) **automaticamente**. As duas pontas não trocam de versão ao mesmo tempo, e cada ordem degrada de forma suave por pouco tempo:

- **Servidor novo antes do site novo:** o site antigo tenta o WebSocket, falha e cai no jogo local; o contador antigo exige o campo `rooms` e mostra "Contagem indisponível" até o site novo chegar.
- **Site novo antes do servidor novo:** o site novo manda sinais que o servidor antigo ainda não conhece (404, ignorado) e o contador mostra 0 até o servidor atualizar.

Nenhum dado de jogador é afetado: o progresso solo sempre esteve no navegador. O progresso das salas online era temporário e deixa de existir.

## Consequências

- Desaparece a superfície de ataque de WebSocket e a simulação em memória (incluindo os defeitos corrigidos na [revisão de 2026-11-08](../REVISAO_MULTIPLAYER_20261108.md)).
- A escala deixa de depender de banda de snapshots. O risco passa a ser a integridade da futura troca de itens (ADR 0010).
- O progresso solo continua em `localStorage`, editável pelo jogador: nada que exija confiança pode depender dele.

## Não verificado

- Build da imagem Docker e o deploy real (a VPS e o Docker não foram usados aqui).
- Smoke público contra produção (`server/scripts/public-smoke.mjs`): escrito e executado apenas pela CI no deploy.
- Jogo em aparelho Android físico.
