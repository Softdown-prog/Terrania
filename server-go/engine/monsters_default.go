//go:build !rustmonsters || !cgo || !linux || !amd64

package engine

// Pure-Go builds have no FFI buffers or Rust dependency.
type monsterScratch struct{}

func tryRustMonsterStepWithScratch(_ []*Guest, _ []*Slime, _ float64, _ World, _ *monsterScratch) bool {
    return false
}
