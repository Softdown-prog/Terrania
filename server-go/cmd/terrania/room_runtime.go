package main

import (
	"context"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/engine"
	"github.com/gorilla/websocket"
)

// roomSession is the ownership boundary for one authoritative simulation.
// The room's mutable engine state and its membership are only touched under mu.
// The global gameServer.mu protects the room/client registries, never Tick().
type roomSession struct {
	id string // immutable copy of the room ID, safe to read even if the engine failed
	mu sync.Mutex
	room *engine.Room
	clients map[*client]struct{}
	members int // reserved seats: only gameServer.mu, never wait for room.mu
	stop chan struct{}
	ticks atomic.Uint64
	overruns atomic.Uint64
	lastTickNs atomic.Int64
}

func newRoomSession(id string) *roomSession {
	return &roomSession{
		id:id,
		room:engine.NewRoom(id),
		clients:make(map[*client]struct{}),
		stop:make(chan struct{}),
	}
}

// Each room owns its own 20 Hz clock. A slow room cannot postpone simulation
// or snapshots in other rooms, even when dozens share the same Go worker.
func (s *gameServer) runRoom(ctx context.Context, rs *roomSession) {
	ticker:=time.NewTicker(50*time.Millisecond)
	defer ticker.Stop()
	// Wait for any in-flight tick or disconnect before freeing the optional Rust arena.
	// A room that already panicked must not take the worker down again while closing.
	defer func() {
		rs.mu.Lock()
		defer rs.mu.Unlock()
		defer func() { _ = recover() }()
		rs.room.Close()
	}()
	previous:=time.Now()
	frame:=0
	for {
		select {
		case <-ctx.Done():return
		case <-rs.stop:return
		case now:=<-ticker.C:
			started:=time.Now()
			dt:=now.Sub(previous).Seconds()
			previous=now
			if dt<0 {dt=0}
			if dt>.05 {dt=.05}
			frame++
			if failure:=s.tickRoom(rs,dt,now,frame%2==0);failure!=nil {
				s.failRoom(rs,failure)
				return
			}
			elapsed:=time.Since(started)
			rs.ticks.Add(1)
			rs.lastTickNs.Store(int64(elapsed))
			s.ticks.Add(1) // aggregate completed *room* ticks, not global frames
			s.lastTickNs.Store(int64(elapsed))
			if elapsed>50*time.Millisecond {
				rs.overruns.Add(1)
				s.tickOverruns.Add(1)
			}
		}
	}
}

// tickRoom runs one simulation step (and optionally the snapshot fan-out) under the room lock.
// A panic is returned instead of propagated: Go would otherwise terminate the whole worker,
// ending every other room's session because of one room's bug.
func (s *gameServer) tickRoom(rs *roomSession, dt float64, now time.Time, snapshot bool) (failure any) {
	rs.mu.Lock()
	defer rs.mu.Unlock()
	defer func() { failure=recover() }()
	rs.room.Tick(dt,now)
	if snapshot {
		for c:=range rs.clients {
			if state:=rs.room.SnapshotFor(c.id);state!=nil {
				c.enqueueSnapshot(state)
			}
		}
	}
	return nil
}

// failRoom retires a room whose simulation panicked and disconnects only its players.
func (s *gameServer) failRoom(rs *roomSession, failure any) {
	log.Printf("room %s stopped after internal error: %v",rs.id,failure)
	s.mu.Lock()
	if s.rooms[rs.id]==rs { delete(s.rooms,rs.id) }
	sockets:=make([]*websocket.Conn,0,rs.members)
	for ws,c:=range s.clients { if c.room==rs { sockets=append(sockets,ws) } }
	s.mu.Unlock()
	for _,ws:=range sockets {
		_ = ws.WriteControl(websocket.CloseMessage,websocket.FormatCloseMessage(1011,"room error"),time.Now().Add(time.Second))
		_ = ws.Close()
	}
}
