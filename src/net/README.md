# Rede do cliente: presença e catálogo

**Papel:** consultas HTTP do site. O jogo é **solo e offline** (ADR 0010 e 0011): não existe conexão de jogo, sala, sincronização nem WebSocket.

- `presence.ts`: lê o contador de pessoas jogando (`GET /presence`) e deriva o endereço do sinal (`POST /presence/heartbeat`). Ausência ou erro de resposta é "desconhecido", nunca um zero inventado.
- `itemCatalog.ts`: lê o catálogo público de itens (`/market/catalog`), vindo do PostgreSQL.
- O emissor do sinal fica em `src/app/play-presence.ts`: id aleatório por aba, só na memória, enviado a cada 20 s **somente com a aba visível**; falhas de rede são ignoradas.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md).

**Ao alterar:** o servidor (`server/src/presence.ts`) e o cliente precisam concordar no formato; teste as duas pontas. `VITE_MULTIPLAYER_URL` continua sendo lido só para derivar o endereço do servidor (nome histórico; hoje é a base HTTP, não um WebSocket).

**Verificação:** `tests/presence.test.ts`, `tests/play-presence.test.ts`, `tests/item-catalog.test.ts` e `server/tests/http.test.ts`.

**Limites:** o contador é informativo. Quem controla o navegador pode inventar ids até o limite do servidor (5.000 abas simultâneas). Nenhum dado de jogo (posição, vida, itens) sai do navegador.
