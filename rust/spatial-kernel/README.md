# Terrânia — kernel Rust isolado (experimental)

Este módulo Rust é **opcional e isolado**. Não substitui o servidor multiplayer Go, não cria um serviço adicional na VPS, não usa WebSocket, não abre portas, não altera salas, inventário ou o banco de dados.

## Primeira responsabilidade: consultas espaciais

Arquivo: `rust/spatial-kernel/src/lib.rs`

- **Visibilidade:** filtrar, em ordem de inserção, os índices das entidades numa janela retangular (regra estrita `abs(dx) < limite && abs(dy) < limite`), como em `Room.SnapshotFor`.
- **Alvo mais próximo:** selecionar o índice do objeto de menor distância ao ponto, com alcance estrito e empate resolvido pelo primeiro na lista, como na escolha de alvos dos slimes.
- **Segurança:** rejeitar entradas não finitas, parâmetros inválidos e buffers insuficientes; o filtro não escreve parcialmente se o buffer for pequeno.
- **Sem dependências externas:** `Cargo.toml` não exige crates de terceiros.
- **C ABI v1:** o cabeçalho `include/terrania_spatial.h` define duas funções exportadas. Sua chamada exige ponteiro de memória válido e uso coordenado de buffers; a ponte Go/cgo é experimental, opt-in, e não faz parte do build padrão de produção.

Na integracao original o Rust calculava exclusivamente indices. O modulo `src/monsters.rs` agora tambem calcula **decisoes de monstros em lote**. A identidade das entidades, os dados de jogadores, o estado autoritativo e o motor de rede continuam sob controle do Go.

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

## Modulo de monstros em Rust (experimental, nao ativar na VPS)

Arquitetura pretendida: **Go = networking, gateway, salas, sincronia, autoritativo. Rust = processamento massivo da IA e estados de monstros e entidades no futuro.** Uma unica aplicacao, sem segundo servidor nem outra porta.

Na etapa atual `server-go/engine/monsters_rust.go` faz **uma chamada FFI por tick da sala**, nunca uma chamada por slime. A biblioteca Rust `src/monsters.rs` recebe snapshots simples de monstros e jogadores e calcula alvo, temporizadores, perseguicao e intencao de ataque em um unico batch. O Go continua dono da colisao com o mapa, aplicacao de dano e da memoria persistente das entidades — a migracao completa da memoria dos monstros para um gerenciador Rust com handles estaveis ainda **nao foi implementada**. Nao ha prometido ganho sem medicao.

Para compilar **somente em Linux amd64 experimental**:

```bash
cargo build --manifest-path rust/spatial-kernel/Cargo.toml --release --locked
cd server-go
CGO_ENABLED=1 go test -race -tags rustmonsters ./...
CGO_ENABLED=1 go test -race -tags 'rustmonsters rustspatial' ./...
CGO_ENABLED=1 go test -tags rustmonsters ./engine -run '^$' -bench '^BenchmarkMonsterStep96$' -benchmem
```

O build normal **nao** usa `rustmonsters` nem `rustspatial`. Se o planner Rust rejeitar a entrada, nenhuma entidade Go e alterada e o processamento usa a logica Go original. A CI verifica Rustfmt, Clippy `-D warnings`, `pedantic` e `cargo`, formatacao, teste Rust, paridade Go/Rust, race detector e benchmark dedicado a 96 monstros. A unica area Rust com `unsafe` e `src/ffi.rs`; `src/monsters.rs` usa `#![forbid(unsafe_code)]`.

Proximos passos: reduzir copia de buffers e alocacoes; migrar colisao espacial para dados de tiles compartilhados em batch, com paridade deterministica; testar o design de arena/handles persistentes; verificar latencia de tick e memoria antes de habilitar na VPS, mantendo operacao Go puro como fallback.

## Preparacao de escala — 1.024, 4.096 e 16.384 entidades (experimental)

O novo `src/entity_arena.rs` e um **gerenciador Rust genérico e reutilizável** que suporta monstros, NPCs, projéteis, recursos e entidades ambientais. Usa armazenamento denso, remoção por troca, IDs com geração (handles que não podem apontar para uma entidade substituta após despawn), verificação de coordenadas e limites de memória. O limite configurável da arena experimental e **65.536 entidades ativas por arena/sala**, não por conexão. Novos tipos podem usar `EntityKind(u16)` sem alterar a estrutura. Não há `unsafe` nem rede nesse módulo.

Os testes Rust exercitam 16.384 entidades de tipos mistos, remoção/reutilização, handles expirados e limite de memória; o planner executa lotes de 1.024, 4.096 e 16.384 monstros. A CI também executa paridade Go/Rust em 1.024/4.096 monstros e benchmarks completos de tick. **Esses são testes de capacidade funcional e custo local no GitHub Actions; não garantem TPS, 65.536 NPCs simultâneos em produção, nem 1.000 jogadores conectados.**

A arena **ainda não é dona do estado vivo do jogo**: o Go mantém `Room.mobs` e `MaxMobs=96`, e o adaptador Rust continua recebendo buffers por tick. O armazenamento Rust está preparado e testado isoladamente; migrar ownership e oferecer um contrato FFI de arena persistente, com isolamento por sala e limpeza explícita, será uma etapa posterior, junto a perfil de memória e benchmark sem rede.

Sem mudanças no Docker, na VPS ou na `main`.

## Backend: buffers por sala e caminho FFI sem alocacao por tick

O backend Go agora mantém buffers de entrada, jogadores e saída **dentro de cada `Room`**, reutilizados pelo único goroutine proprietário da sala. Não há cache global compartilhado nem ponteiros preservados no Rust entre ticks. O `room.Tick` utiliza `stepMonstersWithScratch`; chamadas de teste avulsas podem usar um scratch local. O adaptador elimina os vetores temporários `afterX`/`afterY`, lê essas coordenadas dos registros já enviados ao Rust e evita recalcular colisão quando não há impulso de knockback ou movimento. Lotes inválidos retornam para o caminho Go antes de qualquer mutação de entidades.

O objetivo é reduzir o custo da ponte, sobretudo em 1.024 e 4.096 monstros. O CI mede novamente essas cargas e verifica paridade, reutilização de capacidade, rejeição atômica e ausência de alocações após o aquecimento dos buffers. **O limite ativo da sala continua em 96 e a integração Rust continua opt-in.** A capacidade da arena Rust não implica desempenho garantido, nem muda Go como motor de rede.

## Experimental mirror Go -> arena Rust persistente (build tag rustarena)

A nova ABI `src/ffi_arena.rs` permite criar, atualizar em lote, consultar e remover entidades numa arena Rust por sala, com handles `u64` contendo ID de slot e geracao. O `EntityArena` armazena entidades de tipos genericos e rejeita handles obsoletos. A mesma entidade pode ser atualizada sem re-alocacao do slot. `terrania_arena_free` libera memoria nativa ao encerrar o loop de sala; o wrapper Go usa um finalizer apenas como seguranca extra para salas isoladas em testes.

Ao compilar com `CGO_ENABLED=1` e `-tags rustarena` (Linux AMD64), cada `Room.Tick` sincroniza os mobs vivos do Go com um **espelho opcional** da arena Rust apos o processamento autoritativo. O Go ainda decide o resultado do combate, a fisica, a rede e o inventario. Se a arena falhar ou detectar entrada invalida, o espelho pode ser descartado sem alterar o jogo. O build comum nao cria arena nativa nem passa pela FFI.

**Importante:** esta etapa prepara ownership/lifecycle e armazenamento persistente, mas **nao transfere ainda o estado autoritativo da IA para Rust**; isso exige benchmark de ticks completos e testes de equivalencia do ciclo de vida antes de ativar. O limite de spawn Go continua 96 monstros. Para validar experimentalmente:

```bash
cargo build --manifest-path rust/spatial-kernel/Cargo.toml --locked --release
cd server-go
CGO_ENABLED=1 go test -race -tags rustarena ./...
CGO_ENABLED=1 go test -race -tags 'rustmonsters rustarena' ./...
```

As arenas pertencem a cada sala individualmente, nunca a um processo global nem a um segundo servidor. Sem deploy, sem merge.
