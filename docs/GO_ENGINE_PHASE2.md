# Terrânia Go — fase 2: robustez e homologação

## O que esta fase entrega

- Testes WebSocket reais para **48 conexões**, **8 salas**, **12 jogadores/sala** e limpeza de salas após desconexão.
- Verificação de isolamento: uma sala não recebe jogadores de outra.
- Testes de entradas inválidas, tentativas de forjar HP e exceder o limite de 35 mensagens/s.
- O evento `welcome` sempre sai antes dos snapshots, incluindo com carga.
- Fila do cliente guarda **apenas o snapshot mais recente**, evitando estados antigos quando o consumidor está lento.
- Desligamento com **SIGTERM** e fechamento de conexões WebSocket para facilitar rollback.
- Benchmarks `BenchmarkRoomTick12Players` e `BenchmarkRoomSnapshot12Players`, registrando alocações, sem anunciar capacidade não medida.

## Verificação reproduzível

```bash
cd server-go
go mod verify
go test -race -count=1 ./...
go vet ./...
go test ./engine -run '^$' -bench '^BenchmarkRoom' -benchtime=100x -benchmem
docker build -f Dockerfile -t terrania-go:shadow ..  # executar na raiz do repo: comando equivalente abaixo
```

Para compilar a imagem, **na raiz do repositório**:

```bash
docker build -f server-go/Dockerfile -t terrania-go:shadow .
```

## Staging na VPS: nunca publicar automaticamente

O Node atual usa a rota oficial e continua na porta 8787. O Go só deve ser executado como **shadow** se houver acesso administrativo independente para recuperação:

```bash
ALLOWED_ORIGINS=https://rpg.analysepro.com docker compose -f server-go/compose.staging.yml config
ALLOWED_ORIGINS=https://rpg.analysepro.com docker compose -f server-go/compose.staging.yml up -d --build
curl --fail --silent http://127.0.0.1:18788/health
```

Essa porta é **apenas loopback do host**, sem exposição pública e sem alterar Caddy, Cloudflare, portas do Node, painel da VPS ou serviços de outros projetos. Não instalar nem modificar serviços a partir do teste CI.

### Critérios antes de trocar o servidor principal

1. Confirmar no host a revisão exata e comparar a resposta `/health` de Node e Go.
2. Executar smoke end-to-end com cliente real no shadow, incluindo reconnect e reconciliação de estado.
3. Validar as regras autoritativas de spawn/IA, combate, dano, colidir em construções e save offline frente à referência TypeScript. A paridade estática e de movimento já existe, mas **não cobre todo o comportamento de combate com múltiplos jogadores**.
4. Medir p95/p99 dos ticks, CPU, RSS, memória, conexões e tráfego, sob a mesma carga do Node. Os testes de limite não provam suporte a centenas de usuários.
5. Validar distribuição WebSocket `wss://`, SSL, Caddy e política de origem em staging **protegido** antes de cutover. Não mudar `VITE_MULTIPLAYER_URL` até a homologação.
6. Preparar rollback para a mesma imagem/revisão Node que está em produção e executar troca de rota numa janela controlada, sem tocar outros containers.

## Observações importantes

- `server-go/engine/` não depende de DOM, Phaser, Node, Canvas nem código compartilhado TypeScript.
- É um motor **de servidor autoritativo** separado. O navegador mantém TypeScript e Phaser/Canvas; a simulação solo continua independente.
- HTTP `/health` confirma que o processo responde; não garante que WebSocket, simulação e todos os jogadores estejam saudáveis.
- Testes de limites usam simulação de conexões locais, não tráfego real na rede externa ou desempenho máximo.
