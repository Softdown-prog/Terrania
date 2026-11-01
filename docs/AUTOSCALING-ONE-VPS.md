# Terrânia — autoscaling horizontal na MESMA VPS (laboratório opt-in)

**Objetivo:** o jogo recebe um pico de 10, 90, 1.000, 10.000 ou mais interessados; o **mesmo host** pode aumentar o número de containers Go/Rust, desde que tenha CPU/RAM reais disponíveis, e diminuir após a carga baixar. Isto é **horizontal pod/container autoscaling**, ou *scale-out / scale-in*. NÃO exige múltiplas VPSs. Este módulo não implementa Kubernetes, nem substitui o motor.

## Situação factual em 2026-11-01

- **Já existe**: gateway Go com `GO_SHARDS` estático, afinidade por sala, workers Go, `/status`, quotas por processo, simulações de regiões, Raft isolado e código Rust FFI opcional.
- **Novo neste laboratório**: `server-go/autoscale/policy.go`, função pura `Calculate(Config, Observation)`, que produz recomendações `Start`, `Drain` e `Stop`, calcula demanda e recusa exceder teto de réplicas ou CPU/RAM livre da VPS compartilhada. Testes locais e GitHub Actions exercitam picos sintéticos, cooldown, drenagem e extrapolação matemática.
- **AINDA NÃO EXISTE**: coleta confiável de fila e métricas do host; criação real de containers por Docker Compose; descoberta dinâmica de containers; atualização atômica de rotas `room → worker`; `readiness` e coordenação de ciclo de vida; controle de concorrência entre um ou mais controladores; persistência de reservas; elasticidade automática em produção. **Nenhum container sobe ou desce com este código sozinho.**
- A arquitetura regional multihost/Raft permanece laboratório separado. Não é necessária para o objetivo inicial de escalar containers em uma VPS.

## Política ilustrativa (NÃO é parâmetro de produção)

`MinWorkers=1`, `MaxWorkers=4`, `SeatsPerWorker=48`, `TargetPercent=80`, `CPUMilliPerWorker=500`, `MemoryMiBPerWorker=256`, cooldown de 2 minutos.

A meta é **38 jogadores por container** (80% de 48, arredondado para baixo), com 10 vagas de folga. Com 10 jogadores, 1 worker basta. Com 90, seriam desejáveis 3. Para 10.000, seriam desejáveis **264** workers nesse modelo, mas `MaxWorkers=4` só permitiria no máximo 4 na hipótese de recursos livres (192 vagas teóricas). A VPS **não pode criar capacidade ilimitada** por conta própria. Para 1 milhão, o retorno é uma demanda teórica, **não um teste de 1 milhão de conexões**.

O valor real de `MaxWorkers` tem de ser calculado sobre RAM/CPU **disponíveis após reservar margem para SO, painel e TODOS os outros projetos**, e sobre benchmarks reais a 20 ticks/s, latência, snapshots, GC e banda. O gateway atual suporta no máximo 128 entradas estáticas e não é um controlador de escalabilidade.

## Registry e afinidade implementados na etapa seguinte

O módulo `cluster.WorkerRegistry` é um **diretório dinâmico em memória e exclusivo de um gateway**: `Register`, `SetReady`, `Acquire`, `Drain`, `Remove` e `Snapshot`. A admissão reserva atomica­mente uma sessão no worker e fornece uma função idempotente de liberação. O diretório limita clientes e salas por worker e nunca move uma sala enquanto uma conexão estiver ativa. A escolha de uma sala nova privilegia ocupação menor e desempate determinístico.

O gateway tem a entrada experimental `gatewayHandlerWithRegistry`, testada com um `httptest.Server` para cada worker, **WebSockets reais e proxy HTTP**, enquanto o binário real continua chamando `gatewayHandlerWithLobby` com `staticWorkerSource` e `GO_SHARDS`. Não há endpoint HTTP para gestão de membership nem acionamento de Docker. O diretório recusa remover worker ocupado e fecha a entrada para novas sessões quando ele está em drain; conexões existentes continuam até encerrar. Uma reconexão a sala em drain recebe indisponibilidade, **não é silenciosamente transferida**.

**Limitação deliberada:** `WorkerRegistry` perde a tabela de ownership após reinício do gateway; não é HA, não persiste autoridade do jogo nem deve ser usado com dois gateways simultâneos. Um futuro supervisor deverá controlar estado durável, verificar readiness real, atualizar novas salas, garantir limite de CPU/RAM e reconciliar o Docker. Limites de 128 backends do roteador ainda se aplicam. Nenhum container é criado ou removido nesta etapa.

Verificação:
```sh
cd server-go
go test -race -count=5 ./cluster -run '^TestRegistry'
go test -race -count=5 ./cmd/gateway -run '^TestGatewayDynamic'
go test -count=1 ./...
```

## Protótipo de supervisor Docker local (sem execução na VPS)

A pasta `server-go/autoscale/` agora inclui:

- `DockerDriver`: adaptador para a **API Docker sobre socket Unix local**, sem invocar shell. Requer imagem imutável fixada por digest SHA-256, rede dedicada `terrania-*`, limites de CPU, RAM, PIDs, root filesystem somente leitura, capacidades removidas e **nenhuma porta pública mapeada**.
- `Supervisor`: sequência `Create → Start → Docker healthy → Registry.Register → Registry.SetReady`; falha de boot tenta remover somente o container recém-criado. As consultas de prontidão têm timeout e jamais publicam backend antes de health comprovado.
- Na redução: `Drain` bloqueia novos WebSockets, aguarda `Clients=0` e `Rooms=0`, remove do diretório antes de parar e remover do Docker. Se Docker falhar, conserva o container ID para uma tentativa explícita de recuperação; **não remove containers desconhecidos**. Cada operação Docker confere ID exato, nome e labels próprias.
- Testes do driver usam um servidor HTTP Docker **simulado**; testes de supervisor usam runtime falso e o diretório real com `go test -race`.

**Não executar este protótipo com o socket Docker no gateway público.** O socket fornece acesso amplo ao host; o fato de o adaptador restringir suas chamadas não restringe outros processos que tenham acesso ao socket. É necessária uma conta/processo local isolado, permissões explícitas e um canal autenticado de controle para a integração futura.

**Não é um autoscaler operacional:** não existe serviço/daemon agendando `Calculate`, coleta real da CPU/RAM compartilhada, persistência das operações e IDs após restart, recuperação de containers órfãos, descoberta automática e atualização do gateway em produção, ou testes de integração com Docker real. O supervisor e o registro ainda são bibliotecas de laboratório, não conectadas ao gateway em produção. Se o controlador reiniciar, a tabela em memória não pode autorizar remoção automática de containers preexistentes. O backend Dockerfile atual compila Go puro; a imagem de Go+Rust deve ser construída e validada separadamente antes de ser considerada para escalonamento.

A política de isolamento para a VPS multiprojetos permanece **nenhum deploy e nenhuma interferência no painel, bancos, gateways e containers dos demais projetos**.

## Controlador de reconciliação (laboratório, sem ativação)

A nova `Controller.Reconcile(ctx, now)` conecta **`Calculate` → `Supervisor` → `WorkerRegistry`**, exclusivamente em código de laboratório. A cada amostra **confiável e recente do host** (`HostObserver.Read`), ela considera conexões reais reservadas no registro, fila de admissões informada pelo observador e CPU/RAM livres após descontar todos os outros projetos.

- **Scale-out:** no máximo **um container por amostra nova**, mesmo sob pico; o próximo só é criado depois de outra leitura da capacidade. IDs de workers são gerados dentro de `as-worker-0001..9999`, sem reutilizar IDs ainda registrados ou sob supervisão. Cada `Start` segue o fluxo de saúde e publicação de backend já testado.
- **Scale-in:** requer pelo menos duas amostras consecutivas de demanda baixa, além do cooldown da política. Primeiro bloqueia novas entradas, conserva as sessões e somente remove um worker se estiver vazio. Nenhuma sessão WebSocket é migrada por essa rotina.
- **Amostra repetida:** um timestamp `SampledAt` já processado não pode gerar novo provisionamento, mesmo com 100 chamadas concorrentes. Telemetria anterior ao limite, futura, inválida ou com erro faz a reconciliação falhar sem mutação.
- `Controller.Run` disponibiliza agendamento por ticker para um **programa supervisor futuro**; ele não é chamado por `cmd/gateway`, `cmd/terrania` nem por qualquer serviço da VPS. Seu uso precisará de fonte de telemetria real, registros duráveis e canal de controle autenticado.

**Pontos ainda não resolvidos:** a coleta de CPU/RAM disponível na VPS compartilhada e backlog real de novos usuários; continuidade de identidade dos containers em restart; separação de privilégios do Docker; API privada autenticada de membership; ensaio Docker real; rate limits de conexão e proteção antiabuso. As cotas usadas pelos testes são sintéticas, não aferições da VPS.

## Ciclo de vida pretendido

1. O controlador recebe métricas confiáveis (conexões ativas **por worker**, backlog de admissões, RAM/CPU realmente livres e timestamps). Métricas desatualizadas devem impedir mudanças, jamais autorizar um scale-out infinito.
2. `Calculate` recomenda quantos containers a mais são seguros, considerando a capacidade configurada **e a folga real do host**. O supervisor, em processo privilegiado local e com comandos estritamente limitados ao projeto Terrania, provisiona as réplicas. **NÃO montar `/var/run/docker.sock` no gateway público, nem oferecer API Docker remotamente.**
3. Workers novos entram em `starting`, passam health/readiness e só então recebem novas **salas**. O gateway precisa de um diretório estável de `room → worker`: jamais recalcular o dono de uma sala ativa só porque o número de containers mudou. O roteador fixo atual não faz isso.
4. Na queda de demanda, a política recomenda `Drain`: parar novas admissões para o worker, preservar os WebSockets, esperar zerar conexões/salas; só depois outra observação permite `Stop`. Desligamento forçado precisa de política explícita de recuperação de sala (ainda não há).
5. Adotar intervalo de amostragem, cooldown, rate limit de criação/remoção, uma única autoridade de controle e persistência de estados para impedir *thrashing* e duplicações. Se o host atingir um limite, responder com fila/rejeição **limitada**, nunca sacrificar outros containers/projetos.

**Cuidado:** a policy retorna uma recomendação. Ela **não efetua** nenhuma das ações acima e não garante que uma sala existente sobreviverá a queda abrupta de container. As ações exigem novos componentes e testes de ponta a ponta com gateway e Docker isolados.

## Testes

```sh
cd server-go
go test -race -count=3 ./autoscale
go vet ./autoscale
```

GitHub Actions: `.github/workflows/autoscale-lab.yml` — apenas laboratório, sem credenciais, sem Docker, sem VPS e sem deploy. Os cenários de 10, 90, 10 mil e 1 milhão são **entradas sintéticas para testar a decisão**, não sockets abertos.

## Próxima etapa de integração

Implementar primeiro um registry de ownership e saúde dos workers no gateway (IDs estáveis, novas salas apenas, `drain` sem derrubar sessões) com testes concorrentes. Depois criar, **em laboratório isolado**, um adaptador local que observa o host, executa apenas operações allowlisted de Docker Compose deste projeto e reconcilia worker recém-iniciado. Desligado por padrão e proibido de tocar na VPS antes de validação expressa e de um procedimento de rollback.
