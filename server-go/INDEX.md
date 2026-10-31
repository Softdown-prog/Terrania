# Índice — servidor Go, gateway e salas

- [engine/room.go](engine/room.go), [engine/world.go](engine/world.go), [engine/slime.go](engine/slime.go): simulação autoritativa, cenário, monstros.
- [engine/spatial_default.go](engine/spatial_default.go): consultas espaciais padrão em Go.
- [engine/spatial_rust.go](engine/spatial_rust.go): ponte Rust **opcional**, build tag `rustspatial`, Linux AMD64/cgo.
- [cmd/terrania/main.go](cmd/terrania/main.go), [cmd/terrania/room_runtime.go](cmd/terrania/room_runtime.go): worker HTTP/WebSocket, runtime por sala.
- [cmd/gateway/main.go](cmd/gateway/main.go), [cmd/gateway/lobby.go](cmd/gateway/lobby.go): entrada, admissão e roteamento.
- [cluster/router.go](cluster/router.go): afinidade de worker por sala.
- [presence/presence.go](presence/presence.go): agregação de presenças reais.
- [cmd/spatial-reference/main.go](cmd/spatial-reference/main.go): referência de paridade espacial.

Documentação detalhada: [README.md](README.md), [escala para mil jogadores](../docs/GO_SCALE_1000.md), [Rust](../rust/spatial-kernel/INDEX.md).

Testes: `cd server-go && go test -race -count=1 ./... && go vet ./...`. Capacidade de admitir sessões não prova desempenho da simulação. Produção mantém Go puro.
