package engine

// Go is the sole authority for online experience. Clients send input only;
// XP cannot be provided by WebSocket, URL parameters or localStorage.
const MaxLevel = 50
const MaxExperience = 30 * MaxLevel * (MaxLevel - 1) / 2

func ExperienceForLevel(level int) int {
	if level < 1 || level > MaxLevel { return -1 }
	return 30 * level * (level - 1) / 2
}

func LevelForExperience(xp int) int {
	if xp < 0 { xp = 0 }
	if xp > MaxExperience { xp = MaxExperience }
	level := 1
	for level < MaxLevel && xp >= ExperienceForLevel(level+1) { level++ }
	return level
}

func MaxHPForExperience(xp int) int {
	return 100 + (LevelForExperience(xp)-1)*10
}

// GainExperience is called by the room tick only after an authoritative kill.
// It raises the player's HP and MaxHP by 10 on each earned level, capped.
func (g *Guest) GainExperience(amount int) {
	if g == nil || g.Actor == nil || amount <= 0 { return }
	before := LevelForExperience(g.Experience)
	next := g.Experience + amount
	if next < g.Experience || next > MaxExperience { next = MaxExperience }
	g.Experience = next
	after := LevelForExperience(g.Experience)
	g.Actor.MaxHP = MaxHPForExperience(g.Experience)
	if after > before {
		g.Actor.HP += (after-before)*10
		if g.Actor.HP > g.Actor.MaxHP { g.Actor.HP = g.Actor.MaxHP }
	}
}
