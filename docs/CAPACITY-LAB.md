# Terrânia — laboratório de capacidade extrema (sintético, sem deploy)

Este comando estressa **10.000.000 de registros de entidades** e **1.000.000 de registros de jogadores virtuais** realmente alocados e percorridos em memória. Não abre WebSockets, não inicia um servidor e não modifica o jogo, a VPS ou os limites da sala. **Não comprova um milhão de usuários simultâneos.**

## Executar

```bash
cd server-go
go test -race -count=1 ./cmd/capacity-lab
# Roda pequeno por padrão:
go run ./cmd/capacity-lab
# Roda o cenário máximo com guarda de RAM e gera relatório JSON:
go run ./cmd/capacity-lab -entities=10000000 -players=1000000 -ticks=3 -target-samples=100000 -memory-guard-mib=768 -report=/tmp/terrania-10m-1m.json
```

O GitHub Actions `.github/workflows/capacity-lab.yml` roda 100 mil/10 mil, 1 milhão/100 mil, 10 milhões/1 milhão, coleta métricas no summary e salva os três relatórios por 14 dias. O benchmark não exige Rust ou cgo, nem cria containers.

### Separação rigorosa de medidas

- **Realmente materializado:** arrays compactos Go com 24 bytes por entidade e 24 bytes por jogador. No máximo: 240 MB de entidades + 24 MB de jogadores (sem incluir outros objetos, runtime e sistema operacional); processamento de posições simplificado em todos os registros; amostra de buscas de alvo em no máximo 100 mil entidades, percorrendo até 12 jogadores da respectiva sala.
- **Estimado, não medido:** WebSockets, throughput de rede, serialização, colisões, IA completa, ticks reais do motor, balanceamento, autenticação, latência de jogadores. A extrapolação linear do custo de procura de alvos é somente uma indicação, não resultado do frame de 10 milhões.
- **Guarda:** teto rígido de 10 milhões/1 milhão, até 12 passagens, memória compacta projetada ×2 limitada por `-memory-guard-mib` (padrão 768 MiB). O guarda não controla o RSS de modo absoluto.

## Projeção para 1 milhão de jogadores virtuais

| Variável | Projeção / limite |
| --- | ---: |
| Jogadores | 1.000.000 |
| Entidades mistas | 10.000.000 |
| Salas mínimas a 12 jogadores por sala | 83.334 |
| Entidades por sala (média) | ~120 |
| Rust `MAX_ARENA_ENTITIES` por arena | 200.000 |
| Monstros vivos por sala no Go **atual** | 96 |
| Clientes por worker Go configuráveis (teto, não benchmark) | 10.000 |
| Workers teóricos **mínimos só por teto de clientes** | 100 |
| Agendamentos de salas a 20 Hz | 1.666.680/s |
| Atualizações de entidades se **todas** rodassem a 20 Hz | 200.000.000/s |
| Snapshots hipotéticos (1 milhão × 10/s) | 10.000.000/s |
| Saída hipotética (2048 bytes/snapshot) | 20,48 GB/s de payload, **163,84 Gbit/s** |
| Entrada hipotética (48 bytes × 20 inputs/s) | 0,96 GB/s de payload, **7,68 Gbit/s** |

Tamanhos de pacotes são **hipóteses configuráveis**, não amostras reais do protocolo. Não incluem TLS, retransmissão, framing ou compressão. Um único upgrade da VPS pode melhorar a CPU/memória, mas não satisfaz automaticamente o número de conexões, a banda e a necessidade de múltiplas instâncias.

## Pontos de estrangulamento encontrados no código atual

1. `server-go/cmd/terrania/limits.go` limita cada worker a 10 mil conexões e 10 mil salas; `perRoom=12` é fixo para paridade. A conta de **100 workers** é somente mínima por configuração, não promessa de hardware.
2. `server-go/cmd/terrania/room_runtime.go` cria uma goroutine e um ticker de 50 ms por sala. 83 mil salas no cluster implicariam 1,67 milhão de agendamentos por segundo. Planejar scheduler por worker/slots e métricas de lag, preservando um único dono por sala.
3. `server-go/cmd/terrania/main.go` mantém `readPump` e `writePump` por conexão (mais goroutines, buffers e arquivos do SO). Não confundir um milhão de structs com um milhão de sockets vivos; esse teste precisa de geradores distribuídos isolados.
4. `Room.SnapshotFor` percorre convidados/mobs para cada cliente a cada dois ticks. Interesse por região, cache de estado imóvel, delta-snapshots e limitação de fanout são candidatos a otimização com testes de paridade.
5. `rust/spatial-kernel/src/monsters.rs` procura o melhor alvo percorrendo os jogadores do lote para cada monstro. Precisamos medir índices por célula espacial, sem alterar empates determinísticos, combate ou alcance.
6. O espelho `rustarena` foi medido em ~38 ms para sincronizar 200 mil registros incluindo marshaling Go; dirty batches/versões de entidades podem evitar reenvio de objetos estáticos.
7. Para passar a múltiplos processos/servidores precisamos de roteamento estável `roomID → worker`, admission control, afinidade/reconexão, monitoramento e prevenção de *split brain* para o estado autoritativo.

## Próximas fases de engenharia (separadas do laboratório)

- Simular salas **reais** do motor com 12 jogadores e 96 mobs, aumentar quantidade de salas, comparar p95/p99 de tick, heap/GC e custo por snapshot.
- Realizar load test de WebSockets em laboratório com 100 → 1.000 → 10.000 clientes reais e depois geradores distribuídos, sem usar a VPS de produção como alvo.
- Testar centenas de milhares de entidades por **região ou arena** com índices espaciais, dirty-set e FFI seletiva, incluindo paridade Go/Rust.
- Planejar escalonamento vertical **e horizontal**, failover de salas, limites de banda e roteamento. Dimensão extrema só poderá ser certificada com infraestrutura e tráfego real apropriados.

**Isolamento:** branch de desenvolvimento; nada de PR, merge, alteração de deploy, abertura de portas ou substituição do servidor Go.
