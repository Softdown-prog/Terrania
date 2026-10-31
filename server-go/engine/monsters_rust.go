//go:build rustmonsters && cgo && linux && amd64

package engine

/*
#cgo CFLAGS: -I${SRCDIR}/../../rust/spatial-kernel/include
#cgo LDFLAGS: -L${SRCDIR}/../../rust/spatial-kernel/target/release -l:libterrania_spatial.a -ldl -lm -lpthread
#include "terrania_spatial.h"
*/
import "C"

import "math"

// Experimental Rust batch upper bound, matching the bounded entity arena.
// This is NOT a live spawn limit or an assertion of production throughput.
const maxRustMonsterBatch = 200_000

// Room-local scratch keeps pointer-free C buffers across ticks, avoiding the
// five per-tick allocations of the original adapter. Never use it concurrently.
type monsterScratch struct {
    players []C.TerraniaMonsterPlayer
    input   []C.TerraniaMonsterInput
    output  []C.TerraniaMonsterPlan
}

func (s *monsterScratch) ensure(playerCount, monsterCount int) {
    if cap(s.players) < playerCount {
        s.players = make([]C.TerraniaMonsterPlayer, playerCount)
    } else {
        s.players = s.players[:playerCount]
    }
    if cap(s.input) < monsterCount {
        s.input = make([]C.TerraniaMonsterInput, monsterCount)
    } else {
        s.input = s.input[:monsterCount]
    }
    if cap(s.output) < monsterCount {
        s.output = make([]C.TerraniaMonsterPlan, monsterCount)
    } else {
        s.output = s.output[:monsterCount]
    }
}

// Retained for standalone parity tests. Production calls with a per-room
// scratch so there is no allocation once a room reaches steady capacity.
func tryRustMonsterStep(guests []*Guest, mobs []*Slime, dt float64, world World) bool {
    var scratch monsterScratch
    return tryRustMonsterStepWithScratch(guests, mobs, dt, world, &scratch)
}

// One FFI invocation per tick per room. Go still controls collision, damage,
// despawn, identity, and the online clock. All Go inputs and outputs are
// pointer-free C-layout records; Rust stores no pointers between calls.
func tryRustMonsterStepWithScratch(guests []*Guest, mobs []*Slime, dt float64, world World, scratch *monsterScratch) bool {
    if len(mobs) == 0 || len(guests) == 0 {
        return true // No target means the original Go behavior is a no-op.
    }
    if scratch == nil || len(mobs) > maxRustMonsterBatch ||
        len(guests) > maxRustMonsterBatch || dt <= 0 || dt > 0.05 ||
        math.IsNaN(dt) || math.IsInf(dt, 0) {
        return false
    }

    scratch.ensure(len(guests), len(mobs))
    for i, g := range guests {
        if g == nil || g.Actor == nil {
            return false
        }
        a := g.Actor
        if math.IsNaN(a.X) || math.IsInf(a.X, 0) || math.IsNaN(a.Y) || math.IsInf(a.Y, 0) {
            return false
        }
        village := C.uint32_t(0)
        if villageGround(int(math.Floor(a.X/TileSize)), int(math.Floor(a.Y/TileSize))) != "" {
            village = 1
        }
        scratch.players[i] = C.TerraniaMonsterPlayer{
            x: C.double(a.X), y: C.double(a.Y), in_village: village,
        }
    }

    for i, mob := range mobs {
        if mob == nil {
            return false
        }
        // Rust chooses targets using original X/Y, then chase movement starts
        // after knockback. Predict collision only for mobs with actual impulse.
        x, y := mob.X, mob.Y
        if mob.knockX != 0 || mob.knockY != 0 {
            MoveBody(&x, &y, mob.knockX*dt, mob.knockY*dt, world)
        }
        scratch.input[i] = C.TerraniaMonsterInput{
            x: C.double(mob.X), y: C.double(mob.Y),
            after_x: C.double(x), after_y: C.double(y),
            pulse: C.double(mob.pulse), hurt_time: C.double(mob.HurtTime),
            cooldown: C.double(mob.ContactCooldown),
            knock_x: C.double(mob.knockX), knock_y: C.double(mob.knockY),
        }
    }

    n := int(C.terrania_monsters_plan(
        &scratch.input[0], C.uint32_t(len(mobs)),
        &scratch.players[0], C.uint32_t(len(guests)),
        C.double(dt),
        &scratch.output[0], C.uint32_t(len(mobs)),
    ))
    if n != len(mobs) {
        return false
    }

    // Validate every record before mutating any gameplay state, preserving
    // atomic fallback even with thousands of entities.
    for _, p := range scratch.output {
        target := int(p.target_index)
        if target < -1 || target >= len(guests) || (p.attack != 0 && p.attack != 1) ||
            (target == -1 && p.attack != 0) {
            return false
        }
        for _, v := range [...]float64{
            float64(p.pulse), float64(p.hurt_time), float64(p.cooldown),
            float64(p.knock_x), float64(p.knock_y),
            float64(p.move_x), float64(p.move_y),
        } {
            if math.IsNaN(v) || math.IsInf(v, 0) {
                return false
            }
        }
    }

    for i, p := range scratch.output {
        target := int(p.target_index)
        if target == -1 {
            continue
        }
        mob := mobs[i]
        mob.X = float64(scratch.input[i].after_x)
        mob.Y = float64(scratch.input[i].after_y)
        mob.pulse = float64(p.pulse)
        mob.HurtTime = float64(p.hurt_time)
        mob.ContactCooldown = float64(p.cooldown)
        mob.knockX, mob.knockY = float64(p.knock_x), float64(p.knock_y)
        if p.move_x != 0 || p.move_y != 0 {
            MoveBody(&mob.X, &mob.Y, float64(p.move_x), float64(p.move_y), world)
        }
        if p.attack != 0 {
            guests[target].Actor.TakeDamage(9, mob.X, mob.Y)
        }
    }
    return true
}
