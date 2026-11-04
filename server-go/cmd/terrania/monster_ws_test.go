package main

import (
	"context"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/engine"
	"github.com/gorilla/websocket"
)

// Two genuine WebSocket clients receive the same naturally spawned wolf and
// spider. Neither client supplies monster identities, HP or spawn positions.
func TestTwoPlayersSeeAuthoritativeNaturalMonsterKinds(t *testing.T) {
	game := newGameServer([]string{"http://localhost:5173"}, "")
	ctx,cancel := context.WithCancel(context.Background())
	defer cancel()
	go game.run(ctx)
	server := httptest.NewServer(game.handler())
	defer server.Close()
	url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?room=origins"
	headers := http.Header{"Origin": {"http://localhost:5173"}}
	type welcome struct {
		Type string `json:"type"`
		ID string `json:"id"`
		Version int `json:"version"`
	}
	connect := func() (*websocket.Conn,string) {
		t.Helper()
		ws,_,err:=websocket.DefaultDialer.Dial(url,headers)
		if err!=nil {t.Fatal(err)}
		_ = ws.SetReadDeadline(time.Now().Add(8*time.Second))
		var msg welcome
		if err:=ws.ReadJSON(&msg);err!=nil {t.Fatal(err)}
		if msg.Type!="welcome"||msg.ID==""||msg.Version!=3 {t.Fatalf("bad welcome: %+v",msg)}
		return ws,msg.ID
	}
	a,idA:=connect()
	defer func(){_ = a.Close()}()
	b,idB:=connect()
	defer func(){_ = b.Close()}()
	if idA==idB {t.Fatal("duplicate user identity")}

	// Pick two kinds in adjacent chunks, within both players' viewport.
	// Search only deterministic Go spawn output; no test-only mutator API.
	w:=engine.World{Seed:842136}
	var wolf,spider *engine.Slime
	var heroX,heroY float64
	found:=false
	for cy:=-9;cy<=9 && !found;cy++ {
		for cx:=-9;cx<=9 && !found;cx++ {
			for _,m:=range engine.SpawnMonsters(cx,cy,w) {
				if m.Species()!=engine.WolfKind {continue}
				for dy:=-1;dy<=1 && !found;dy++ {
					for dx:=-1;dx<=1 && !found;dx++ {
						for _,n:=range engine.SpawnMonsters(cx+dx,cy+dy,w) {
							if n.Species()!=engine.SpiderKind ||
								math.Abs(m.X-n.X)>600 || math.Abs(m.Y-n.Y)>600 {continue}
							// Do not place test players in an obstructed tile.
							if !w.CanMove(m.X-35,m.Y) {continue}
							// Both natural mob chunks must be in the player's 3x3 spawn area.
							playerCX,playerCY:=engine.ChunkOf(m.X-35),engine.ChunkOf(m.Y)
							spiderCX,spiderCY:=engine.ChunkOf(n.X),engine.ChunkOf(n.Y)
							if math.Abs(float64(playerCX-spiderCX))>1 || math.Abs(float64(playerCY-spiderCY))>1 {continue}
							wolf,spider=m,n
							heroX,heroY=m.X-35,m.Y
							found=true
							break
						}
					}
				}
			}
		}
	}
	if !found {t.Fatal("seed has no nearby wolf/spider pair")}
	game.mu.Lock()
	rs:=game.rooms["origins"]
	game.mu.Unlock()
	if rs==nil {t.Fatal("missing Go room")}
	rs.mu.Lock()
	for _,id:=range []string{idA,idB} {
		g:=rs.room.Guests[id]
		if g==nil {rs.mu.Unlock();t.Fatal("missing registered player")}
		g.Actor.X,g.Actor.Y=heroX,heroY
	}
	rs.mu.Unlock()

	type state struct {
		Type string `json:"type"`
		Players []struct {ID string `json:"id"`} `json:"players"`
		Mobs []struct {
			ID string `json:"id"`
			Kind engine.MonsterKind `json:"kind"`
		} `json:"mobs"`
	}
	check := func(ws *websocket.Conn) {
		t.Helper()
		for {
			var s state
			if err:=ws.ReadJSON(&s);err!=nil {t.Fatal(err)}
			if s.Type!="state" {continue}
			participants:=map[string]bool{}
			for _,p:=range s.Players {participants[p.ID]=true}
			foundWolf,foundSpider:=false,false
			for _,m:=range s.Mobs {
				if m.ID==wolf.ID && m.Kind==engine.WolfKind {foundWolf=true}
				if m.ID==spider.ID && m.Kind==engine.SpiderKind {foundSpider=true}
			}
			if participants[idA]&&participants[idB]&&foundWolf&&foundSpider {return}
		}
	}
	check(a)
	check(b)
}
