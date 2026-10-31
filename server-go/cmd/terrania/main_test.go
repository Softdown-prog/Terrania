package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestHealthAndOrigin(t *testing.T) {
	game:=newGameServer([]string{"https://rpg.analysepro.com"},"")
	server:=httptest.NewServer(game.handler())
	defer server.Close()
	res,err:=http.Get(server.URL+"/health")
	if err!=nil { t.Fatal(err) }
	defer res.Body.Close()
	if res.StatusCode!=200 { t.Fatalf("health: %d",res.StatusCode) }
	var health map[string]any
	if err:=json.NewDecoder(res.Body).Decode(&health);err!=nil { t.Fatal(err) }
	if health["status"]!="ok"||health["engine"]!="go" { t.Fatalf("%v",health) }
	wsURL:="ws"+strings.TrimPrefix(server.URL,"http")+"/ws"
	_,resp,err:=websocket.DefaultDialer.Dial(wsURL,nil)
	if err==nil||resp==nil||resp.StatusCode!=http.StatusForbidden {
		t.Fatalf("origin without header must be rejected: %v %v",resp,err)
	}
	if resp!=nil { _=resp.Body.Close() }
	headers:=http.Header{"Origin":[]string{"https://rpg.analysepro.com"}}
	_,resp,err=websocket.DefaultDialer.Dial(wsURL+"?room=../../hack",headers)
	if err==nil||resp==nil||resp.StatusCode!=http.StatusTooManyRequests {
		t.Fatalf("invalid room must be rejected: %v %v",resp,err)
	}
	if resp!=nil { _=resp.Body.Close() }
}

func TestRealWebSocketV3(t *testing.T) {
	game:=newGameServer([]string{"http://localhost:5173"},"0123456789abcdef0123456789abcdef01234567")
	ctx,cancel:=context.WithCancel(context.Background())
	defer cancel()
	go game.run(ctx)
	server:=httptest.NewServer(game.handler())
	defer server.Close()
	wsURL:="ws"+strings.TrimPrefix(server.URL,"http")+"/ws?room=origins"
	headers:=http.Header{"Origin":[]string{"http://localhost:5173"}}
	ws,_,err:=websocket.DefaultDialer.Dial(wsURL,headers)
	if err!=nil { t.Fatal(err) }
	defer ws.Close()
	_ = ws.SetReadDeadline(time.Now().Add(2*time.Second))
	var welcome struct {
		Type string `json:"type"`
		Version int `json:"version"`
		Seed uint32 `json:"seed"`
		ID string `json:"id"`
	}
	if err:=ws.ReadJSON(&welcome);err!=nil { t.Fatal(err) }
	if welcome.Type!="welcome"||welcome.Version!=3||welcome.Seed!=842136||welcome.ID=="" {
		t.Fatalf("incompatible welcome: %+v",welcome)
	}
	if err:=ws.WriteJSON(map[string]any{"type":"input","x":1,"y":0,"attack":false});err!=nil { t.Fatal(err) }
	advanced:=false
	for i:=0;i<15;i++ {
		var state struct {
			Type string `json:"type"`
			Players []struct { X float64 `json:"x"`; ID string `json:"id"` } `json:"players"`
			Mobs []json.RawMessage `json:"mobs"`
		}
		if err:=ws.ReadJSON(&state);err!=nil { t.Fatal(err) }
		if state.Type!="state"||len(state.Players)==0 { t.Fatalf("bad state: %+v",state) }
		if state.Players[0].ID==welcome.ID&&state.Players[0].X>16 { advanced=true;break }
	}
	if !advanced { t.Fatal("server did not simulate player movement") }
}
