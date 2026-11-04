package engine

import (
	"fmt"
	"math"
)

// SpawnMonsters keeps every legacy slime spawn untouched, then adds at most
// one distant wolf/spider per chunk using the same hashes as the solo engine.
// No random clock, player input, or client-supplied creature stats.
func SpawnMonsters(cx, cy int, w World) []*Slime {
	result := SpawnSlimes(cx, cy, w)
	if math.Hypot(float64(cx), float64(cy)) < 4 ||
		Hash2(cx, cy, w.Seed+809) >= .55 {
		return result
	}
	kind := SpiderKind
	if Hash2(cx, cy, w.Seed+811) < .5 { kind = WolfKind }
	tx := cx*ChunkTiles + int(math.Floor(Hash2(cx+23, cy, w.Seed+901)*ChunkTiles))
	ty := cy*ChunkTiles + int(math.Floor(Hash2(cx, cy-19, w.Seed+907)*ChunkTiles))
	if villageGround(tx, ty) != "" || !w.Walkable(tx, ty) { return result }
	id := fmt.Sprintf("%s:%d,%d", kind, cx, cy)
	result = append(result, NewMonster(kind, id,
		(float64(tx)+.5)*TileSize, (float64(ty)+.5)*TileSize))
	return result
}
