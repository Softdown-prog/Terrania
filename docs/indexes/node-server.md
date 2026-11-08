# Servidor Node atual

> Gerado automaticamente a partir de `architecture/modules.json`. Estado: **active** · Camada: **backend**

Serviço HTTP: contador de quem está jogando, catálogo de itens (PostgreSQL) e saúde. Sem salas nem WebSocket; o jogo é solo e offline.

**Documentação de manutenção:** [`server/README.md`](../../server/README.md)

## Pontos de entrada

- [`server/src/main.ts`](../../server/src/main.ts)
- [`server/src/db/database.ts`](../../server/src/db/database.ts)
- [`server/src/db/migrate.ts`](../../server/src/db/migrate.ts)
- [`server/src/presence.ts`](../../server/src/presence.ts)

## Todos os arquivos deste módulo (22)

- [`server/.env.example`](../../server/.env.example)
- [`server/Dockerfile`](../../server/Dockerfile)
- [`server/README.md`](../../server/README.md)
- [`server/compose.yml`](../../server/compose.yml)
- [`server/db/README.md`](../../server/db/README.md)
- [`server/db/migrations/001_market.sql`](../../server/db/migrations/001_market.sql)
- [`server/ops/postgres-backup.sh`](../../server/ops/postgres-backup.sh)
- [`server/ops/pull-backup.py`](../../server/ops/pull-backup.py)
- [`server/package-lock.json`](../../server/package-lock.json)
- [`server/package.json`](../../server/package.json)
- [`server/scripts/public-smoke.mjs`](../../server/scripts/public-smoke.mjs)
- [`server/src/db/catalog.ts`](../../server/src/db/catalog.ts)
- [`server/src/db/database.ts`](../../server/src/db/database.ts)
- [`server/src/db/http.ts`](../../server/src/db/http.ts)
- [`server/src/db/migrate.ts`](../../server/src/db/migrate.ts)
- [`server/src/main.ts`](../../server/src/main.ts)
- [`server/src/presence.ts`](../../server/src/presence.ts)
- [`server/tests/database.integration.test.ts`](../../server/tests/database.integration.test.ts)
- [`server/tests/database.test.ts`](../../server/tests/database.test.ts)
- [`server/tests/http.test.ts`](../../server/tests/http.test.ts)
- [`server/tests/presence.test.ts`](../../server/tests/presence.test.ts)
- [`server/tsconfig.json`](../../server/tsconfig.json)
