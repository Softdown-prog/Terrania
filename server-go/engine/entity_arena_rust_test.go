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

func TestRoomArenaBulkSpawnPreservesHandles(t *testing.T) {
    room := NewRoom("arena-bulk-10000")
    defer room.Close()
    for i := 0; i < 10_000; i++ {
        id := fmt.Sprintf("bulk-%d", i)
        mob := NewSlime(id, float64(i%100), float64(i/100))
        room.mobs[id] = mob
        room.mobOrder = append(room.mobOrder, id)
    }
    if !room.entityArena.syncRoom(room) {
        t.Fatal("10k native batch insertion failed")
    }
    if got := room.entityArena.count(); got != 10_000 {
        t.Fatalf("got %d entities after batch", got)
    }
    first := room.entityArena.handles["bulk-0"]
    if !room.entityArena.syncRoom(room) {
        t.Fatal("second 10k batch failed")
    }
    if room.entityArena.handles["bulk-0"] != first {
        t.Fatal("unchanged entity received a new handle")
    }
    for i := 0; i < 5_000; i++ {
        room.removeMob(fmt.Sprintf("bulk-%d", i))
    }
    if !room.entityArena.syncRoom(room) {
        t.Fatal("mass despawn failed")
    }
    if _, ok := room.entityArena.readHandle(first); ok {
        t.Fatal("stale handle accepted")
    }
    if got := room.entityArena.count(); got != 5_000 {
        t.Fatalf("count after mass despawn = %d", got)
    }
}

// This measures Go map traversal, packing 200,000 C records and one Rust
// update_batch call AFTER the initial spawn. It is not a 20Hz room tick,
// since Go.Room still has a hard 96-monster live spawn limit.
func BenchmarkRoomArenaSync200000(b *testing.B) {
    room := NewRoom("bench-arena-200k")
    defer room.Close()
    for i := 0; i < 200_000; i++ {
        id := fmt.Sprintf("entity-%d", i)
        mob := NewSlime(id, float64(i%1000), float64(i/1000))
        room.mobs[id] = mob
        room.mobOrder = append(room.mobOrder, id)
    }
    if !room.entityArena.syncRoom(room) || room.entityArena.count() != 200_000 {
        b.Fatal("200k mirror initialization failed")
    }
    b.ReportAllocs()
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        if !room.entityArena.syncRoom(room) {
            b.Fatal("mirror tick failed")
        }
    }
}

func TestRoomArenaSpeciesTags(t *testing.T) {
	r:=NewRoom("arena-mixed")
	defer r.Close()
	for _,k:=range []MonsterKind{SlimeKind,WolfKind,SpiderKind} {
		id:=string(k)
		r.mobs[id]=NewMonster(k,id,1200,1200)
		r.mobOrder=append(r.mobOrder,id)
	}
	if !r.entityArena.syncRoom(r) {t.Fatal("mixed species arena sync failed")}
	for index,k:=range []MonsterKind{SlimeKind,WolfKind,SpiderKind} {
		id:=string(k)
		record,ok:=r.entityArena.readHandle(r.entityArena.handles[id])
		if !ok || record.kind!=uint16(index+1) {
			t.Fatalf("native tag differs for %s: %+v",k,record)
		}
	}
}
