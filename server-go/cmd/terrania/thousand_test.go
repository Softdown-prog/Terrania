package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/Softdown-prog/Terrania/server-go/engine"
)

// Capacity admission only: real simultaneous WebSocket handshakes and welcome.
// Does NOT claim 1000 smoothly simulated players at 20Hz on production hardware.
// Execute explicitly in CI: TEST_1000_CONNECTIONS=1 go test ./cmd/terrania -run TestThousandConnectionsAdmission.
func TestThousandConnectionsAdmission(t *testing.T) {
	if os.Getenv("TEST_1000_CONNECTIONS")!="1" {t.Skip("opt-in thousand socket admission test")}
	const total=1000
	s:=newGameServerWithLimits([]string{loadOrigin},"",limits{clients:total,rooms:84,perRoom:12})
	server:=httptest.NewServer(s.handler())
	defer server.Close()
	sockets:=make([]*websocket.Conn,0,total)
	defer func(){for _,ws:=range sockets{_ = ws.Close()}}()
	dialer:=websocket.Dialer{HandshakeTimeout:5*time.Second}
	wsURL:="ws"+strings.TrimPrefix(server.URL,"http")+"/ws?room="
	for i:=0;i<total;i++ {
		room:=fmt.Sprintf("room-%d",i%84)
		ws,resp,err:=dialer.Dial(wsURL+room,http.Header{"Origin":[]string{loadOrigin}})
		if err!=nil {
			code:=0
			if resp!=nil {code=resp.StatusCode;_ = resp.Body.Close()}
			t.Fatalf("connection %d rejected (HTTP %d): %v",i,code,err)
		}
		sockets=append(sockets,ws)
		_ = ws.SetReadDeadline(time.Now().Add(5*time.Second))
		var welcome engine.Welcome
		if err:=ws.ReadJSON(&welcome);err!=nil {t.Fatalf("welcome %d: %v",i,err)}
		if welcome.Version!=engine.ProtocolVersion||welcome.Room!=room {
			t.Fatalf("invalid welcome %d: %+v",i,welcome)
		}
	}
	s.mu.Lock()
	connected,rooms:=len(s.clients),len(s.rooms)
	s.mu.Unlock()
	if connected!=total||rooms!=84 {t.Fatalf("expected 1000 active sessions across 84 rooms, got %d/%d",connected,rooms)}
	// Admit no extra session while the logical process limit is full.
	ws,resp,err:=dialer.Dial(wsURL+"overflow",http.Header{"Origin":[]string{loadOrigin}})
	if ws!=nil {_=ws.Close()}
	if err==nil||resp==nil||resp.StatusCode!=http.StatusServiceUnavailable {
		t.Fatalf("1001st client not rejected: err=%v resp=%v",err,resp)
	}
	if resp!=nil {_=resp.Body.Close()}
	for _,ws:=range sockets {_=ws.Close()}
	waitClients(t,s,0)
	s.mu.Lock();remain:=len(s.rooms);s.mu.Unlock()
	if remain!=0 {t.Fatalf("room slots leaked after all disconnect: %d",remain)}
}
