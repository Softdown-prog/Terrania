package main

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

// roomSession is the ownership boundary for one authoritative simulation.
// The room's mutable engine state and its membership are only touched under mu.
// The global gameServer.mu protects the room/client registries, never Tick().
type roomSession struct {
	mu sync.Mutex
	room *engine.Room
	clients map[*client]struct{}
	stop chan struct{}
	ticks atomic.Uint64
	overruns atomic.Uint64
	lastTickNs atomic.Int64
}

func newRoomSession(id string) *roomSession {
	return &roomSession{
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
			rs.mu.Lock()
			rs.room.Tick(dt,now)
			frame++
			if frame%2==0 {
				for c:=range rs.clients {
					if state:=rs.room.SnapshotFor(c.id);state!=nil {
						c.enqueueSnapshot(state)
					}
				}
			}
			rs.mu.Unlock()
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
