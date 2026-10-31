# Índice — motor autoritativo Go

- [room.go](room.go), [player.go](player.go), [slime.go](slime.go): sala, movimento e criaturas.
- [world.go](world.go): terreno, geração e colisão.
- [protocol.go](protocol.go): estruturas e interpretação do protocolo online.
- [spatial_default.go](spatial_default.go): área de interesse e alvo mais próximo **em Go puro**.
- [spatial_rust.go](spatial_rust.go): implementação alternativa sob build tag `rustspatial` (experimental).
- [engine_test.go](engine_test.go), [room_order_test.go](room_order_test.go), [spatial_bridge_test.go](spatial_bridge_test.go): paridade e invariantes.
- [benchmark_test.go](benchmark_test.go): benchmarks do motor espacial.

**Fronteiras:** Go é autoritativo; Angular e Phaser não entram neste pacote. Rust retorna índices, não identidades nem decisões de gameplay; mantenha o fallback padrão. Ao mudar colisões/protocolo, confira [../../src/shared/protocol.ts](../../src/shared/protocol.ts), [../../server/src/Room.ts](../../server/src/Room.ts) e os testes de comparação.

Valide: `cd server-go && go test -race -count=1 ./...`. Consulte [../README.md](../README.md) e [../../rust/spatial-kernel/INDEX.md](../../rust/spatial-kernel/INDEX.md).
