package engine

import (
	"encoding/json"
	"fmt"
	"math"
	"testing"
	"time"
)

func TestMonsterCatalogAndDeterministicSpawns(t *testing.T) {
	w := World{Seed: 842136}
	var found = map[MonsterKind]bool{}
	for cy := -12; cy <= 12; cy++ {
		for cx := -12; cx <= 12; cx++ {
			mobs := SpawnMonsters(cx, cy, w)
			again := SpawnMonsters(cx, cy, w)
			if len(mobs) != len(again) { t.Fatal("unstable monster count") }
			original := SpawnSlimes(cx, cy, w)
			if len(mobs) < len(original) { t.Fatal("lost legacy slime spawn") }
			if math.Hypot(float64(cx), float64(cy)) < 4 && len(mobs) != len(original) {
				t.Fatalf("new monster spawned inside tutorial chunks %d,%d",cx,cy)
			}
			for i, m := range mobs {
				n := again[i]
				if m.ID != n.ID || m.Kind != n.Kind || m.X != n.X || m.Y != n.Y {
					t.Fatalf("unstable seed at %d,%d: %+v %+v", cx,cy,m,n)
				}
				if i < len(original) && (m.ID != original[i].ID || m.X != original[i].X || m.Y != original[i].Y) {
					t.Fatalf("slime identity changed at %d,%d",cx,cy)
				}
				spec, ok := monsterDefinition(m.Kind)
				if !ok || m.HP != spec.HP || spec.XP <= 0 || !w.Walkable(int(math.Floor(m.X/TileSize)),int(math.Floor(m.Y/TileSize))) {
					t.Fatalf("invalid authoritative spawn: %+v",m)
				}
				if i >= len(original) && (m.Kind == "" || m.Kind == SlimeKind) {
					t.Fatal("new spawn has no species")
				}
				found[m.Species()] = true
			}
			if len(mobs) > len(original)+1 { t.Fatal("too many per chunk") }
		}
	}
	for _, kind := range []MonsterKind{SlimeKind,WolfKind,SpiderKind} {
		if !found[kind] { t.Fatalf("missing natural %s spawn",kind) }
	}
	if NewMonster("dragon","forged",0,0)!=nil { t.Fatal("unknown monster accepted") }
}

func TestMonsterDamageAndTwoPlayersServerAuthoritative(t *testing.T) {
	r := NewRoom("origins")
	defer r.Close()
	first := r.Add("first","Alice")
	second := r.Add("second","Bob")
	// Find a distant, fully walkable combat fixture without overriding collisions.
	x,y := 0.,0.
	valid := false
	for ty:=800.;ty<2100 && !valid;ty+=32 {
		for tx:=1000.;tx<2200;tx+=32 {
			if r.World.CanMove(tx,ty) && r.World.CanMove(tx-30,ty) &&
				r.World.CanMove(tx-45,ty) && r.World.CanMove(tx+35,ty) {
				x,y,valid=tx,ty,true
				break
			}
		}
	}
	if !valid { t.Fatal("no safe combat fixture") }
	first.Actor.X,first.Actor.Y=x,y
	first.Actor.FaceX,first.Actor.FaceY=1,0
	second.Actor.X,second.Actor.Y=x-30,y
	wolf:=NewMonster(WolfKind,"wolf:fixture",x+35,y)
	spider:=NewMonster(SpiderKind,"spider:fixture",x-45,y)
	if wolf==nil || spider==nil { t.Fatal("invalid catalog") }
	// Freeze chasing but retain legitimate hit, cooldown and armor logic.
	wolf.HurtTime=100
	spider.HurtTime=100
	r.mobs[wolf.ID]=wolf
	r.mobs[spider.ID]=spider
	r.mobOrder=append(r.mobOrder,wolf.ID,spider.ID)
	// Keep the test focused on the two explicitly placed monsters.
	r.spawnClock = -100
	for _, viewer := range []string{first.ID,second.ID} {
		s:=r.SnapshotFor(viewer)
		if s==nil || len(s.Players)!=2 || len(s.Mobs)!=2 { t.Fatalf("missing entities for %s",viewer) }
		if s.Mobs[0].Kind!=WolfKind || s.Mobs[1].Kind!=SpiderKind { t.Fatalf("missing typed mobs: %+v",s.Mobs) }
		payload,err:=json.Marshal(s)
		if err!=nil { t.Fatal(err) }
		var decoded struct { Mobs []struct {Kind MonsterKind `json:"kind"`} `json:"mobs"` }
		if err:=json.Unmarshal(payload,&decoded);err!=nil {t.Fatal(err)}
		if len(decoded.Mobs)!=2 || decoded.Mobs[0].Kind!=WolfKind {t.Fatal("WebSocket wire kind lost")}
	}
	now:=time.Unix(1_700_000_100,0)
	for frame:=0;frame<35;frame++ {
		if r.mobs[wolf.ID]!=nil {
			wolf.X,wolf.Y=x+35,y
			wolf.knockX,wolf.knockY=0,0
			wolf.HurtTime=100
		}
		if frame==0 || frame==10 || frame==20 {
			r.ReceiveInput(first.ID,Input{Type:"input",Attack:true},now.Add(time.Duration(frame)*50*time.Millisecond))
		}
		r.Tick(.05,now.Add(time.Duration(frame)*50*time.Millisecond))
	}
	if first.Kills!=1 || second.Kills!=0 {
		t.Fatalf("kill credit belongs to attacking player only: %d, %d",first.Kills,second.Kills)
	}
	if r.mobs[wolf.ID]!=nil || !r.defeated[wolf.ID] {t.Fatal("wolf not killed by authoritative attacks")}
	if second.Actor.HP>=100 {t.Fatal("spider did not attack nearest player")}
	if first.Actor.HP!=100 {t.Fatalf("damage leaked to other player: %d",first.Actor.HP)}
	for _,viewer:=range []string{first.ID,second.ID} {
		s:=r.SnapshotFor(viewer)
		for _,m:=range s.Mobs {
			if m.ID==wolf.ID {t.Fatal("defeated mob still visible")}
			if m.ID==spider.ID && m.Kind!=SpiderKind {t.Fatal("wrong remaining kind")}
		}
	}
	// There is no client message that can set type, HP, or kill count.
	for _,raw:=range []string{
		`{"type":"input","x":0,"y":0,"attack":true,"kind":"wolf"}`,
		`{"type":"input","x":0,"y":0,"attack":true,"hp":999}`,
	} {
		if _,err:=ParseInput([]byte(raw));err==nil {t.Fatalf("client forged state: %s",raw)}
	}
}

func TestGoMonsterDefinitions(t *testing.T) {
	expected:=map[MonsterKind]struct { hp,damage,xp int; material string }{
		SlimeKind:{2,9,10,"gel"},WolfKind:{3,12,20,"fang"},SpiderKind:{2,6,15,"silk"},
	}
	for kind,want:=range expected {
		d,ok:=monsterDefinition(kind)
		if !ok || d.HP!=want.hp || d.Damage!=want.damage || d.XP!=want.xp || d.Drop!=want.material {
			t.Fatalf("bad %s definition %+v",kind,d)
		}
	}
	if d,ok:=monsterDefinition("invalid");ok {t.Fatalf("unexpected monster %+v",d)}
	if normalizedMonsterKind("")!=SlimeKind {t.Fatal("legacy slime compatibility lost")}
	if got:=fmt.Sprint(NewSlime("x",0,0).Species());got!="slime" {t.Fatal("wrong legacy kind")}
}
