package engine

import (
	"math"
	"math/rand"
	"reflect"
	"testing"
)

func TestOptionalSpatialSelectionMatchesOriginalGoRules(t *testing.T) {
	guests:=[]*Guest{
		{ID:"z-first",Actor:&Player{X:10,Y:0}},
		{ID:"a-second",Actor:&Player{X:-10,Y:0}},
		{ID:"edge",Actor:&Player{X:920,Y:0}},
		{ID:"negative",Actor:&Player{X:-919,Y:-919}},
		{ID:"nan",Actor:&Player{X:math.NaN(),Y:0}},
	}
	var got []string
	visitVisibleGuests(guests,0,0,func(g *Guest){got=append(got,g.ID)})
	if !reflect.DeepEqual(got,[]string{"z-first","a-second","negative"}) {
		t.Fatalf("visible guests in wrong order: %v",got)
	}
	if target:=closestGuest(guests,0,0);target!=guests[0] {
		t.Fatalf("equal distance must favor earliest guest: %v",target)
	}
	if target:=closestGuest(guests,0,260);target!=nil {
		t.Fatalf("out-of-range target: %+v",target)
	}
	mobs:=[]*Slime{
		{ID:"first",X:0,Y:0},{ID:"out",X:920,Y:0},{ID:"last",X:10,Y:10},
	}
	var ids []string
	visitVisibleMobs(mobs,0,0,func(m *Slime){ids=append(ids,m.ID)})
	if !reflect.DeepEqual(ids,[]string{"first","last"}) {t.Fatalf("mobs: %v",ids)}
}

func TestOptionalSpatialRandomizedParity(t *testing.T) {
	rng:=rand.New(rand.NewSource(842136))
	for trial:=0;trial<500;trial++ {
		n:=rng.Intn(97)
		guests:=make([]*Guest,0,n)
		mobs:=make([]*Slime,0,n)
		for i:=0;i<n;i++ {
			x,y:=float64(rng.Intn(6000)-3000),float64(rng.Intn(6000)-3000)
			guests=append(guests,&Guest{ID:"g",Actor:&Player{X:x,Y:y}})
			mobs=append(mobs,&Slime{ID:"m",X:x,Y:y})
		}
		cx,cy:=float64(rng.Intn(3000)-1500),float64(rng.Intn(3000)-1500)
		var gotGuests,expectedGuests []*Guest
		var gotMobs,expectedMobs []*Slime
		visitVisibleGuests(guests,cx,cy,func(g *Guest){gotGuests=append(gotGuests,g)})
		visitVisibleMobs(mobs,cx,cy,func(m *Slime){gotMobs=append(gotMobs,m)})
		for _,g:=range guests {
			if math.Abs(g.Actor.X-cx)<920&&math.Abs(g.Actor.Y-cy)<920 {expectedGuests=append(expectedGuests,g)}
		}
		for _,m:=range mobs {
			if math.Abs(m.X-cx)<920&&math.Abs(m.Y-cy)<920 {expectedMobs=append(expectedMobs,m)}
		}
		if !reflect.DeepEqual(gotGuests,expectedGuests)||!reflect.DeepEqual(gotMobs,expectedMobs) {
			t.Fatalf("visible indexes changed on trial %d",trial)
		}
		var closest *Guest
		radius:=260.
		for _,g:=range guests {
			d:=math.Hypot(g.Actor.X-cx,g.Actor.Y-cy)
			if d<radius {radius=d;closest=g}
		}
		if actual:=closestGuest(guests,cx,cy);actual!=closest {
			t.Fatalf("nearest target changed on trial %d",trial)
		}
	}
}

func TestOptionalSpatialSnapshotContract(t *testing.T) {
	r:=NewRoom("origins")
	me:=r.Add("player-1","first")
	me.Actor.X,me.Actor.Y=0,0
	near:=r.Add("player-2","second")
	near.Actor.X,near.Actor.Y=500,-20
	far:=r.Add("player-3","far")
	far.Actor.X,far.Actor.Y=920,0
	r.mobs["b"]=&Slime{ID:"b",X:-10,Y:10,HP:2}
	r.mobs["a"]=&Slime{ID:"a",X:920,Y:0,HP:2}
	r.mobOrder=[]string{"b","a"}
	state:=r.SnapshotFor("player-1")
	if state==nil || len(state.Players)!=2||state.Players[0].ID!="player-1"||
		state.Players[1].ID!="player-2"||len(state.Mobs)!=1||state.Mobs[0].ID!="b" {
		t.Fatalf("snapshot changed: %+v",state)
	}
}

func benchmarkSpatialFixture() ([]*Guest,[]*Slime) {
	g,m:=make([]*Guest,0,12),make([]*Slime,0,96)
	for i:=0;i<12;i++ {
		x,y:=float64(i*31-120),float64(i*21-150)
		g=append(g,&Guest{Actor:&Player{X:x,Y:y}})
	}
	for i:=0;i<96;i++ {
		m=append(m,&Slime{X:float64(i*32-1200),Y:float64(i*20-600)})
	}
	return g,m
}

var spatialSink int

func BenchmarkSpatialSnapshotSelection(b *testing.B) {
	guests,mobs:=benchmarkSpatialFixture()
	b.ReportAllocs()
	total:=0
	b.ResetTimer()
	for i:=0;i<b.N;i++ {
		visitVisibleGuests(guests,0,0,func(_ *Guest){total++})
		visitVisibleMobs(mobs,0,0,func(_ *Slime){total++})
	}
	spatialSink=total
}
func BenchmarkSpatialNearestTarget(b *testing.B) {
	guests,_:=benchmarkSpatialFixture()
	b.ReportAllocs()
	n:=0
	b.ResetTimer()
	for i:=0;i<b.N;i++ {
		if closestGuest(guests,10,10)!=nil {n++}
	}
	spatialSink=n
}
