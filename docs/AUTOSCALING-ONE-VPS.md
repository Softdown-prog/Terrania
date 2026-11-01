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
