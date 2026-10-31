//go:build !rustarena || !cgo || !linux || !amd64

package engine

// Standard Go gameplay never links Rust or allocates a native arena.
type roomEntityArena struct{}

func (*roomEntityArena) syncRoom(_ *Room) bool { return true }
func (*roomEntityArena) close() {}
