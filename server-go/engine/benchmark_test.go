package engine

import (
    "fmt"
    "testing"
    "time"
)

func preparedRoom() *Room {
    r:=NewRoom("origins")
    now:=time.Now()
    for i:=0;i<12;i++ {
        id:=fmt.Sprintf("player-%02d",i)
        g:=r.Add(id,"Aventureiro")
        // Spread players across nearby chunks to exercise collision and spawning.
        g.Actor.X+=float64(i%4)*128
        g.Actor.Y+=float64(i/4)*128
        r.ReceiveInput(id,Input{Type:"input",X:.8,Y:.4},now)
    }
    for i:=0;i<32;i++ {r.Tick(.05,now.Add(time.Duration(i)*50*time.Millisecond))}
    return r
}

func BenchmarkRoomTick12Players(b *testing.B) {
    r:=preparedRoom()
    now:=time.Now()
    b.ReportAllocs()
    b.ResetTimer()
    for i:=0;i<b.N;i++ {r.Tick(.05,now.Add(time.Duration(i)*50*time.Millisecond))}
}

func BenchmarkRoomSnapshot12Players(b *testing.B) {
    r:=preparedRoom()
    b.ReportAllocs()
    b.ResetTimer()
    for i:=0;i<b.N;i++ {
        if state:=r.SnapshotFor("player-00");state==nil {b.Fatal("snapshot missing")}
    }
}


// BenchmarkRoomSnapshot1000Players is a deliberately adversarial single-room
// snapshot with 1000 visible entities. It is NOT a 1000-concurrent-user load test.
// The normal room size and networking behavior are measured separately.
func BenchmarkRoomSnapshot1000Players(b *testing.B) {
	r := NewRoom("origins")
	for i := 0; i < 1000; i++ {
		id := fmt.Sprintf("bench-%04d", i)
		g := r.Add(id, "Aventureiro")
		g.Actor.X = float64(i%25) * 24
		g.Actor.Y = float64(i/25) * 20
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		snapshot := r.SnapshotFor("bench-0000")
		if snapshot == nil || len(snapshot.Players) != 1000 {
			b.Fatalf("expected 1000 visible players, got %+v", snapshot)
		}
	}
}

// BenchmarkMonsterStep96 measures the complete 96-monster update path,
// including the optional one-call Rust batch, Go collision, and hit handling.
// This is a CPU microbenchmark, NOT a 1000-player server load test.
func BenchmarkMonsterStep96(b *testing.B) {
    world := World{Seed:842136}
    guests := make([]*Guest,0,12)
    for i:=0;i<12;i++ {
        g:=&Guest{Actor:NewPlayer()}
        g.Actor.X=float64((i%4)*100-200)
        g.Actor.Y=float64((i/4)*90-100)
        guests=append(guests,g)
    }
    mobs:=make([]*Slime,0,96)
    for i:=0;i<96;i++ {
        mobs=append(mobs,NewSlime(fmt.Sprintf("bench-slime-%d",i),
            float64((i%12)*40-240),float64((i/12)*35-140)))
    }
    var scratch monsterScratch
    b.ReportAllocs()
    b.ResetTimer()
    for i:=0;i<b.N;i++ {
        stepMonstersWithScratch(guests,mobs,.05,world,&scratch)
    }
}

// BenchmarkMonsterStep1024 is a pre-production CPU stress scenario.
// The live Room.MaxMobs limit remains 96; this does not simulate network users.
func BenchmarkMonsterStep1024(b *testing.B) {
    benchmarkMonsterBatch(b, 1024)
}

func BenchmarkMonsterStep4096(b *testing.B) {
    benchmarkMonsterBatch(b, 4096)
}

func benchmarkMonsterBatch(b *testing.B, count int) {
    world := World{Seed: 842136}
    guests := make([]*Guest, 0, 12)
    for i := 0; i < 12; i++ {
        g := &Guest{Actor: NewPlayer()}
        g.Actor.X = 1500 + float64(i%4)*35
        g.Actor.Y = 1400 + float64(i/4)*35
        guests = append(guests, g)
    }
    mobs := make([]*Slime, 0, count)
    for i := 0; i < count; i++ {
        mobs = append(mobs, NewSlime(fmt.Sprintf("benchmark-%d", i),
            1400 + float64(i%64)*4, 1370 + float64(i/64)*4))
    }
    var scratch monsterScratch
    b.ReportAllocs()
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        stepMonstersWithScratch(guests, mobs, .05, world, &scratch)
    }
}
