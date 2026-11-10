package engine

import "math"

// Reimplementacao independente do mundo TS: sem imports do frontend.
const TileSize = 32
const ChunkTiles = 16
const ChunkPixels = TileSize * ChunkTiles

type Tile struct {
	Ground string
	Biome string
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
	if tx < 0 || tx > 38 || ty < -12 || ty > 18 { return "" }
	avenue := absInt(ty) <= 1 || (tx >= 13 && tx <= 14 && ty >= -10 && ty <= 15) ||
		(tx >= 27 && tx <= 28 && ty >= -10 && ty <= 15) ||
		(tx >= 21 && tx <= 22 && ty >= 9 && ty <= 16)
	cross := (ty >= -8 && ty <= -7 && tx >= 9 && tx <= 34) ||
		(ty >= 10 && ty <= 11 && tx >= 13)
	if avenue || cross { return "path" }
	return "grass"
}

// O corredor do tutorial é transitável, mas fica fora da proteção urbana.
func starterCaveTrail(tx, ty int) bool {
	return tx >= 39 && tx <= 46 && ty >= 10 && ty <= 12
}

// Mesmo contrato de src/world/southCity.ts, sem dependência do frontend.
const southCityY=15500
func southCitySafe(tx,ty int) bool {
	x,y:=tx,ty-southCityY
	return x>-28 && x<27 && y>-24 && y<23
}
func southCityGround(tx,ty int) string {
	x,y:=tx,ty-southCityY
	if x>=-28 && x<=27 && y>=-24 && y<=23 {
		road:=absInt(x)<=2 || absInt(y)<=2 ||
			(absInt(x)<=19 && (y==-10||y==11)) ||
			(absInt(y)<=16 && (x==-12||x==12)) ||
			(absInt(x)<=6 && absInt(y)<=6)
		if road {return "path"};return "sand"
	}
	if absInt(x)<=2 && y>=-66 && y<=55 {return "path"}
	if y>=26 && y<=27 && absInt(x)<=73 {return "path"}
	if x>=55 && x<=57 && y>=-6 && y<=27{return "path"}
	if x<=-55 && x>=-57 && y>=-6 && y<=27{return "path"}
	return ""
}
var southCityBuildings = [][2]float64{
	{(-17+.5)*32,(southCityY-12+.5)*32},
	{(-17+.5)*32,(southCityY+10+.5)*32},
	{(-6+.5)*32,(southCityY+12+.5)*32},
	{(16+.5)*32,(southCityY-12+.5)*32},
	{(22+.5)*32,(southCityY-5+.5)*32},
	{(15+.5)*32,(southCityY+8+.5)*32},
	{(8+.5)*32,(southCityY+16+.5)*32},
	{(-20+.5)*32,(southCityY+18+.5)*32},
	{(-23+.5)*32,(southCityY-2+.5)*32},
	{(-8+.5)*32,(southCityY-15+.5)*32},
	{(4+.5)*32,(southCityY-15+.5)*32},
	{(22+.5)*32,(southCityY+15+.5)*32},
}
func southCityWall(tx,ty int) bool {
	x,y:=tx,ty-southCityY
	if x<-28||x>27||y<-24||y>23{return false}
	if x==-28||x==27{return true}
	return (y==-24||y==23)&&absInt(x)>2
}
func southCityBlocks(x,y,r float64) bool {
	for _,dx:=range []float64{-r,r} {for _,dy:=range []float64{-r,r} {
		if southCityWall(int(math.Floor((x+dx)/32)),int(math.Floor((y+dy)/32))) {return true}
	}}
	if math.Hypot(x-16,y-(southCityY+.5)*32)<52+r{return true}
	for _,b:=range southCityBuildings {
		if math.Abs(x-b[0])<41+r && y>b[1]-57-r && y<b[1]+8+r{return true}
	}
	return false
}
func absInt(v int) int { if v < 0 { return -v }; return v }

func (w World) Tile(tx,ty int) Tile {
    detail:=Hash2(tx,ty,w.Seed+31)
    south:=southCityGround(tx,ty)
    if south!="" {
        biome:="ruins";if south=="path"{biome="trail"}
        return Tile{Ground:south,Biome:biome}
    }
    village:=villageGround(tx,ty)
    if village=="" && starterCaveTrail(tx,ty) { village="path" }
    if village!="" {
        biome:="meadow"
        if village=="path" { biome="trail" }
        return Tile{Ground:village,Biome:biome}
    }
    x,y:=float64(tx),float64(ty)
    p:=getTerrainProfile(x,y,w.Seed)
    biome:=classifyBiome(p)
    forest:=ValueNoise(x/15+13.7,y/15,w.Seed+9)
    terrain:=ValueNoise(x/32,y/32,w.Seed+71)
    center:=math.Hypot(x,y)<7
    river:=math.Sin(x*.04+float64(w.Seed)*.0001)*7+15
    starterArea:=math.Hypot(x,y)<64
    mainRoute:=!starterArea&&(math.Abs(x)<1.5||math.Abs(y)<1.5||
        math.Abs(y-math.Sin(x/1200)*7)<1.5||
        math.Abs(x-math.Sin(y/1200)*7)<1.5)
    villageTrail:=math.Abs(y-math.Sin(x*.055)*1.35)<.54
    ground:="grass"
    switch {
    case mainRoute||villageTrail:
        ground="path"
    case biome=="open-sea":
        if terrain>.62&&p.coast<.93 { ground="sand" } else { ground="water" }
    case p.coast>.42&&terrain+p.coast*.32>.82:
        ground="water"
    case p.coast>.27||biome=="beach"||biome=="island":
        ground="sand"
    case p.weights.north>.4&&p.temperature<.27:
        if !center&&terrain<.22 { ground="water"
        } else if p.humidity>.48||p.altitude>.45 { ground="sand" }
    case p.weights.south>.4||biome=="dunes"||biome=="ruins":
        if biome=="oasis"&&terrain>.67 { ground="grass" } else { ground="sand" }
    case p.weights.west>.39:
        if p.altitude>.48 { ground="sand" }
    case !center&&p.weights.center>.3&&(math.Abs(y-river)<2.1||terrain<.275):
        ground="water"
    case !center&&p.weights.center>.3&&(math.Abs(y-river)<3.25||terrain<.322):
        ground="sand"
    case !center&&forest>.52&&(starterArea||p.humidity>.39):
        ground="forest"
    }
    tree:=(ground=="forest"&&detail>.80)||(biome=="tundra"&&ground=="grass"&&detail>.987)
    rockChance:=.022
    if p.weights.west>.4 { rockChance=.09 }
    rock:=ground!="water"&&ground!="path"&&!center&&detail<rockChance
    if ground=="path" { biome="trail"
    } else if ground=="water"&&p.temperature<.28 { biome="frozen-lake"
    } else if ground!="water"&&biome=="open-sea" { biome="island" }
    return Tile{Ground:ground,Biome:biome,Tree:tree,Rock:rock}
}

func (w World) Walkable(tx,ty int) bool {
	t:=w.Tile(tx,ty)
	return t.Ground!="water"&&!t.Tree&&!t.Rock
}

var buildings = [][2]float64{
	{352,-72},{544,-72},{448,176},{800,-96},{1040,-96},{1056,304},{944,448},
}
var landmarks = []struct{kind string; x,y float64}{
	{"arch",-176,-96},{"sign",128,-16},{"fire",176,-112},
	{"sign",240,64},{"sign",448,48},
	{"sign",864,48},{"sign",1200,304},{"arch",1216,368},
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
	if landmarkBlocks(x,y,radius)||w.regionalLandmarkBlocks(x,y,radius)||villageBlocks(x,y,radius)||southCityBlocks(x,y,radius) { return false }
	for _,ox:=range []float64{-radius,radius} {
		for _,oy:=range []float64{-radius,radius} {
			if !w.Walkable(int(math.Floor((x+ox)/TileSize)),int(math.Floor((y+oy)/TileSize))) { return false }
		}
	}
	return true
}

func (w World) SpeedAt(x,y float64) float64 {
    t:=w.Tile(int(math.Floor(x/TileSize)),int(math.Floor(y/TileSize)))
    if t.Biome=="snowfield"||t.Biome=="stone-peak" { return .78 }
    if t.Biome=="dunes" { return .83 }
    if t.Ground=="sand" { return .82 }
    if t.Ground=="forest" { return .94 }
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
