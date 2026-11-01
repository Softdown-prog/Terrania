package engine

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
        if near != nil {
            mob.Update(dt, near.Actor, world)
        }
    }
}
