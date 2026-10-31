package engine

import "math"

// Reimplementacao independente do mundo TS: sem imports do frontend.
const TileSize = 32
const ChunkTiles = 16
const ChunkPixels = TileSize * ChunkTiles

type Tile struct {
	Ground string
	Tree   bool
	Rock   bool
}

type World struct { Seed uint32 }

func Hash2(x, y int, seed uint32) float64 {
	h := uint32(int32(x))*0x1f123bb5 ^ uint32(int32(y))*0x5f356495 ^ seed
	h = (h ^ (h >> 16)) * 0x045d9f3b
	h = (h ^ (h >> 16)) * 0x045d9f3b
	return float64(h^(h>>16)) / 4294967296.0
}

func fade(t float64) float64 { return t * t * (3 - 2*t) }

func ValueNoise(x, y float64, seed uint32) float64 {
	ix, iy := int(math.Floor(x)), int(math.Floor(y))
	fx, fy := fade(x-float64(ix)), fade(y-float64(iy))
	a, b := Hash2(ix, iy, seed), Hash2(ix+1, iy, seed)
	c, d := Hash2(ix, iy+1, seed), Hash2(ix+1, iy+1, seed)
	return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy
}

// O protocolo usa IDs de sala ASCII; a seed usa o mesmo FNV-1a em code units.
func SeedFromRoom(value string) uint32 {
	var h uint32 = 2166136261
	for _, r := range value {
		// validRoom restringe o nome a ASCII, preservando o FNV do JS.
		h = (h ^ uint32(r)) * 16777619
	}
	return h
}

func villageGround(tx, ty int) string {
	if tx < 6 || tx > 21 || ty < -7 || ty > 9 { return "" }
	if absInt(ty) <= 1 || (tx >= 13 && tx <= 14 && ty >= -4 && ty <= 6) { return "path" }
	return "grass"
}

func absInt(v int) int { if v < 0 { return -v }; return v }

func (w World) Tile(tx, ty int) Tile {
	detail := Hash2(tx, ty, w.Seed+31)
	if v := villageGround(tx,ty); v != "" { return Tile{Ground:v} }
	forest := ValueNoise(float64(tx)/15+13.7,float64(ty)/15,w.Seed+9)
	terrain := ValueNoise(float64(tx)/32,float64(ty)/32,w.Seed+71)
	river := math.Sin(float64(tx)*0.04+float64(w.Seed)*0.0001)*7+15
	center := math.Hypot(float64(tx),float64(ty)) < 7
	ground := "grass"
	if !center && (math.Abs(float64(ty)-river)<2.1 || terrain<0.275) { ground = "water"
	} else if !center && (math.Abs(float64(ty)-river)<3.25 || terrain<0.322) { ground = "sand"
	} else if math.Abs(float64(ty)-math.Sin(float64(tx)*0.055)*1.35)<0.54 { ground = "path"
	} else if !center && forest>0.52 { ground = "forest" }
	return Tile{Ground:ground, Tree:ground=="forest"&&detail>0.80,
		Rock:ground!="water"&&ground!="path"&&!center&&detail<0.022}
}

func (w World) Walkable(tx,ty int) bool {
	t:=w.Tile(tx,ty)
	return t.Ground!="water"&&!t.Tree&&!t.Rock
}

var buildings = [][2]float64{{352,-72},{544,-72},{448,176}}
var landmarks = []struct{kind string; x,y float64}{
	{"arch",-176,-96},{"sign",128,-16},{"fire",176,-112},
	{"sign",240,64},{"sign",448,48},
}

func villageBlocks(x,y,r float64) bool {
	for _, b := range buildings {
		if math.Abs(x-b[0])<46+r && y>b[1]-58-r && y<b[1]+8+r { return true }
	}
	return false
}

func landmarkBlocks(x,y,r float64) bool {
	for _, p:=range landmarks {
		if p.kind=="arch" {
			for _, off:=range []float64{-26,26} {
				if math.Abs(x-p.x-off)<9+r && math.Abs(y-p.y)<8+r { return true }
			}
			continue
		}
		threshold:=r+4
		if p.kind=="fire" { threshold=r+10 }
		if math.Hypot(x-p.x,y-p.y)<threshold { return true }
	}
	return false
}

// CanMove aplica a mesma caixa de colisao com raio 7 da simulacao TS.
func (w World) CanMove(x,y float64) bool {
	if math.IsNaN(x)||math.IsInf(x,0)||math.IsNaN(y)||math.IsInf(y,0)||
		math.Abs(x)>1_000_000||math.Abs(y)>1_000_000 { return false }
	const radius=7.
	if landmarkBlocks(x,y,radius)||villageBlocks(x,y,radius) { return false }
	for _,ox:=range []float64{-radius,radius} {
		for _,oy:=range []float64{-radius,radius} {
			if !w.Walkable(int(math.Floor((x+ox)/TileSize)),int(math.Floor((y+oy)/TileSize))) { return false }
		}
	}
	return true
}

func (w World) SpeedAt(x,y float64) float64 {
	t:=w.Tile(int(math.Floor(x/TileSize)),int(math.Floor(y/TileSize)))
	switch t.Ground {
	case "sand": return .82
	case "forest": return .94
	}
	return 1
}

func ChunkOf(x float64) int { return int(math.Floor(x/ChunkPixels)) }

// Movement with swept collision: same 4px limit and per-axis slide as TS.
func MoveBody(x,y *float64,dx,dy float64,w World) {
	steps:=int(math.Max(1,math.Ceil(math.Max(math.Abs(dx),math.Abs(dy))/4)))
	for i:=0;i<steps;i++ {
		if w.CanMove(*x+dx/float64(steps),*y) { *x+=dx/float64(steps) }
		if w.CanMove(*x,*y+dy/float64(steps)) { *y+=dy/float64(steps) }
	}
}
