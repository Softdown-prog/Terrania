package engine

// Go remains authoritative for collision, damage, player state and room ownership.
// Rust (when explicitly enabled) calculates monster decisions in ONE batch per
// room tick, without creating a new network server or a separate gameplay clock.
func stepMonsters(guests []*Guest, mobs []*Slime, dt float64, world World) {
    if tryRustMonsterStep(guests, mobs, dt, world) {
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
