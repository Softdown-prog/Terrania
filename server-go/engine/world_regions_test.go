package engine

import ("testing";"math")

func TestMacroRegions(t *testing.T) {
    cases:=[]struct{x,y float64;region string;tier int}{
        {0,0,"center",1},{0,-26000,"north",3},{0,26000,"south",4},
        {26000,0,"east",2},{-26000,0,"west",5},
    }
    for _,c:=range cases {
        got:=worldRegion(getRegionWeights(c.x,c.y))
        if got!=c.region||regionDifficulty(c.x,c.y)!=c.tier { t.Fatalf("%v,%v => %s tier %d",c.x,c.y,got,regionDifficulty(c.x,c.y)) }
        w:=getRegionWeights(c.x,c.y)
        if math.Abs(w.center+w.north+w.south+w.east+w.west-1)>1e-9 { t.Fatal("weights don't sum to 1") }
        a:=getTerrainProfile(c.x,c.y,842136)
        b:=getTerrainProfile(c.x,c.y,842136)
        if a!=b { t.Fatal("nondeterministic profile") }
    }
}
func TestCardinalPassages(t *testing.T) {
    w:=World{Seed:842136}
    for n:=-28000;n<=28000;n+=800 {
        if !w.Walkable(0,n)||!w.Walkable(n,0) { t.Fatalf("blocked route at %d",n) }
    }
}
