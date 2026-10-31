# Terrânia — kernel Rust isolado (experimental)

Este módulo Rust é **opcional e isolado**. Não substitui o servidor multiplayer Go, não cria um serviço adicional na VPS, não usa WebSocket, não abre portas, não altera salas, inventário ou o banco de dados.

## Primeira responsabilidade: consultas espaciais

Arquivo: `rust/spatial-kernel/src/lib.rs`

- **Visibilidade:** filtrar, em ordem de inserção, os índices das entidades numa janela retangular (regra estrita `abs(dx) < limite && abs(dy) < limite`), como em `Room.SnapshotFor`.
- **Alvo mais próximo:** selecionar o índice do objeto de menor distância ao ponto, com alcance estrito e empate resolvido pelo primeiro na lista, como na escolha de alvos dos slimes.
- **Segurança:** rejeitar entradas não finitas, parâmetros inválidos e buffers insuficientes; o filtro não escreve parcialmente se o buffer for pequeno.
- **Sem dependências externas:** `Cargo.toml` não exige crates de terceiros.
- **C ABI v1:** o cabeçalho `include/terrania_spatial.h` define duas funções exportadas. Sua chamada exige ponteiro de memória válido e uso coordenado de buffers; não há integração com Go/cgo na produção ainda.

O Rust calcula exclusivamente índices. A identidade das entidades, dados de jogadores, decisões de gameplay e autoridade continuam sob controle do Go.

## Por que ainda não ligar em produção?

Fazer uma chamada FFI por slime ou por jogador pode custar mais do que executar o loop em Go. Precisamos comparar custo de conversão de buffers, alocações, latência por tick e throughput **da integração real**, em lote, antes de habilitá-la.

Plano de ativação futura:

1. Comparar resultados Rust x Go com casos de limite, índices, empates, NaN e múltiplos cenários.
2. Benchmark separado da função Rust e da referência Go sob o **mesmo runner**. Os números são exploratórios e não incluem custo de FFI.
3. Criar um adapter Go opcional sob build tag `rustspatial` com uma implementação Go de fallback; não exigir Rust em builds padrão.
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
