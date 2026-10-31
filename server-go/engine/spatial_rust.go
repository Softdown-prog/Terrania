//go:build rustspatial && cgo && linux && amd64

package engine

/*
#cgo CFLAGS: -I${SRCDIR}/../../rust/spatial-kernel/include
#cgo LDFLAGS: -L${SRCDIR}/../../rust/spatial-kernel/target/release -lterrania_spatial -ldl -lm -lpthread
#include "terrania_spatial.h"
*/
import "C"

import (
	"math"
	"unsafe"
)

// Compiled ONLY with -tags rustspatial, CGO_ENABLED=1, linux/amd64.
// Default production builds remain pure Go (no C compiler, Rust or FFI).
// Batch calls pass pointer-free buffers; Rust retains no Go memory.
func visibleIndices(points []C.TerraniaPoint, cx, cy float64) []int {
	if len(points) == 0 {
		return nil
	}
	out := make([]C.uint32_t, len(points))
	n := int(C.terrania_spatial_visible(
		(*C.TerraniaPoint)(unsafe.Pointer(&points[0])),
		C.uint32_t(len(points)), C.double(cx), C.double(cy), C.double(920),
		(*C.uint32_t)(unsafe.Pointer(&out[0])), C.uint32_t(len(out)),
	))
	if n < 0 || n > len(points) {
		indices := make([]int, 0, len(points))
		for i, p := range points {
			if math.Abs(float64(p.x)-cx) < 920 && math.Abs(float64(p.y)-cy) < 920 {
				indices = append(indices, i)
			}
		}
		return indices
	}
	indices := make([]int, n)
	for i := range indices {
		indices[i] = int(out[i])
	}
	return indices
}

func visitVisibleGuests(guests []*Guest, cx, cy float64, visit func(*Guest)) {
	points := make([]C.TerraniaPoint, len(guests))
	for i, g := range guests {
		points[i] = C.TerraniaPoint{x: C.double(g.Actor.X), y: C.double(g.Actor.Y)}
	}
	for _, i := range visibleIndices(points, cx, cy) {
		visit(guests[i])
	}
}

func visitVisibleMobs(mobs []*Slime, cx, cy float64, visit func(*Slime)) {
	points := make([]C.TerraniaPoint, len(mobs))
	for i, mob := range mobs {
		points[i] = C.TerraniaPoint{x: C.double(mob.X), y: C.double(mob.Y)}
	}
	for _, i := range visibleIndices(points, cx, cy) {
		visit(mobs[i])
	}
}

func closestGuest(guests []*Guest, x, y float64) *Guest {
	if len(guests) == 0 {
		return nil
	}
	points := make([]C.TerraniaPoint, len(guests))
	for i, g := range guests {
		points[i] = C.TerraniaPoint{x: C.double(g.Actor.X), y: C.double(g.Actor.Y)}
	}
	index := int(C.terrania_spatial_nearest(
		(*C.TerraniaPoint)(unsafe.Pointer(&points[0])),
		C.uint32_t(len(points)), C.double(x), C.double(y), C.double(260),
	))
	if index == -1 {
		return nil
	}
	if index >= 0 && index < len(guests) {
		return guests[index]
	}
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
