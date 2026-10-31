package main

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/Softdown-prog/Terrania/server-go/engine"
)

// probeMultiplayer joins two temporary clients through the *real* listening
// WebSocket handler. It verifies v3 welcome, same-room state and movement
// observed by a second player. No public network or privileged socket needed.
func probeMultiplayer(port, origin string) error {
	room := fmt.Sprintf("probe-%x", uint64(time.Now().UnixNano()) & 0xffffffff)
	url := "ws://127.0.0.1:" + port + "/ws?room=" + room
	dialer := websocket.Dialer{HandshakeTimeout: 3 * time.Second, EnableCompression: false}
	headers := http.Header{"Origin": []string{origin}}
	first, _, err := dialer.Dial(url, headers)
	if err != nil { return fmt.Errorf("player 1 connect: %w", err) }
	defer func(){_ = first.Close()}()
	second, _, err := dialer.Dial(url, headers)
	if err != nil { return fmt.Errorf("player 2 connect: %w", err) }
	defer func(){_ = second.Close()}()

	var a, b engine.Welcome
	_ = first.SetReadDeadline(time.Now().Add(3 * time.Second))
	if err := first.ReadJSON(&a); err != nil { return fmt.Errorf("player 1 welcome: %w", err) }
	_ = second.SetReadDeadline(time.Now().Add(3 * time.Second))
	if err := second.ReadJSON(&b); err != nil { return fmt.Errorf("player 2 welcome: %w", err) }
	if a.Type != "welcome" || b.Type != "welcome" ||
		a.Version != engine.ProtocolVersion || b.Version != engine.ProtocolVersion ||
		a.Room != room || b.Room != room || a.Seed != b.Seed || a.ID == b.ID {
		return fmt.Errorf("v3 handshake incompatible")
	}

	startX := 0.
	foundBoth := false
	for i := 0; i < 22; i++ {
		_ = second.SetReadDeadline(time.Now().Add(3 * time.Second))
		var state engine.Snapshot
		if err := second.ReadJSON(&state); err != nil { return fmt.Errorf("initial snapshot: %w", err) }
		if state.Type != "state" || len(state.Players) != 2 { continue }
		for _, p := range state.Players {
			if p.ID == a.ID {
				startX = p.X
				foundBoth = true
			}
		}
		if foundBoth { break }
	}
	if !foundBoth { return fmt.Errorf("two players not visible in same room") }

	// Input is queued repeatedly to avoid the 350ms stale-input cutoff.
	// Client B must see A move in a fresh authoritative snapshot.
	done := make(chan error, 1)
	go func() {
		defer close(done)
		for i := 0; i < 13; i++ {
			if err := first.WriteJSON(engine.Input{Type:"input", X:1, Y:0, Attack:false}); err != nil {
				done <- err
				return
			}
			time.Sleep(55 * time.Millisecond)
		}
		_ = first.WriteJSON(engine.Input{Type:"input", X:0, Y:0, Attack:false})
		done <- nil
	}()

	deadline := time.Now().Add(4 * time.Second)
	moved := false
	for time.Now().Before(deadline) {
		_ = second.SetReadDeadline(deadline)
		var state engine.Snapshot
		if err := second.ReadJSON(&state); err != nil { return fmt.Errorf("movement snapshot: %w", err) }
		for _, player := range state.Players {
			if player.ID == a.ID && player.X > startX+8 {
				moved = true
				break
			}
		}
		if moved { break }
	}
	// Wait for the writer before closing the socket; avoid leaked goroutines.
	if err:=<-done;err!=nil {return fmt.Errorf("probe input writer: %w",err)}
	if !moved { return fmt.Errorf("second player did not observe movement") }
	// Assert protocol boundaries without changing the public world.
	if strings.TrimSpace(a.ID) == "" { return fmt.Errorf("empty player id") }
	return nil
}
