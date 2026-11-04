package engine

import "math"

// Go stays authoritative for rooms, players, combat, collisions and networking.
// The opt-in Rust planner only returns decisions for one batch of monsters.
// Scratch belongs to the calling room goroutine; no shared writable state.
func stepMonstersWithScratch(guests []*Guest, mobs []*Slime, dt float64, world World, scratch *monsterScratch) {
    if tryRustMonsterStepWithScratch(guests, mobs, dt, world, scratch) {
        return
    }
    runGoMonsterStep(guests, mobs, dt, world)
}

func runGoMonsterStep(guests []*Guest, mobs []*Slime, dt float64, world World) {
	for _, mob := range mobs {
		near := closestGuest(guests, mob.X, mob.Y)
		if mob.Species() != SlimeKind {
			// New species may acquire targets beyond the legacy 260-unit
			// radius; nearest guest wins, preserving insertion-order ties.
			spec, _ := monsterDefinition(mob.Kind)
			var closest float64 = 260
			if spec.AggroRadius > closest { closest = spec.AggroRadius }
			near = nil
			for _, g := range guests {
				dx, dy := g.Actor.X-mob.X, g.Actor.Y-mob.Y
				distance := math.Hypot(dx,dy)
				if distance < closest { near, closest = g, distance }
			}
		}
		if near != nil { mob.Update(dt, near.Actor, world) }
	}
}
