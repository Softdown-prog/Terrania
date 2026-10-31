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
