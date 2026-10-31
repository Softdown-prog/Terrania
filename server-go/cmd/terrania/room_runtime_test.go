package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// Real WebSocket clients, active simulation and one deliberately blocked room.
// The other room must keep ticking; the admission and metrics endpoints must
// remain responsive without acquiring the blocked room's mutex.
func TestSlowRoomDoesNotStallOtherRooms(t *testing.T) {
	s:=newGameServer([]string{loadOrigin},"")
	ctx,cancel:=context.WithCancel(context.Background())
	defer cancel()
	go s.run(ctx)
	server:=httptest.NewServer(s.handler())
	defer server.Close()
	slowClient:=connectLoad(t,server.URL,"slow")
	defer func(){_ = slowClient.Close()}()
	fastClient:=connectLoad(t,server.URL,"fast")
	defer func(){_ = fastClient.Close()}()
	s.mu.Lock()
	slow,fast:=s.rooms["slow"],s.rooms["fast"]
	s.mu.Unlock()
	if slow==nil||fast==nil {t.Fatal("missing room runtime")}
	deadline:=time.Now().Add(2*time.Second)
	for fast.ticks.Load()<2&&time.Now().Before(deadline) {time.Sleep(10*time.Millisecond)}
	if fast.ticks.Load()<2 {t.Fatal("fast room did not start ticking")}

	slow.mu.Lock()
	start:=fast.ticks.Load()
	// Holding the slow room lock must not hold the server registry mutex.
	if !s.mu.TryLock() {
		slow.mu.Unlock()
		t.Fatal("slow room is blocking unrelated registry operations")
	}
	s.mu.Unlock()
	other:=connectLoad(t,server.URL,"third")
	res,err:=http.Get(server.URL+"/status")
	if err!=nil {
		slow.mu.Unlock();_ = other.Close()
		t.Fatal(err)
	}
	var status struct {
		Connected int `json:"connected"`
		Rooms int `json:"rooms"`
		TickScope string `json:"tickScope"`
	}
	err=json.NewDecoder(res.Body).Decode(&status)
	_ = res.Body.Close()
	if err!=nil {slow.mu.Unlock();_ = other.Close();t.Fatal(err)}
	if res.StatusCode!=http.StatusOK||status.Connected!=3||status.Rooms!=3||
		status.TickScope!="completed-room-ticks" {
		slow.mu.Unlock();_ = other.Close()
		t.Fatalf("unexpected status during stalled room: %+v HTTP=%d",status,res.StatusCode)
	}
	time.Sleep(290*time.Millisecond)
	completed:=fast.ticks.Load()-start
	slow.mu.Unlock()
	if completed<3 {t.Fatalf("fast room starved by slow room: %d ticks in 290ms",completed)}
	_ = other.Close()
	_ = slowClient.Close()
	_ = fastClient.Close()
	waitClients(t,s,0)
	s.mu.Lock()
	remaining:=len(s.rooms)
	s.mu.Unlock()
	if remaining!=0 {t.Fatalf("orphan room loops/registry entries: %d",remaining)}
	select {
	case <-slow.stop:
	default: t.Fatal("slow room ticker wasn't stopped after last disconnect")
	}
}
