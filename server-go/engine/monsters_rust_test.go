//go:build rustmonsters && cgo && linux && amd64

package engine

import (
    "math"
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
    for frame:=0;frame<26;frame++ {
        runGoMonsterStep(goGuests,goMobs,0.05,w)
        if !tryRustMonsterStep(rustGuests,rustMobs,0.05,w) {
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
