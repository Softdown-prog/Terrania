//go:build rustmonsters && cgo && linux && amd64

package engine

import (
    "math"
    "fmt"
    "testing"
)

func TestRustMonsterBatchParityWithGo(t *testing.T) {
    w := World{Seed:842136}
    guestPositions := [][2]float64{{0,0},{70,60},{-140,15},{350,10}}
    makeGuests := func() []*Guest {
        gs := make([]*Guest, 0, len(guestPositions))
        for _, p := range guestPositions {
            a := NewPlayer()
            a.X, a.Y = p[0], p[1]
            gs = append(gs, &Guest{Actor:a})
        }
        return gs
    }
    goGuests, rustGuests := makeGuests(), makeGuests()
    makeMobs := func() []*Slime {
        ms := []*Slime{NewSlime("one",20,0),NewSlime("two",80,85),
            NewSlime("three",-160,0),NewSlime("village",360,5),NewSlime("far",1000,1000)}
        ms[1].TakeHit(85,90)
        return ms
    }
    goMobs, rustMobs := makeMobs(),makeMobs()
    var scratch monsterScratch
    for frame:=0;frame<26;frame++ {
        runGoMonsterStep(goGuests,goMobs,0.05,w)
        if !tryRustMonsterStepWithScratch(rustGuests,rustMobs,0.05,w,&scratch) {
            t.Fatalf("rust batch failed at frame %d",frame)
        }
        for i:=range goMobs {
            a,b:=goMobs[i],rustMobs[i]
            for name, pair:=range map[string][2]float64{
                "x":{a.X,b.X},"y":{a.Y,b.Y},"pulse":{a.pulse,b.pulse},
                "hurt":{a.HurtTime,b.HurtTime},"cooldown":{a.ContactCooldown,b.ContactCooldown},
                "knockX":{a.knockX,b.knockX},"knockY":{a.knockY,b.knockY},
            } {
                if math.Abs(pair[0]-pair[1])>1e-7 {
                    t.Fatalf("frame %d mob %d %s: go %.12f rust %.12f",frame,i,name,pair[0],pair[1])
                }
            }
        }
        for i:=range goGuests {
            if goGuests[i].Actor.HP!=rustGuests[i].Actor.HP {
                t.Fatalf("frame %d player %d HP differs: go %d rust %d",
                    frame,i,goGuests[i].Actor.HP,rustGuests[i].Actor.HP)
            }
        }
    }
}

func TestRustMonsterBatchFallbackIsAtomic(t *testing.T) {
    w:=World{Seed:842136}
    g:=&Guest{Actor:NewPlayer()}
    m:=NewSlime("invalid",20,0)
    m.pulse=math.NaN()
    if tryRustMonsterStep([]*Guest{g},[]*Slime{m},0.05,w) {
        t.Fatal("invalid batch should request Go fallback")
    }
    if m.X!=20 || m.Y!=0 {t.Fatal("failed batch mutated the mob")}
}

func TestRustMonsterBatchMoreThan1000(t *testing.T) {
    world := World{Seed: 842136}
    for _, count := range []int{1024, 4096} {
        t.Run(fmt.Sprintf("%d", count), func(t *testing.T) {
            makeGuests := func() []*Guest {
                gs := make([]*Guest, 0, 12)
                for i := 0; i < 12; i++ {
                    player := NewPlayer()
                    player.X = 1500 + float64(i%4)*35
                    player.Y = 1400 + float64(i/4)*35
                    gs = append(gs, &Guest{Actor: player})
                }
                return gs
            }
            makeMobs := func() []*Slime {
                ms := make([]*Slime, 0, count)
                for i := 0; i < count; i++ {
                    ms = append(ms, NewSlime(fmt.Sprintf("stress-%d", i),
                        1400 + float64(i%64)*4, 1370 + float64(i/64)*4))
                }
                return ms
            }
            goGuests, rustGuests := makeGuests(), makeGuests()
            goMobs, rustMobs := makeMobs(), makeMobs()
            runGoMonsterStep(goGuests, goMobs, .05, world)
            var scratch monsterScratch
            if !tryRustMonsterStepWithScratch(rustGuests, rustMobs, .05, world, &scratch) {
                t.Fatalf("Rust declined %d-monster batch", count)
            }
            for i := range goMobs {
                if math.Abs(goMobs[i].X-rustMobs[i].X) > 1e-6 ||
                    math.Abs(goMobs[i].Y-rustMobs[i].Y) > 1e-6 ||
                    goMobs[i].HP != rustMobs[i].HP {
                    t.Fatalf("monster %d differs in %d-monster batch", i, count)
                }
            }
            for i := range goGuests {
                if goGuests[i].Actor.HP != rustGuests[i].Actor.HP {
                    t.Fatalf("player %d HP differs in %d-monster batch", i, count)
                }
            }
        })
    }
}

// Test buffer lifetime and reuse across changing room population, including
// a rejected batch: Rust must neither own Go memory nor corrupt old outputs.
func TestRustMonsterScratchReusedAcrossTicks(t *testing.T) {
    world := World{Seed:842136}
    player := NewPlayer()
    player.X, player.Y = 1400, 1400
    guests := []*Guest{{Actor:player}}
    scratch := &monsterScratch{}
    makeMobs := func(count int) []*Slime {
        mobs := make([]*Slime, count)
        for i := range mobs {
            mobs[i] = NewSlime(fmt.Sprintf("reuse-%d",i),
                1430+float64(i%32), 1430+float64(i/32))
        }
        return mobs
    }
    mobs := makeMobs(1024)
    if !tryRustMonsterStepWithScratch(guests,mobs,.05,world,scratch) {
        t.Fatal("1024-monster batch rejected")
    }
    inputCap, outputCap := cap(scratch.input), cap(scratch.output)
    inputPtr, outputPtr := &scratch.input[0], &scratch.output[0]
    for i:=0;i<10;i++ {
        if !tryRustMonsterStepWithScratch(guests,mobs,.05,world,scratch) {
            t.Fatalf("repeated batch rejected at iteration %d",i)
        }
    }
    if &scratch.input[0]!=inputPtr || &scratch.output[0]!=outputPtr {
        t.Fatal("FFI buffers reallocated during stable room ticks")
    }
    if cap(scratch.input)!=inputCap || cap(scratch.output)!=outputCap {
        t.Fatal("FFI buffers unexpectedly grew")
    }
    // Shrinking, then expanding a room must not reuse stale active results.
    small := makeMobs(32)
    if !tryRustMonsterStepWithScratch(guests,small,.05,world,scratch) ||
        !tryRustMonsterStepWithScratch(guests,mobs,.05,world,scratch) {
        t.Fatal("variable-size batch failed")
    }
    if &scratch.input[0]!=inputPtr || &scratch.output[0]!=outputPtr {
        t.Fatal("buffer shrinks must reuse capacity")
    }
    bad := makeMobs(3)
    bad[2].pulse = math.NaN()
    x, y := bad[0].X, bad[0].Y
    if tryRustMonsterStepWithScratch(guests,bad,.05,world,scratch) {
        t.Fatal("nonfinite state accepted")
    }
    if bad[0].X != x || bad[0].Y != y {
        t.Fatal("failed batch partially committed")
    }
    if !tryRustMonsterStepWithScratch(guests,small,.05,world,scratch) {
        t.Fatal("buffer not reusable after a failed batch")
    }
}

func TestRustMonsterScratchSteadyStateAllocations(t *testing.T) {
    world := World{Seed:842136}
    g := &Guest{Actor:NewPlayer()}
    g.Actor.X, g.Actor.Y = 1400, 1400
    mobs := []*Slime{NewSlime("perf",2000,2000)}
    scratch := &monsterScratch{}
    if !tryRustMonsterStepWithScratch([]*Guest{g},mobs,.05,world,scratch) {
        t.Fatal("warmup failed")
    }
    guests := []*Guest{g}
    allocs := testing.AllocsPerRun(100,func() {
        if !tryRustMonsterStepWithScratch(guests,mobs,.05,world,scratch) {
            panic("Rust FFI returned error after warmup")
        }
    })
    if allocs != 0 {
        t.Fatalf("expected zero allocations with room-local scratch: %.2f",allocs)
    }
}
