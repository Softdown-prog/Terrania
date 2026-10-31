# Terrânia — fundação para 1.000+ jogadores

Objetivo: preparar picos de 1.000 jogadores **em várias salas**, sem prometer que a VPS compartilhada (4 vCPU, 4 GB) já aguenta 1.000 simulações a 20 Hz.

## Arquitetura

- `src/`: jogo, renderização, cliente WebSocket e modo offline em TypeScript.
- `server-go/cmd/gateway/`: entrada WebSocket, controle de assentos, distribuição automática de jogadores que escolhem `origins`.
- `server-go/cluster/`: hashing rendezvous determinístico por sala, afinidade de salas com worker Go.
- `server-go/cmd/terrania/`: worker autoritativo Go, movimento, combate, monstros, ticks e snapshots.
- `server/` Node.js: continua na rota pública até um cutover testado, com rollback.

### Fluxo

    Navegador (WSS)
       |
       v
    Gateway Go (admissão de até 1000)
       |
       +--- origins     jogadores 1-12
       +--- origins-2   jogadores 13-24
       +--- origins-3   jogadores 25-36
       +--- ...
       +--- origins-84  últimos jogadores
       |
       v
    Hash estável(room) -> Worker Go A/B/C/.../N

Todas as conexões com o mesmo room ficam no mesmo worker; assim não surgem duas versões autoritativas de uma sala. Salas explícitas em links para amigos continuam privadas e não são movidas pelo lobby. O primeiro grupo mantém a seed histórica de `origins`; grupos extras têm seeds distintas. **Isto não significa 1.000 personagens no mesmo mapa!** Mundo único com setores, transferência de jogador e persistência é outra etapa.

## Capacidade configurável por processo

Por padrão um worker Go continua em 48 conexões / 8 salas / 12 jogadores por sala. O deploy Node não muda. O Go aceita:

- `MAX_CLIENTS`: limite de sessões por worker (1 a 10000), sem implicar que hardware suportará o máximo.
- `MAX_ROOMS`: limite de salas por worker (1 a 10000).
- `/status`: conexões, salas, revisão, tempo do último tick e ticks que ultrapassaram 50ms.

No gateway:

- `GO_SHARDS`: lista imutável de endpoints internos fixados por administrador: `worker-a=http://127.0.0.1:8788,worker-b=http://127.0.0.1:8789`.
- `GATEWAY_MAX_CLIENTS`: assentos lógicos (padrão 1000).
- `GATEWAY_MAX_ROOMS`: salas lógicas (padrão 84).
- `/capacity`: ocupação dos assentos daquele gateway, não garantia de capacidade efetiva dos workers.

### Teste local com dois workers

Terminal 1, a partir de `server-go/`:

    MAX_CLIENTS=128 MAX_ROOMS=16 ALLOWED_ORIGINS=http://localhost:5173 PORT=8788 go run ./cmd/terrania

Terminal 2:

    MAX_CLIENTS=128 MAX_ROOMS=16 ALLOWED_ORIGINS=http://localhost:5173 PORT=8789 go run ./cmd/terrania

Terminal 3:

    GO_SHARDS=worker-a=http://127.0.0.1:8788,worker-b=http://127.0.0.1:8789 ALLOWED_ORIGINS=http://localhost:5173 GATEWAY_MAX_CLIENTS=1000 GATEWAY_MAX_ROOMS=84 go run ./cmd/gateway

Teste em `ws://127.0.0.1:8790/ws?room=origins`; não publique diretamente em HTTP sem TLS. Dois workers com 128 slots cada NÃO entregam 1000 vagas: o limite do gateway é um teto, não capacidade garantida.

## Evidências e limites atuais

- CI testa 1000 handshakes reais distribuídos em 84 salas num único worker **sem simulação 20 Hz**, e testes do lobby com 1100 tentativas concorrentes, roteamento estável de 1000 salas e gateway WebSocket real.
- **Esses testes validam admissão e afinidade, não gameplay de 1000 jogadores sob carga real.** Um servidor Go com a simulação atual ainda usa mutex global durante o tick; isso será próximo gargalo a eliminar.
- O Go shadow atual na VPS tem 0,5 CPU e 128 MiB. Nunca definir 1000 conexões nele sem simulação real de carga e margem; Node continua público com 48 conexões.
- O gateway atual tem livro de reservas **em memória local**. Não executar duas réplicas de gateway com contadores independentes; para HA usar coordenação compartilhada.
- Adicionar/remover worker altera o hash de algumas salas e pode requerer drenagem e reconexão. Ainda não há transferência de estado entre workers.

## Próximas fases antes de liberar 1000 em produção

1. Carga progressiva de 100/250/500/1000 jogadores movendo-se, atacando e gerando mobs, com p95/p99 de tick, latência, CPU/RAM e reconexões.
2. Execução independente das salas (remover mutex global), controle de interesse/visibilidade nos snapshots e limites de uso por sala e por worker.
3. Capacidade por worker e roteamento que evite sobrecarregar um único worker, métricas de cluster, alertas, TLS e isolamento de rede.
4. Persistência de personagens/itens, autenticação e antifraude; preparar transferência entre áreas e drenagem de workers.
5. Homologar num host isolado ou VPS maior, preservar Node e realizar cutover reversível somente após teste end-to-end e aprovação.

A ideia é deixar as **cadeiras previstas e a estrutura ampliável**, sem oferecer mil lugares fictícios numa máquina pequena.
