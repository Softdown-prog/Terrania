package engine

import (
	"fmt"
	"math"
)

type Slime struct {
	// Empty Kind is a legacy Slime, preserving v3 snapshots.
	Kind MonsterKind
	ID string
	X,Y float64
	HP int
	HurtTime float64
	ContactCooldown float64
	pulse float64
	knockX,knockY float64
}
func NewSlime(id string,x,y float64) *Slime { return &Slime{ID:id,X:x,Y:y,HP:2} }
func NewMonster(kind MonsterKind, id string, x, y float64) *Slime {
	definition, ok := monsterDefinition(kind)
	if !ok { return nil }
	if kind == SlimeKind { kind = "" }
	return &Slime{Kind:kind, ID:id, X:x, Y:y, HP:definition.HP}
}
func (s *Slime) Species() MonsterKind { return normalizedMonsterKind(s.Kind) }
func (s *Slime) Bounce() float64 { return math.Sin(s.pulse) }

func (s *Slime) Update(dt float64, p *Player, w World) {
	if dt <= 0 || math.IsNaN(dt) || math.IsInf(dt,0) { return }
	dt = math.Min(.1, dt)
	spec, ok := monsterDefinition(s.Kind)
	if !ok { return }
	s.pulse += dt*5
	s.HurtTime = math.Max(0,s.HurtTime-dt)
	MoveBody(&s.X,&s.Y,s.knockX*dt,s.knockY*dt,w)
	s.knockX *= math.Exp(-10*dt)
	s.knockY *= math.Exp(-10*dt)
	s.ContactCooldown = math.Max(0,s.ContactCooldown-dt)
	if villageGround(int(math.Floor(p.X/TileSize)),int(math.Floor(p.Y/TileSize))) != "" { return }
	dx,dy := p.X-s.X,p.Y-s.Y
	d := math.Hypot(dx,dy)
	if d < spec.AggroRadius && d > 16 && s.HurtTime <= 0 {
		multiplier := 1.0
		switch s.Species() {
		case SlimeKind:
			multiplier = .65+.35*math.Max(0,math.Sin(s.pulse))
		case WolfKind:
			if d < 120 { multiplier = 1.25 } else { multiplier = .9 }
		case SpiderKind:
			if d < 95 { multiplier = 1.15 } else { multiplier = .68 }
		}
		speed := spec.Speed*multiplier
		MoveBody(&s.X,&s.Y,(dx/d)*speed*dt,(dy/d)*speed*dt,w)
	}
	if d < spec.ContactRadius && s.ContactCooldown == 0 {
		p.TakeDamage(spec.Damage,s.X,s.Y)
		s.ContactCooldown = spec.ContactCooldown
	}
}

func (s *Slime) TakeHit(sourceX,sourceY float64) {
	s.HP--
	s.HurtTime=.22
	dx,dy:=s.X-sourceX,s.Y-sourceY
	d:=math.Hypot(dx,dy)
	if d==0 { d=1 }
	s.knockX,s.knockY=dx/d*170,dy/d*170
}

func SpawnSlimes(cx,cy int,w World) []*Slime {
	count:=2
	if Hash2(cx,cy,w.Seed+201)<.53 { count=1 }
	var result []*Slime
	for index:=0;index<count;index++ {
		tx:=cx*ChunkTiles+int(math.Floor(Hash2(cx*4+index,cy,w.Seed+77)*ChunkTiles))
		ty:=cy*ChunkTiles+int(math.Floor(Hash2(cx,cy*4+index,w.Seed+97)*ChunkTiles))
		if math.Hypot(float64(tx),float64(ty))<9||
			villageGround(tx,ty)!=""||!w.Walkable(tx,ty) { continue }
		result=append(result,NewSlime(fmt.Sprintf("%d,%d,%d",cx,cy,index),
			(float64(tx)+.5)*TileSize,(float64(ty)+.5)*TileSize))
	}
	return result
}
