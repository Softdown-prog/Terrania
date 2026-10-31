# Índice — executáveis e laboratórios Go

- [terrania/main.go](terrania/main.go), [terrania/room_runtime.go](terrania/room_runtime.go): worker HTTP/WebSocket, ticks por sala e estado.
- [terrania/limits.go](terrania/limits.go), [terrania/live_probe.go](terrania/live_probe.go): limites de conexão e verificações.
- [gateway/main.go](gateway/main.go), [gateway/lobby.go](gateway/lobby.go): roteamento, admissão e distribuição de salas.
- [spatial-reference/main.go](spatial-reference/main.go): referência Go para verificar o kernel Rust.
- [parity/main.go](parity/main.go), [gameplay-parity/main.go](gameplay-parity/main.go): ferramentas de paridade.

**Cuidados:** `go run ./cmd/terrania` executa o pacote completo; não tente `go run main.go`. O gateway não substitui o worker e a contagem de sessões admitidas não prova carga suportada.

Os testes estão ao lado do código, por exemplo [terrania/room_runtime_test.go](terrania/room_runtime_test.go), [gateway/lobby_test.go](gateway/lobby_test.go). Leia também [../INDEX.md](../INDEX.md).
