# Índice — módulo espacial Rust (isolado)

- [Cargo.toml](Cargo.toml): pacote e lints.
- [src/lib.rs](src/lib.rs): funções espaciais, índices, segurança de buffers e ABI.
- [include/terrania_spatial.h](include/terrania_spatial.h): contrato C/FFI.
- [src/bin/spatial_check.rs](src/bin/spatial_check.rs): comparação determinística.
- [../../server-go/engine/spatial_default.go](../../server-go/engine/spatial_default.go): fallback Go puro.
- [../../server-go/engine/spatial_rust.go](../../server-go/engine/spatial_rust.go): adapter experimental Go→Rust.

Veja [README.md](README.md) para restrições e comandos. Da raiz: `cargo fmt --manifest-path rust/spatial-kernel/Cargo.toml --all --check`, `cargo clippy --manifest-path rust/spatial-kernel/Cargo.toml --locked --all-targets -- -D warnings`, `cargo test --manifest-path rust/spatial-kernel/Cargo.toml --locked --all-targets`.

O kernel **não** mantém conexões, salas ou estado autoritativo. Não ativar FFI como padrão sem benchmarks de integração e paridade.
