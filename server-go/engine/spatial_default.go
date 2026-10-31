//go:build !rustspatial

package engine

import "math"

// Go is always the default implementation: no C compiler, Rust runtime,
// FFI allocations or changes to the current production Docker image.
func visitVisibleGuests(guests []*Guest, cx, cy float64, visit func(*Guest)) {
	for _, g := range guests {
		a := g.Actor
		if math.Abs(a.X-cx) < 920 && math.Abs(a.Y-cy) < 920 {
			visit(g)
		}
	}
}

func visitVisibleMobs(mobs []*Slime, cx, cy float64, visit func(*Slime)) {
	for _, m := range mobs {
		if math.Abs(m.X-cx) < 920 && math.Abs(m.Y-cy) < 920 {
			visit(m)
		}
	}
}

func closestGuest(guests []*Guest, x, y float64) *Guest {
	var near *Guest
	closest := 260.
	for _, g := range guests {
		d := math.Hypot(g.Actor.X-x, g.Actor.Y-y)
		if d < closest {
			closest, near = d, g
		}
	}
	return near
}
