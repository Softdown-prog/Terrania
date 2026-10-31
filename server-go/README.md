# Motor multiplayer Go do Terrânia — fase 1 (shadow)

Esta pasta contém **um motor Go real, separado**, e um servidor HTTP/WebSocket de laboratório. Ele não importa código TypeScript de `src/`, não usa Phaser, Canvas ou DOM, nem altera o `server/` Node atual.

## Separação de responsabilidades

- `src/`: mundo/renderização e simulação solo no navegador; Phaser é opcional.
- `server-go/engine/`: regras autoritativas Go (seed, terreno, colisão, personagem, slimes, salas, combate).
- `server-go/cmd/terrania/`: WebSocket e HTTP, validação de origem, limites, tick e snapshots.
- `src/shared/protocol.ts`: contrato v3 consumido pelo frontend. Go implementa o mesmo JSON independentemente.
- `server/`: servidor multiplayer Node de produção, mantido como referência até equivalência verificada.

## Executar sem afetar produção

Requer Go 1.23+:

```bash
cd server-go
go mod download
go test ./...
go vet ./...
ALLOWED_ORIGINS=http://localhost:5173 go run ./cmd/terrania
```

O Go escuta na porta **8788**; o Node permanece na **8787**. `GET /health` responde `{"status":"ok","engine":"go"}` e `/ws?room=origins` fala o mesmo protocolo JSON v3, com `welcome` e `state`. Para testes HTTP locais, use `curl http://127.0.0.1:8788/health`. O WebSocket exige `Origin` permitido.

**Atenção:** este é um port inicial, não substituição validada para o multiplayer. Antes de produção precisamos aprovar os testes de equivalência com o TS (terreno, colisão, movement, spawn/AI, combate e snapshots), testar Android, várias salas e reconexão, inspecionar consumo de CPU/memória e definir rollback. O Node continua sendo a fonte funcional até lá.

### Container de shadow

```bash
ALLOWED_ORIGINS=https://rpg.analysepro.com docker compose -f server-go/compose.staging.yml build
ALLOWED_ORIGINS=https://rpg.analysepro.com docker compose -f server-go/compose.staging.yml up -d
```

É **opt-in**, expõe somente `127.0.0.1:18788`, não modifica as rotas nem usa a rede do painel. Não faça isso na VPS sem acesso administrativo independente e teste de rollback.

### Segurança

Nenhum cliente pode mandar HP, posição, kills ou seed. O servidor rejeita inputs fora do intervalo, origem inválida, excesso de mensagens e salas não permitidas. Limites: 48 conexões, 8 salas, 12 jogadores por sala, 96 slimes por sala. Sem contas ou persistência nesta fase.

### Estado da migração

O protocolo JSON permanece v3 para evitar exigir deploy simultâneo do cliente. O código Go não compartilha imports com TypeScript. O objetivo é garantir a mesma simulação por testes de paridade, não presumir que os resultados serão idênticos apenas por compilar.
