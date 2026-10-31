package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestConfigurableCapacityAndMetrics(t *testing.T){
	t.Setenv("MAX_CLIENTS","1000")
	t.Setenv("MAX_ROOMS","84")
	l,err:=limitsFromEnv()
	if err!=nil {t.Fatal(err)}
	if l.clients!=1000||l.rooms!=84||l.perRoom!=12 {t.Fatalf("unexpected limits: %+v",l)}
	s:=newGameServerWithLimits([]string{"http://localhost:5173"},"",l)
	server:=httptest.NewServer(s.handler())
	defer server.Close()
	res,err:=http.Get(server.URL+"/status")
	if err!=nil {t.Fatal(err)}
	defer func(){_ = res.Body.Close()}()
	var status map[string]any
	if err:=json.NewDecoder(res.Body).Decode(&status);err!=nil {t.Fatal(err)}
	if status["maxClients"]!=float64(1000)||status["maxRooms"]!=float64(84) {
		t.Fatalf("capacity not reflected in status: %+v",status)
	}
	if status["connected"]!=float64(0)||status["rooms"]!=float64(0) {t.Fatal("unexpected players")}
}

func TestRejectUnboundedOrInvalidCapacity(t *testing.T){
	for _,tc:=range []struct{clients,rooms string}{
		{"0","8"},{"-1","8"},{"10001","8"},{"not-a-number","8"},
		{"1000","0"},{"1000","10001"},{"1000","inf"},
	} {
		t.Setenv("MAX_CLIENTS",tc.clients)
		t.Setenv("MAX_ROOMS",tc.rooms)
		if _,err:=limitsFromEnv();err==nil {t.Errorf("unsafe limits accepted %+v",tc)}
	}
}
