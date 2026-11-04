package engine

// The authoritative Go catalog mirrors src/actors/MonsterSpecies.ts.
// SlimeKind is the implicit/default kind in legacy protocol v3 payloads.
type MonsterKind string

const (
	SlimeKind MonsterKind = "slime"
	WolfKind MonsterKind = "wolf"
	SpiderKind MonsterKind = "spider"
)

type MonsterDefinition struct {
	HP int
	Damage int
	Speed float64
	AggroRadius float64
	ContactRadius float64
	ContactCooldown float64
	XP int
	Drop string
	AI string
}

func monsterDefinition(kind MonsterKind) (MonsterDefinition, bool) {
	switch kind {
	case "", SlimeKind:
		return MonsterDefinition{HP: 2, Damage: 9, Speed: 38, AggroRadius: 230,
			ContactRadius: 24, ContactCooldown: 1.2, XP: 10, Drop: "gel", AI: "hop"}, true
	case WolfKind:
		return MonsterDefinition{HP: 3, Damage: 12, Speed: 66, AggroRadius: 290,
			ContactRadius: 27, ContactCooldown: 1.1, XP: 20, Drop: "fang", AI: "rush"}, true
	case SpiderKind:
		return MonsterDefinition{HP: 2, Damage: 6, Speed: 50, AggroRadius: 250,
			ContactRadius: 23, ContactCooldown: 0.85, XP: 15, Drop: "silk", AI: "stalk"}, true
	default:
		return MonsterDefinition{}, false
	}
}

func validMonsterKind(kind MonsterKind) bool {
	_, ok := monsterDefinition(kind)
	return ok
}

func normalizedMonsterKind(kind MonsterKind) MonsterKind {
	if kind == "" { return SlimeKind }
	return kind
}
