package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
	"github.com/Softdown-prog/Terrania/server-go/presence"
)

func TestGatewayPresenceIgnoresUnconfirmedSeatReservations(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(presence.Data{Online: 7, Rooms: 2, UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano), Scope: "server"})
	}))
	defer backend.Close()
	router, err := cluster.NewRouter("one=" + backend.URL)
	if err != nil {
		t.Fatal(err)
	}
	l := newLobby(1000, 84, 12)
	_, release, err := l.acquire("origins")
	if err != nil {
		t.Fatal(err)
	}
	defer release()
	gateway := httptest.NewServer(gatewayHandlerWithLobby(router, map[string]bool{}, l))
	defer gateway.Close()
	res, err := http.Get(gateway.URL + "/presence")
	if err != nil {
		t.Fatal(err)
	}
	defer func(){_ = res.Body.Close()}()
	var value presence.Data
	if err := json.NewDecoder(res.Body).Decode(&value); err != nil {
		t.Fatal(err)
	}
	if value.Online != 7 || value.Rooms != 2 || value.Scope != "cluster" {
		t.Fatalf("invented total: %+v", value)
	}
}
