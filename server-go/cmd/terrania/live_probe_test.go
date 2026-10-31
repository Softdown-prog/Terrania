package main

import (
	"context"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"
)

func TestRealTwoPlayerStartupProbe(t *testing.T) {
	const origin = "https://rpg.analysepro.com"
	game := newGameServer([]string{origin}, "0123456789abcdef0123456789abcdef01234567")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go game.run(ctx)
	server := httptest.NewServer(game.handler())
	defer server.Close()
	u, err := url.Parse(server.URL)
	if err != nil { t.Fatal(err) }
	start := time.Now()
	if err := probeMultiplayer(u.Port(), origin); err != nil {
		t.Fatalf("live multiplayer probe failed: %v", err)
	}
	if time.Since(start)>5*time.Second { t.Fatal("two-player probe too slow") }
	game.mu.Lock()
	remaining := len(game.clients)
	game.mu.Unlock()
	// Close frames propagate asynchronously; the probe must not leave clients
	// or rooms behind after websocket disconnects.
	deadline:=time.Now().Add(2*time.Second)
	for remaining!=0 && time.Now().Before(deadline) {
		time.Sleep(10*time.Millisecond)
		game.mu.Lock();remaining=len(game.clients);game.mu.Unlock()
	}
	if remaining!=0 { t.Fatalf("probe leaked %d clients",remaining) }
}
