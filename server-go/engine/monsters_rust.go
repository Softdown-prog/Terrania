//go:build rustmonsters && cgo && linux && amd64

package engine

/*
#cgo CFLAGS: -I${SRCDIR}/../../rust/spatial-kernel/include
#cgo LDFLAGS: -L${SRCDIR}/../../rust/spatial-kernel/target/release -l:libterrania_spatial.a -ldl -lm -lpthread
#include "terrania_spatial.h"
*/
import "C"

import (
    "math"
    "unsafe"
)

// Go owns and validates the buffers; Rust retains no pointers. One C call per
// room, not one C call per monster. Collision remains in Go.
func tryRustMonsterStep(guests []*Guest, mobs []*Slime, dt float64, world World) bool {
    if len(mobs) == 0 {
        return true
    }
    if len(mobs) > 1000000 || len(guests) > 1000000 {
        return false
    }
    points := make([]C.TerraniaMonsterPlayer, len(guests))
    for i, g := range guests {
        if g == nil || g.Actor == nil {
            return false
        }
        village := C.uint32_t(0)
        if villageGround(int(math.Floor(g.Actor.X/TileSize)), int(math.Floor(g.Actor.Y/TileSize))) != "" {
            village = 1
        }
        points[i] = C.TerraniaMonsterPlayer{x:C.double(g.Actor.X), y:C.double(g.Actor.Y), in_village:village}
    }
    input := make([]C.TerraniaMonsterInput, len(mobs))
    afterX := make([]float64, len(mobs))
    afterY := make([]float64, len(mobs))
    for i, s := range mobs {
        if s == nil {
            return false
        }
        // Predict the collision-resolved knockback without changing the mob:
        // Rust selects its target at the ORIGINAL position and plans chase at
        // the knockback-resolved position, preserving Go's movement order.
        x, y := s.X, s.Y
        MoveBody(&x, &y, s.knockX*dt, s.knockY*dt, world)
        afterX[i], afterY[i] = x, y
        input[i] = C.TerraniaMonsterInput{
            x:C.double(s.X), y:C.double(s.Y), after_x:C.double(x), after_y:C.double(y),
            pulse:C.double(s.pulse), hurt_time:C.double(s.HurtTime), cooldown:C.double(s.ContactCooldown),
            knock_x:C.double(s.knockX), knock_y:C.double(s.knockY),
        }
    }
    output := make([]C.TerraniaMonsterPlan, len(mobs))
    var playersPtr *C.TerraniaMonsterPlayer
    if len(points) != 0 {
        playersPtr = (*C.TerraniaMonsterPlayer)(unsafe.Pointer(&points[0]))
    }
    n := int(C.terrania_monsters_plan(
        (*C.TerraniaMonsterInput)(unsafe.Pointer(&input[0])), C.uint32_t(len(input)),
        playersPtr, C.uint32_t(len(points)), C.double(dt),
        (*C.TerraniaMonsterPlan)(unsafe.Pointer(&output[0])), C.uint32_t(len(output)),
    ))
    if n != len(mobs) {
        return false
    }
    // Validate ALL results before modifying any Go entity, so fallback is safe.
    for _, p := range output {
        i := int(p.target_index)
        if i < -1 || i >= len(guests) || (p.attack != 0 && p.attack != 1) ||
           math.IsNaN(float64(p.move_x)) || math.IsNaN(float64(p.move_y)) ||
           math.IsInf(float64(p.move_x),0) || math.IsInf(float64(p.move_y),0) {
            return false
        }
    }
    for i, p := range output {
        target := int(p.target_index)
        if target == -1 {
            continue // Monsters without a nearby player are not updated.
        }
        s := mobs[i]
        s.X, s.Y = afterX[i], afterY[i]
        s.pulse = float64(p.pulse)
        s.HurtTime = float64(p.hurt_time)
        s.ContactCooldown = float64(p.cooldown)
        s.knockX, s.knockY = float64(p.knock_x), float64(p.knock_y)
        MoveBody(&s.X, &s.Y, float64(p.move_x), float64(p.move_y), world)
        if p.attack != 0 {
            guests[target].Actor.TakeDamage(9, s.X, s.Y)
        }
    }
    return true
}
