// Independent Go reference for the optional Rust spatial kernel.
// Does not modify the authoritative game server or enable Rust at runtime.
package main

import (
	"fmt"
	"math"
	"os"
	"time"
)

type point struct{ x, y float64 }

func next(state *uint32) uint32 {
	*state ^= *state << 13
	*state ^= *state >> 17
	*state ^= *state << 5
	return *state
}
func digestU32(hash *uint64, value uint32) {
	for i := 0; i < 4; i++ {
		*hash ^= uint64(byte(value >> (i * 8)))
		*hash *= 1099511628211
	}
}
func fixture(points []point) (int, int, uint64) {
	hits, found := 0, 0
	digest := uint64(14695981039346656037)
	for q := 0; q < 200; q++ {
		x := float64((q*37)%401 - 200)
		y := float64((q*53)%401 - 200)
		half := float64(64 + (q%5)*24)
		for i, p := range points {
			if !math.IsNaN(p.x) && !math.IsInf(p.x, 0) &&
				!math.IsNaN(p.y) && !math.IsInf(p.y, 0) &&
				math.Abs(p.x-x) < half && math.Abs(p.y-y) < half {
				hits++
				digestU32(&digest, uint32(i))
			}
		}
		best := 160.0 * 160.0
		nearest := uint32(math.MaxUint32)
		for i, p := range points {
			if !math.IsNaN(p.x) && !math.IsInf(p.x, 0) &&
				!math.IsNaN(p.y) && !math.IsInf(p.y, 0) {
				dx, dy := p.x-x, p.y-y
				d2 := dx*dx + dy*dy
				if d2 < best {
					best, nearest = d2, uint32(i)
				}
			}
		}
		if nearest != math.MaxUint32 { found++ }
		digestU32(&digest, nearest)
	}
	return hits, found, digest
}
func main() {
	seed := uint32(0x12345678)
	points := make([]point, 0, 4096)
	for i := 0; i < 4096; i++ {
		x := float64(int(next(&seed)%4096)-2048) * 0.5
		y := float64(int(next(&seed)%4096)-2048) * 0.5
		points = append(points, point{x, y})
	}
	hits, found, hash := fixture(points)
	fmt.Printf("requests=200 points=4096 hits=%d nearest=%d digest=%016x\n", hits, found, hash)
	if len(os.Args) > 1 && os.Args[1] == "--bench" {
		start := time.Now()
		var check uint64
		for i := 0; i < 25; i++ { _, _, h := fixture(points); check ^= h }
		fmt.Fprintf(os.Stderr, "go_spatial_5000_queries_ns=%d check=%d\n", time.Since(start).Nanoseconds(), check)
	}
}
