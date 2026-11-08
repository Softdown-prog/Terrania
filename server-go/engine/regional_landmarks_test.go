package engine

import "testing"

func TestRegionalLandmarks(t *testing.T) {
	w:=World{Seed:842136}
	if _,exists:=w.RegionalLandmarkForCell(0,0);exists { t.Fatal("starter area contains monument") }
	cases:=[]struct{region string;x,y int}{
		{"north",0,-70},{"south",0,70},{"east",70,0},{"west",-70,0},
	}
	for _,c:=range cases {
		found:=false
		for offset:=-12;offset<=12&&!found;offset++ {
			cx,cy:=c.x,c.y
			if cx==0 { cx+=offset } else { cy+=offset }
			lm,ok:=w.RegionalLandmarkForCell(cx,cy)
			if !ok { continue }
			if got:=worldRegion(getRegionWeights(float64(lm.TileX),float64(lm.TileY)));got!=c.region {
				t.Fatalf("regional landmark in wrong region: got %s, expected %s",got,c.region)
			}
			if w.CanMove(lm.X,lm.Y) { t.Fatalf("landmark %s is not solid",lm.Kind) }
			if !w.Walkable(lm.TileX,lm.TileY) { t.Fatalf("landmark %s generated on terrain obstacle",lm.Kind) }
			found=true
		}
		if !found { t.Fatalf("no landmark found in %s",c.region) }
	}
}
