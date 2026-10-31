//go:build !rustmonsters

package engine

// The production and staging builds always remain pure Go.
func tryRustMonsterStep(_ []*Guest, _ []*Slime, _ float64, _ World) bool {
    return false
}
