package engine

import (
    "testing"
)

func TestGuestInsertionOrderMatchesTSMap(t *testing.T) {
    r:=NewRoom("origins")
    for _,id:=range []string{"z-first","a-second","m-third"} {r.Add(id,id)}
    players:=r.guestsInOrder()
    for i,id:=range []string{"z-first","a-second","m-third"} {
        if players[i].ID!=id {t.Fatalf("wrong join order %d: %s",i,players[i].ID)}
    }
    // Removing/rejoining moves that participant to the end (JS Map semantics).
    r.Remove("z-first")
    r.Add("z-first","again")
    players=r.guestsInOrder()
    if players[0].ID!="a-second"||players[1].ID!="m-third"||players[2].ID!="z-first" {
        t.Fatalf("rejoin insertion order changed: %+v",players)
    }
    state:=r.SnapshotFor("a-second")
    if state==nil||len(state.Players)!=3 {t.Fatal("snapshot missing players")}
    for i,p:=range state.Players {
        if p.ID!=players[i].ID {t.Fatalf("snapshot player order %d differs from TS Map",i)}
    }
}

func TestMobInsertionOrderAndCleanup(t *testing.T) {
    r:=NewRoom("origins")
    r.Add("one","one")
    for _,id:=range []string{"z-older","a-newer","m-latest"} {
        r.mobs[id]=NewSlime(id,32,48)
        r.mobOrder=append(r.mobOrder,id)
    }
    for i,id:=range []string{"z-older","a-newer","m-latest"} {
        if r.mobsInOrder()[i].ID!=id {t.Fatalf("mob insertion order %d",i)}
    }
    r.removeMob("z-older")
    r.mobs["z-older"]=NewSlime("z-older",32,48)
    r.mobOrder=append(r.mobOrder,"z-older")
    if len(r.mobOrder)!=3 {t.Fatal("mob ordering leaked old ID")}
    for i,id:=range []string{"a-newer","m-latest","z-older"} {
        if r.mobsInOrder()[i].ID!=id {t.Fatalf("mob respawn order %d",i)}
    }
    r.removeMob("m-latest")
    if len(r.mobOrder)!=2||len(r.mobs)!=2 {t.Fatal("mob not removed cleanly")}
}
