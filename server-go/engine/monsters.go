package engine

// Go stays authoritative for rooms, players, combat, collisions and networking.
// The opt-in Rust planner only returns decisions for one batch of monsters.
func stepMonsters(guests []*Guest, mobs []*Slime, dt float64, world World) {
    var scratch monsterScratch
    stepMonstersWithScratch(guests, mobs, dt, world, &scratch)
}

// Scratch belongs to the calling room goroutine. A separate scratch is used by
// standalone tests; no shared writable state or hidden background worker.
func stepMonstersWithScratch(guests []*Guest, mobs []*Slime, dt float64, world World, scratch *monsterScratch) {
    if tryRustMonsterStepWithScratch(guests, mobs, dt, world, scratch) {
        return
    }
    runGoMonsterStep(guests, mobs, dt, world)
}

func runGoMonsterStep(guests []*Guest, mobs []*Slime, dt float64, world World) {
    for _, mob := range mobs {
        near := closestGuest(guests, mob.X, mob.Y)
        if near != nil {
            mob.Update(dt, near.Actor, world)
        }
    }
}
