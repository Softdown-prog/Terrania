//go:build rustarena && cgo && linux && amd64

package engine

import (
    "fmt"
    "math"
    "testing"
)

func TestRoomArenaPersistentShadowLifecycle(t *testing.T) {
    room:=NewRoom("arena-shadow-test")
    defer room.Close()
    for i:=0;i<4096;i++ {
        id:=fmt.Sprintf("monster-%d",i)
        mob:=NewSlime(id,float64(i%128),float64(i/128))
        room.mobs[id]=mob
        room.mobOrder=append(room.mobOrder,id)
    }
    if !room.entityArena.syncRoom(room) {t.Fatal("initial sync rejected")}
    if room.entityArena.count()!=4096 {t.Fatalf("got %d native records",room.entityArena.count())}
    prior:=room.entityArena.handles["monster-0"]
    previous,ok:=room.entityArena.readHandle(prior)
    if !ok || previous.kind!=1 || previous.x!=0 {t.Fatalf("invalid initial record: %+v",previous)}
    room.mobs["monster-0"].X=170.25
    room.mobs["monster-0"].HP=1
    if !room.entityArena.syncRoom(room) {t.Fatal("second sync rejected")}
    current,ok:=room.entityArena.readHandle(prior)
    if !ok || current.x!=170.25 || current.hp!=1 {t.Fatalf("snapshot not updated: %+v",current)}
    room.removeMob("monster-0")
    if !room.entityArena.syncRoom(room) {t.Fatal("despawn sync rejected")}
    if room.entityArena.count()!=4095 {t.Fatalf("expected 4095 records, got %d",room.entityArena.count())}
    if _,ok:=room.entityArena.readHandle(prior);ok {t.Fatal("stale handle still readable")}
    newMob:=NewSlime("monster-new",1,2)
    room.mobs[newMob.ID]=newMob
    room.mobOrder=append(room.mobOrder,newMob.ID)
    if !room.entityArena.syncRoom(room) {t.Fatal("slot reuse rejected")}
    newer:=room.entityArena.handles[newMob.ID]
    if prior==newer {t.Fatal("reused slot revived stale generation")}
    if _,ok:=room.entityArena.readHandle(prior);ok {t.Fatal("stale handle revived")}
    if room.entityArena.count()!=4096 {t.Fatal("count changed after reuse")}
    room.Close()
    room.Close()
    if room.entityArena.count()!=0 {t.Fatal("close retained arena")}
}

func TestRoomArenaIsolationAndInvalidSnapshot(t *testing.T) {
    first,second:=NewRoom("mirror-first"),NewRoom("mirror-second")
    defer first.Close()
    defer second.Close()
    for _,r:=range []*Room{first,second} {
        m:=NewSlime("same-name",10,20)
        r.mobs[m.ID]=m
        r.mobOrder=append(r.mobOrder,m.ID)
        if !r.entityArena.syncRoom(r) {t.Fatal("sync failed")}
    }
    first.mobs["same-name"].X=math.NaN()
    if first.entityArena.syncRoom(first) {t.Fatal("accepted nonfinite entity")}
    if first.entityArena.count()!=0 {t.Fatal("invalid arena not released")}
    if second.entityArena.count()!=1 {t.Fatal("another room's arena was corrupted")}
    if v,ok:=second.entityArena.readHandle(second.entityArena.handles["same-name"]); !ok||v.x!=10 {
        t.Fatalf("other room snapshot unexpectedly changed: %+v",v)
    }
}
