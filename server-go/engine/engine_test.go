package engine

import (
	"encoding/json"
	"math"
	"testing"
	"time"
)

func TestProtocolCompatibility(t *testing.T) {
	if !ValidRoom("origins")||ValidRoom("../../hack")||ValidRoom("A") { t.Fatal("room validation") }
	valid:=[]byte(`{"type":"input","x":1,"y":0,"attack":false}`)
	if _,err:=ParseInput(valid);err!=nil { t.Fatal(err) }
	for _,raw:=range []string{
		`{"type":"input","x":3,"y":0,"attack":false}`,
		`{"type":"input","x":0,"y":0,"attack":"yes"}`,
		`{"type":"input","x":"NaN","y":0,"attack":false}`,
		`{"type":"input","x":0,"y":0,"attack":false,"hp":999}`,
		`{"type":"input","x":0,"y":0}`,
	} {
		if _,err:=ParseInput([]byte(raw));err==nil { t.Errorf("accepted invalid: %s",raw) }
	}
	w:=NewWelcome("one","origins",842136)
	data,err:=json.Marshal(w)
	if err!=nil||w.Version!=3 { t.Fatalf("welcome: %s %v",data,err) }
	var decoded map[string]any
	if err:=json.Unmarshal(data,&decoded);err!=nil { t.Fatal(err) }
	if decoded["type"]!="welcome"||decoded["room"]!="origins"||decoded["version"]!=float64(3) { t.Fatal(decoded) }
}

func TestWorldAndMovement(t *testing.T) {
	w:=World{Seed:842136}
	if !w.CanMove(16,16)||w.CanMove(math.NaN(),16)||w.CanMove(1e12,0) { t.Fatal("world collision") }
	if !villageBlocks(352,-72,7)||!landmarkBlocks(-176-26,-96,7) { t.Fatal("fixed landmarks") }
	p:=NewPlayer()
	p.Update(.05,Direction{X:1,Y:0},w)
	if !(p.X>16)||p.HP!=100 { t.Fatalf("player did not move: %+v",p) }
	for _,tile:=range []struct{tx,ty int}{{0,0},{-23,-15},{32,7},{12,-8}} {
		tile1:=w.Tile(tile.tx,tile.ty);tile2:=w.Tile(tile.tx,tile.ty)
		if tile1!=tile2 { t.Fatal("nondeterministic terrain") }
	}
}

func TestRoomIsIndependentOfFrontend(t *testing.T) {
	room:=NewRoom("origins")
	if room.Seed!=842136 { t.Fatal("wrong seed") }
	g:=room.Add("hero-1","Aventureiro 1")
	now:=time.Now()
	room.ReceiveInput(g.ID,Input{Type:"input",X:1,Attack:false},now)
	room.Tick(.05,now)
	if g.Actor.X<=16||g.Actor.HP!=100 { t.Fatal("authoritative movement broken") }
	state:=room.SnapshotFor(g.ID)
	if state==nil||state.Type!="state"||len(state.Players)!=1||state.Players[0].ID!=g.ID {
		t.Fatalf("wrong snapshot: %+v",state)
	}
	if room.SnapshotFor("unknown")!=nil { t.Fatal("leaked state") }
	for i:=0;i<45;i++ { room.Tick(.05,now.Add(time.Duration(i+1)*50*time.Millisecond)) }
	if room.MobCount()>MaxMobs { t.Fatalf("mob capacity exceeded: %d",room.MobCount()) }
	room.Remove(g.ID)
	if len(room.Guests)!=0 { t.Fatal("room not cleaned") }
}

func TestAttackAndDamage(t *testing.T) {
	w:=World{Seed:842136}
	p:=NewPlayer()
	p.FaceX,p.FaceY=1,0
	front:=Target{X:p.X+12,Y:p.Y}
	back:=Target{X:p.X-12,Y:p.Y}
	if !CanStrike(p,front,w)||CanStrike(p,back,w) { t.Fatal("attack cone invalid") }
	if !p.StartAttack()||p.StartAttack()||p.ConsumeStrike() { t.Fatal("attack windup broken") }
	p.Update(.08,Direction{},w)
	if !p.ConsumeStrike()||p.ConsumeStrike() { t.Fatal("strike not single-use") }
	if !p.TakeDamage(9,0,0)||p.HP!=91||p.TakeDamage(9,0,0) { t.Fatal("invulnerability broken") }
}
