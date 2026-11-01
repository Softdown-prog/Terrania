package main

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
	"github.com/gorilla/websocket"
)

func TestGatewayDynamicRegistryPreservesLiveSessionsWhileScaling(t *testing.T) {
	serveWorker := func(label string) *httptest.Server {
		upgrader := websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}
		return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ws, err := upgrader.Upgrade(w, r, nil)
			if err != nil { return }
			defer func() { _ = ws.Close() }()
			if err := ws.WriteMessage(websocket.TextMessage, []byte(label+":"+r.URL.Query().Get("room"))); err != nil {
				return
			}
			for {
				if _,_,err:=ws.ReadMessage();err!=nil { return }
			}
		}))
	}
	a,b:=serveWorker("a"),serveWorker("b")
	defer a.Close()
	defer b.Close()

	registry,err:=cluster.NewWorkerRegistry(48,8)
	if err!=nil {t.Fatal(err)}
	register:=func(id,raw string) {
		t.Helper()
		u,err:=url.Parse(raw)
		if err!=nil {t.Fatal(err)}
		if err:=registry.Register(cluster.Backend{ID:id,URL:u});err!=nil {t.Fatal(err)}
		if err:=registry.SetReady(id,true);err!=nil {t.Fatal(err)}
	}
	register("a",a.URL)
	gw:=httptest.NewServer(gatewayHandlerWithRegistry(registry,
		map[string]bool{"http://localhost:5173":true},newLobby(1000,84,12)))
	defer gw.Close()

	connect:=func(room string) (*websocket.Conn,string,error) {
		wsURL:="ws"+strings.TrimPrefix(gw.URL,"http")+"/ws?room="+url.QueryEscape(room)
		ws,response,err:=websocket.DefaultDialer.Dial(wsURL,http.Header{"Origin":[]string{"http://localhost:5173"}})
		if err!=nil {
			if response!=nil { _=response.Body.Close() }
			return nil,"",err
		}
		_ = ws.SetReadDeadline(time.Now().Add(3*time.Second))
		_,data,err:=ws.ReadMessage()
		if err!=nil {_=ws.Close();return nil,"",err}
		return ws,string(data),nil
	}
	first,who,err:=connect("friends")
	if err!=nil||who!="a:friends" {t.Fatalf("first socket got %q %v",who,err)}
	defer first.Close()
	register("b",b.URL)
	second,who,err:=connect("friends")
	if err!=nil||who!="a:friends" {t.Fatalf("live room moved after scale-out: %q %v",who,err)}
	defer second.Close()
	third,who,err:=connect("other")
	if err!=nil||who!="b:other" {t.Fatalf("new room not assigned to new worker: %q %v",who,err)}
	defer third.Close()

	if err:=registry.Drain("a");err!=nil {t.Fatal(err)}
	if err:=registry.Remove("a");!errors.Is(err,cluster.ErrWorkerBusy) {
		t.Fatalf("removed worker while WebSockets active: %v",err)
	}
	if ws,_,err:=connect("friends");err==nil {
		_ = ws.Close()
		t.Fatal("accepted a new connection on draining worker")
	}
	fourth,who,err:=connect("another")
	if err!=nil||who!="b:another" {t.Fatalf("new session entered draining worker: %q %v",who,err)}
	defer fourth.Close()

	_ = first.Close()
	_ = second.Close()
	deadline:=time.Now().Add(5*time.Second)
	for time.Now().Before(deadline) {
		ready:=false
		for _,w:=range registry.Snapshot() {
			if w.ID=="a" && w.Clients==0 && w.Rooms==0 {ready=true}
		}
		if ready {break}
		time.Sleep(10*time.Millisecond)
	}
	if err:=registry.Remove("a");err!=nil {
		t.Fatalf("drained worker should stop after all sessions close: %v state=%+v",err,registry.Snapshot())
	}
	if registry.Count()!=1 {t.Fatal("removed wrong workers")}
	fifth,who,err:=connect("fresh")
	if err!=nil||who!="b:fresh" {t.Fatalf("post-drain route failed: %q %v",who,err)}
	_ = fifth.Close()
}
