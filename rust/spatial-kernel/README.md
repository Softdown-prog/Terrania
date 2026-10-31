# Terrânia — kernel Rust isolado (experimental)

Este módulo Rust é **opcional e isolado**. Não substitui o servidor multiplayer Go, não cria um serviço adicional na VPS, não usa WebSocket, não abre portas, não altera salas, inventário ou o banco de dados.

## Primeira responsabilidade: consultas espaciais

Arquivo: `rust/spatial-kernel/src/lib.rs`

- **Visibilidade:** filtrar, em ordem de inserção, os índices das entidades numa janela retangular (regra estrita `abs(dx) < limite && abs(dy) < limite`), como em `Room.SnapshotFor`.
- **Alvo mais próximo:** selecionar o índice do objeto de menor distância ao ponto, com alcance estrito e empate resolvido pelo primeiro na lista, como na escolha de alvos dos slimes.
- **Segurança:** rejeitar entradas não finitas, parâmetros inválidos e buffers insuficientes; o filtro não escreve parcialmente se o buffer for pequeno.
- **Sem dependências externas:** `Cargo.toml` não exige crates de terceiros.
- **C ABI v1:** o cabeçalho `include/terrania_spatial.h` define duas funções exportadas. Sua chamada exige ponteiro de memória válido e uso coordenado de buffers; a ponte Go/cgo é experimental, opt-in, e não faz parte do build padrão de produção.

O Rust calcula exclusivamente índices. A identidade das entidades, dados de jogadores, decisões de gameplay e autoridade continuam sob controle do Go.

## Por que ainda não ligar em produção?

Fazer uma chamada FFI por slime ou por jogador pode custar mais do que executar o loop em Go. Precisamos comparar custo de conversão de buffers, alocações, latência por tick e throughput **da integração real**, em lote, antes de habilitá-la.

Plano de ativação futura:

1. Comparar resultados Rust x Go com casos de limite, índices, empates, NaN e múltiplos cenários.
2. Benchmark separado da função Rust e da referência Go sob o **mesmo runner**. Os números são exploratórios e não incluem custo de FFI.
3. Manter o adapter Go opcional sob build tag `rustspatial` com fallback em Go; não exigir Rust em builds padrão.
4. Comparar desempenho e paridade do gameplay pelo mesmo teste de combate de 26 frames e pelo teste de 1.000 conexões.
5. Habilitar apenas quando for mensuravelmente útil. Se o ganho não se confirmar, manter Go puro.

## Executar no computador de desenvolvimento

A partir da raiz do repositório:

```bash
cargo fmt --manifest-path rust/spatial-kernel/Cargo.toml --all --check
cargo clippy --manifest-path rust/spatial-kernel/Cargo.toml --locked --all-targets -- -D warnings
cargo test --manifest-path rust/spatial-kernel/Cargo.toml --locked --all-targets
cargo build --manifest-path rust/spatial-kernel/Cargo.toml --locked --release
(cd server-go && go run ./cmd/spatial-reference)
cargo run --manifest-path rust/spatial-kernel/Cargo.toml --locked --release --bin spatial-check
```

A última e a penúltima linhas devem imprimir a **mesma** assinatura das 200 consultas e 4096 entidades geradas. O workflow do GitHub Actions executa tudo isso automaticamente.

## Limites de implantação

- **Sem deploy Rust na VPS** e sem alteração do `terrania-go-shadow`.
- **Sem alteração do Node público**, DNS, Caddy, Cloudflare, painel da VPS ou banco de dados.
- Não se deve atribuir a Rust um ganho de FPS, conexões ou memória antes de medir o mesmo workload com e sem integração.
- O motor Go continua responsável pela meta de 1.000 jogadores e pelo roteamento de salas.

## Ponte Go ↔ Rust experimental (opt-in)

A branch de integração agora inclui **duas implementações mutuamente exclusivas** do mesmo contrato usado diretamente por `Room.Tick` e `Room.SnapshotFor`:

- `server-go/engine/spatial_default.go`: **padrão**, sem cgo e sem Rust; mantém a escolha de monstros e a área de visão com os algoritmos Go originais.
- `server-go/engine/spatial_rust.go`: selecionada **somente** usando a build tag `rustspatial`, `CGO_ENABLED=1` e ambiente Linux AMD64. Usa batches de posições em vez de chamar Rust para cada entidade. Se a ABI sinalizar erro inesperado, preserva fallback Go.

**Build experimental em Linux AMD64 (não usar na VPS pública):**

```bash
cargo build --manifest-path rust/spatial-kernel/Cargo.toml --release --locked
cd server-go
CGO_ENABLED=1 go test -race -tags rustspatial ./...
CGO_ENABLED=1 go build -tags rustspatial -o /tmp/terrania-go-ffi ./cmd/terrania
```

A biblioteca Rust é vinculada **estaticamente** no binário Go experimental. Não é outro container ou serviço; não expõe rede. O Dockerfile padrão fixa `CGO_ENABLED=0` e **continua puramente Go**, incluindo o deploy staging atual.

O workflow `.github/workflows/rust-spatial.yml` roda os dois modos no **mesmo runner** e compara benchmarks Go puro vs Go com chamada FFI, incluindo custo de montagem de buffers, travessia Go→C→Rust e conversão de índices. Ele também executa os testes de invariantes, paridade determinística, race detector, Clippy e rustfmt.

**Critério de habilitação:** Rust só será considerado quando a integração completa trouxer ganho consistente e relevante em carga representativa, sem diferença de snapshots, IA ou risco no deploy. Benchmarks isolados e tempos obtidos no GitHub não medem a VPS nem comprovam capacidade de 1.000 jogadores ativos.


## Resultado inicial e criterio de continuidade (31/10/2026)

O PR #32 passou nos testes de formato, Clippy, paridade, race detector e compilacao da ponte Rust. No runner do GitHub, benchmarks **end-to-end**, incluindo conversao de posicoes e travessia cgo, mostraram que o caminho Rust ainda e **mais lento**:

| Microcenario | Go puro (mediana) | Go + Rust FFI (mediana) | Relacao FFI/Go |
| --- | ---: | ---: | ---: |
| Selecionar entidades de um snapshot (12 jogadores e 96 mobs) | 203,8 ns/op, 0 alocs | 1.675 ns/op, 6 alocs | 8,2x |
| Encontrar alvo entre 12 jogadores | 39,7 ns/op, 0 alocs | 106,9 ns/op, 1 aloc | 2,7x |

Essas medicoes antigas utilizaram `-benchtime=250x -count=3` e **nao** sao provas estatisticas nem de carga em producao. A CI foi estendida para executar tres repeticoes mais longas de `BenchmarkRoomTick12Players`, `BenchmarkRoomSnapshot12Players` e `BenchmarkRoomSnapshot1000Players`, alem das consultas espaciais. A tabela com medianas e alocacoes aparece no resumo do workflow. O teste de 1.000 entidades visiveis em **uma sala** e apenas um estresse do calculo de snapshots; nao simula 1.000 usuarios conectados, rede, gateway ou VPS.

**Politica:** sem alteracao no Docker de producao, sem deploy automatizado de Rust, sem forcar Rust para o trafego. Manter a implementacao pura Go ate comparacoes de sala e de carga real mostrarem vantagem consistente da integracao. Se o custo da FFI continuar maior, parar de otimizar esse caminho e manter o Rust como laboratorio isolado.
