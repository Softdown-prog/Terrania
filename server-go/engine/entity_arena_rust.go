//go:build rustarena && cgo && linux && amd64

package engine

/*
#cgo CFLAGS: -I${SRCDIR}/../../rust/spatial-kernel/include
#cgo LDFLAGS: -L${SRCDIR}/../../rust/spatial-kernel/target/release -l:libterrania_spatial.a -ldl -lm -lpthread
#include "terrania_spatial.h"
*/
import "C"

import (
    "math"
    "runtime"
)

// An arena is Rust heap memory. The room owns its lifecycle under roomSession.mu.
// The finalizer is a fallback for standalone test rooms not closed explicitly;
// production frees it synchronously at the end of runRoom.
type arenaOwner struct{ ptr *C.TerraniaArena }

func newArenaOwner() *arenaOwner {
    p := C.terrania_arena_new(C.uint32_t(200_000))
    if p == nil {
        return nil
    }
    owner := &arenaOwner{ptr:p}
    runtime.SetFinalizer(owner, func(o *arenaOwner) { o.close() })
    return owner
}

func (o *arenaOwner) close() {
    if o != nil && o.ptr != nil {
        C.terrania_arena_free(o.ptr)
        o.ptr = nil
    }
}

type arenaSnapshot struct {
    kind uint16
    x, y float64
    hp int
    state uint32
}

// Optional mirror only: Go still decides movement, hits, spawn and despawn.
// Rust owns persistent, dense native entity records and generation handles.
type roomEntityArena struct {
    owner *arenaOwner
    handles map[string]uint64
    batchHandles []C.uint64_t
    batchEntities []C.TerraniaEntity
}

func (s *roomEntityArena) close() {
    if s.owner != nil {
        runtime.SetFinalizer(s.owner,nil)
        s.owner.close()
        s.owner = nil
    }
    s.handles = nil
    s.batchHandles = nil
    s.batchEntities = nil
}

func (s *roomEntityArena) ensure(count int) {
    if cap(s.batchHandles) < count {
        s.batchHandles = make([]C.uint64_t,count)
    } else {
        s.batchHandles = s.batchHandles[:count]
    }
    if cap(s.batchEntities) < count {
        s.batchEntities = make([]C.TerraniaEntity,count)
    } else {
        s.batchEntities = s.batchEntities[:count]
    }
}

func (s *roomEntityArena) count() int {
    if s.owner == nil {return 0}
    return int(C.terrania_arena_len(s.owner.ptr))
}

func (s *roomEntityArena) readHandle(handle uint64) (arenaSnapshot,bool) {
    if s.owner == nil {return arenaSnapshot{},false}
    var e C.TerraniaEntity
    if C.terrania_arena_get(s.owner.ptr,C.uint64_t(handle),&e)!=0 {
        return arenaSnapshot{},false
    }
    runtime.KeepAlive(s.owner)
    return arenaSnapshot{kind:uint16(e.kind),x:float64(e.x),y:float64(e.y),
        hp:int(e.hp),state:uint32(e.state)},true
}

// Called under the single room lock *after* Go simulation and despawn. A
// rejected mirror batch can be discarded without changing gameplay.
func (s *roomEntityArena) syncRoom(r *Room) bool {
    if r == nil {return false}
    if len(r.mobs)==0 && s.owner==nil {return true}
    if len(r.mobs)>200_000 {return false}
    if s.owner == nil {
        s.owner = newArenaOwner()
        if s.owner == nil {return false}
        s.handles = make(map[string]uint64)
    }
    for id,h:=range s.handles {
        if r.mobs[id]!=nil {continue}
        if C.terrania_arena_despawn(s.owner.ptr,C.uint64_t(h))!=0 {
            s.close()
            return false
        }
        delete(s.handles,id)
    }
    s.ensure(len(r.mobs))
    next:=0
    for _,id:=range r.mobOrder {
        mob:=r.mobs[id]
        if mob==nil {continue}
        if math.IsNaN(mob.X)||math.IsInf(mob.X,0)||
            math.IsNaN(mob.Y)||math.IsInf(mob.Y,0) {
            s.close()
            return false
        }
        entity:=C.TerraniaEntity{kind:1,x:C.double(mob.X),y:C.double(mob.Y),
            hp:C.int32_t(mob.HP),state:0}
        handle,exists:=s.handles[id]
        if !exists {
            var h C.uint64_t
            if C.terrania_arena_spawn(s.owner.ptr,entity,&h)!=0 {
                s.close()
                return false
            }
            handle=uint64(h)
            s.handles[id]=handle
        }
        if next>=len(s.batchHandles) {s.close();return false}
        s.batchHandles[next]=C.uint64_t(handle)
        s.batchEntities[next]=entity
        next++
    }
    if next!=len(r.mobs) {
        s.close()
        return false
    }
    if next>0 {
        if C.terrania_arena_update_batch(s.owner.ptr,
            &s.batchHandles[0],&s.batchEntities[0],C.uint32_t(next))!=0 {
            s.close()
            return false
        }
    }
    runtime.KeepAlive(s.owner)
    return true
}
