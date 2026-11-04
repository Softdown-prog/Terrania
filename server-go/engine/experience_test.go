package engine

import (
	"encoding/json"
	"testing"
	"time"
)

func TestExperienceThresholdsAndLevelCap(t *testing.T) {
	cases := []struct { xp, level, hp int }{
		{0,1,100}, {10,1,100}, {29,1,100}, {30,2,110},
		{89,2,110}, {90,3,120}, {MaxExperience,50,590},
		{MaxExperience+50,50,590}, {-1,1,100},
	}
	for _, tc := range cases {
		if got := LevelForExperience(tc.xp); got != tc.level {
			t.Fatalf("xp=%d level=%d want=%d",tc.xp,got,tc.level)
		}
		if got := MaxHPForExperience(tc.xp); got != tc.hp {
			t.Fatalf("xp=%d hp=%d want=%d",tc.xp,got,tc.hp)
		}
	}
	if ExperienceForLevel(1)!=0 || ExperienceForLevel(2)!=30 ||
		ExperienceForLevel(3)!=90 || ExperienceForLevel(0)!=-1 ||
		ExperienceForLevel(51)!=-1 || ExperienceForLevel(50)!=MaxExperience {
		t.Fatal("experience threshold mismatch")
	}
	g:=&Guest{Actor:NewPlayer(),Experience:MaxExperience-5}
	g.Actor.MaxHP=MaxHPForExperience(g.Experience)
	g.Actor.HP=g.Actor.MaxHP
	g.GainExperience(999)
	if g.Experience!=MaxExperience || g.Actor.MaxHP!=590 || g.Actor.HP!=590 {
		t.Fatalf("level cap failed: %+v / %+v",g,g.Actor)
	}
	g.GainExperience(999)
	if g.Experience!=MaxExperience || g.Actor.HP!=590 {t.Fatal("cap repeated gain")}
	g.GainExperience(-2)
	if g.Experience!=MaxExperience {t.Fatal("negative XP accepted")}
}

func TestAuthoritativeKillXpTwoPlayersAndCheckpoint(t *testing.T) {
	r:=NewRoom("origins")
	defer r.Close()
	a,b:=r.Add("alpha","Alice"),r.Add("bravo","Bob")
	x,y:=0.,0.
	ok:=false
	for py:=800.;py<2200 && !ok;py+=32 {
		for px:=900.;px<2100;px+=32 {
			attacker:=NewPlayer()
			attacker.X,attacker.Y=px,py
			attacker.FaceX,attacker.FaceY=1,0
			if r.World.CanMove(px,py) && r.World.CanMove(px+35,py) &&
				r.World.CanMove(px-50,py) && CanStrike(attacker,Target{X:px+35,Y:py},r.World) {
				x,y,ok=px,py,true
				break
			}
		}
	}
	if !ok {t.Fatal("no walkable combat fixture")}
	a.Actor.X,a.Actor.Y=x,y
	a.Actor.FaceX,a.Actor.FaceY=1,0
	b.Actor.X,b.Actor.Y=x-50,y
	// Existing engine tests also exercise the two-player attack queue.
	r.spawnClock=-100
	now:=time.Unix(1_700_000_000,0)
	for _,fixture:=range []struct{ id string;kind MonsterKind;award int }{
		{"w","wolf",20},{"s","slime",10},{"sp","spider",15},
	} {
		m:=NewMonster(fixture.kind,fixture.id,x+35,y)
		m.HP=1
		m.HurtTime=100
		r.mobs[m.ID]=m
		r.mobOrder=append(r.mobOrder,m.ID)
		a.Actor.AttackCooldownTimer=0
		for tick:=0;tick<3;tick++ {
			r.ReceiveInput(a.ID,Input{Type:"input",Attack:tick==0},now)
			r.Tick(.05,now)
			now=now.Add(50*time.Millisecond)
		}
		if r.mobs[m.ID]!=nil || !r.defeated[m.ID] {
			t.Fatalf("%s was not killed on server",fixture.id)
		}
	}
	if a.Kills!=3 || a.SlimeKills!=1 || a.Experience!=45 {
		t.Fatalf("wrong credit for attacker: %+v",a)
	}
	if b.Kills!=0 || b.SlimeKills!=0 || b.Experience!=0 {
		t.Fatalf("spectator got unauthorized XP: %+v",b)
	}
	if a.Actor.MaxHP!=110 || a.Actor.HP!=110 || b.Actor.MaxHP!=100 {
		t.Fatalf("level health mismatch: %d/%d, spectator %d",
			a.Actor.HP,a.Actor.MaxHP,b.Actor.MaxHP)
	}
	for _,id:=range []string{a.ID,b.ID} {
		s:=r.SnapshotFor(id)
		if s==nil || len(s.Players)!=2 {t.Fatal("missing multiplayer snapshot")}
		for _,p:=range s.Players {
			if p.ID==a.ID && (p.Experience!=45 || p.Level!=2 || p.MaxHP!=110 ||
				p.SlimeKills!=1 || p.Kills!=3) {
				t.Fatalf("wrong authoritative progress: %+v",p)
			}
			if p.ID==b.ID && (p.Experience!=0 || p.Level!=1 || p.MaxHP!=100) {
				t.Fatalf("spectator snapshot wrong: %+v",p)
			}
		}
	}
	raw,err:=r.ExportState()
	if err!=nil {t.Fatal(err)}
	restored,err:=RestoreRoomState(raw)
	if err!=nil {t.Fatal(err)}
	defer restored.Close()
	other:=restored.Guests[a.ID]
	if other.Experience!=45 || other.SlimeKills!=1 || other.Actor.HP!=110 {
		t.Fatalf("checkpoint lost XP/quest progress: %+v",other)
	}
	other.Actor.HP=0
	restored.spawnClock=-100
	restored.Tick(.05,now)
	if other.Experience!=45 || other.Actor.MaxHP!=110 || other.Actor.HP!=110 {
		t.Fatalf("respawn lost experience: %+v",other)
	}
	// New anonymous WebSocket identity is NOT a returning account.
	fresh:=restored.Add("brand-new-session","New")
	if fresh.Experience!=0 || fresh.Actor.MaxHP!=100 {
		t.Fatal("reconnection impersonated a historical user")
	}
}

func TestExperienceCheckpointRejectsForgedStatsAndMigratesLegacySlimeKills(t *testing.T) {
	r:=NewRoom("origins")
	defer r.Close()
	g:=r.Add("hero","Hero")
	g.Kills=5
	data,err:=r.ExportState()
	if err!=nil {t.Fatal(err)}
	var state RoomState
	if err:=json.Unmarshal(data,&state);err!=nil {t.Fatal(err)}
	state.Players[0].SlimeKills=nil // old version-1 snapshots had only Kills.
	legacy,err:=json.Marshal(state)
	if err!=nil {t.Fatal(err)}
	migrated,err:=RestoreRoomState(legacy)
	if err!=nil {t.Fatal(err)}
	defer migrated.Close()
	if migrated.Guests["hero"].SlimeKills!=5 || migrated.Guests["hero"].Experience!=0 {
		t.Fatal("legacy Slime mission progress was lost")
	}
	tests:=[]struct {name string; alter func(*RoomState)}{
		{"negative XP",func(s *RoomState){s.Players[0].Experience=-1}},
		{"over cap XP",func(s *RoomState){s.Players[0].Experience=MaxExperience+1}},
		{"forged HP",func(s *RoomState){s.Players[0].Actor.MaxHP=590}},
		{"wrong XP maxHP",func(s *RoomState){s.Players[0].Experience=30}},
		{"negative slime kills",func(s *RoomState){n:=-1;s.Players[0].SlimeKills=&n}},
		{"slime kills over kills",func(s *RoomState){n:=6;s.Players[0].SlimeKills=&n}},
	}
	for _,tt:=range tests {
		t.Run(tt.name,func(t *testing.T){
			var state RoomState
			if err:=json.Unmarshal(data,&state);err!=nil {t.Fatal(err)}
			tt.alter(&state)
			bad,err:=json.Marshal(state)
			if err!=nil {t.Fatal(err)}
			result,err:=RestoreRoomState(bad)
			if result!=nil || err==nil {t.Fatal("forged progression accepted")}
		})
	}
	// Only movement/attack are valid messages; XP, Level and MaxHP never are.
	for _,field:=range []string{`"experience":5000`,`"level":50`,`"maxHp":590`,`"slimeKills":999`} {
		raw:=[]byte(`{"type":"input","x":0,"y":0,"attack":true,`+field+`}`)
		if _,err:=ParseInput(raw);err==nil {t.Fatalf("accepted forged field: %s",field)}
	}
}
