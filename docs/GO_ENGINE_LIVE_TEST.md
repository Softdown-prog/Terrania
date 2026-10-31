# Fase 4 — teste real em Go antes da saúde do container

A revisão Go deste PR incorpora um **teste end-to-end com dois clientes WebSocket reais** a cada inicialização do processo. O motor de simulação Go, o WebSocket de rede e o protocolo JSON v3 entram em uso real, mesmo no container shadow da VPS.

1. O processo Go abre a porta HTTP `8788`, mas mantém `GET /health` em HTTP **503** durante a partida.
2. Usando o próprio loopback do container, conecta **dois clientes na mesma sala temporária** com `Origin` autorizado.
3. Confirma boas-vindas v3, dois IDs únicos, seed de sala igual e snapshots com dois jogadores.
4. Envia inputs para o primeiro e verifica que o segundo observa o movimento autoritativo.
5. Fecha as conexões; só então publica HTTP **200** e torna o container `healthy`.
6. Em falha de handshake, movimento ou timeout, o processo falha e a política de restart do shadow lida com a tentativa. O broker *não aprova* um motor que responda apenas HTTP sem completar o teste real.

Os testes `TestRealTwoPlayerStartupProbe` também exercitam o mesmo código com o motor Go em Go CI e detector de corrida.

## Comparação Go x Node

O workflow `go-engine.yml` monta os dois Dockerfiles no **runner do GitHub**, com CPU `0.50` para cada servidor, **12 conexões por servidor**, cerca de 10 inputs por segundo por jogador e três amostras de `docker stats`. O relatório inclui a memória, CPU relatada pelo Docker e intervalo p50/p95 entre snapshots recebidos.

Essa medição **NÃO é a VPS**: não valida rede externa, capacidade de 1000 jogadores nem garante redução de custo. Serve para detectar regressões e estabelecer uma base comparativa reproduzível.

## Atualização do shadow

O workflow de deploy manual continua em `Actions → Terrania Go staging na VPS`. O gatilho de issue fechado no [#21](https://github.com/Softdown-prog/Terrania/issues/21) pode ser acionado por uma nova issue com título exato `[Terrania Go] deploy shadow`, aberta pelo usuário autorizado. O broker já instalado verifica revisão, origem/digest, saúde do container em loopback e imutabilidade do Node de produção.

**Não alterar a rota WSS pública para Go antes de testes no cliente real, equivalência do combate e medição na VPS.**

### Evidências requeridas antes da próxima promoção

- Job de CI Go: `go test -race`, comparação TS/Go e benchmark de carga no runner.
- Job de deploy da VPS: `exitCode=0`, `loopbackVerified=true`, `nodePreserved=true`, `unrelatedContainersPreserved=true`.
- Logs do contêiner Go com `Go live 2-player startup probe OK` (a mudança do health para HTTP 200 depende dessa condição).
