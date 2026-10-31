package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/presence"
	"github.com/gorilla/websocket"
)

func TestPresenceTracksActualConnectionsAcrossRooms(t *testing.T) {
	game := newGameServer([]string{"http://localhost:5173"}, "")
	server := httptest.NewServer(game.handler())
	defer server.Close()
	check := func(wantPlayers, wantRooms int) {
		t.Helper()
		deadline := time.Now().Add(2 * time.Second)
		for {
			res, err := http.Get(server.URL + "/presence")
			if err != nil {
				t.Fatal(err)
			}
			var value presence.Data
			err = json.NewDecoder(res.Body).Decode(&value)
			_ = res.Body.Close()
			if err != nil {
				t.Fatal(err)
			}
			if value.Online == wantPlayers && value.Rooms == wantRooms {
				return
			}
			if time.Now().After(deadline) {
				t.Fatalf("got %+v; want %d/%d", value, wantPlayers, wantRooms)
			}
			time.Sleep(10 * time.Millisecond)
		}
	}
	check(0, 0)
	headers := http.Header{"Origin": []string{"http://localhost:5173"}}
	connect := func(room string) *websocket.Conn {
		t.Helper()
		ws, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/ws?room="+room, headers)
		if err != nil {
			t.Fatal(err)
		}
		return ws
	}
	a, b := connect("friends-a"), connect("friends-b")
	defer a.Close()
	defer b.Close()
	check(2, 2)
	_ = a.Close()
	check(1, 1)
	_ = b.Close()
	check(0, 0)
}
