package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

type point struct {x,y int}
type vec struct {x,y float64}
func round(v float64) float64 { return math.Round(v*1e8)/1e8 }

func main() {
	seed:=uint32(842136)
	w:=engine.World{Seed:seed}
	coords:=[]point{{0,0},{1,1},{-3,5},{12,-8},{40,18},{-19,-12},{200,50}}
	positions:=[]vec{{16,16},{128,-16},{352,-72},{448,176},{800,800},{-176,-96},{10000,0}}
	hashes:=[]float64{round(engine.Hash2(-8,3,0)),round(engine.Hash2(0,0,seed)),
		round(engine.Hash2(12,9,seed)),round(engine.Hash2(-3,-4,seed))}
	tiles:=make([][]any,0,len(coords))
	for _,p:=range coords {
		t:=w.Tile(p.x,p.y)
		tiles=append(tiles,[]any{t.Ground,t.Tree,t.Rock})
	}
	walk:=make([]bool,0,len(positions))
	speeds:=make([]float64,0,len(positions))
	for _,p:=range positions {
		walk=append(walk,w.CanMove(p.x,p.y))
		speeds=append(speeds,w.SpeedAt(p.x,p.y))
	}
	p:=engine.NewPlayer()
	moving:=make([][]float64,0,13)
	for i:=0;i<13;i++ {
		in:=engine.Direction{}
		if i<8 { in.X=1 }
		p.Update(.05,in,w)
		moving=append(moving,[]float64{round(p.X),round(p.Y),round(p.VX),round(p.VY)})
	}
	attacker:=engine.NewPlayer()
	attacker.FaceX,attacker.FaceY=1,0
	spawns:=make([][][]any,0,4)
	for _,c:=range []point{{-1,1},{0,1},{2,2},{-2,-1}} {
		objects:=make([][]any,0)
		for _,m:=range engine.SpawnSlimes(c.x,c.y,w) {
			objects=append(objects,[]any{m.ID,m.X,m.Y})
		}
		spawns=append(spawns,objects)
	}
	result:=map[string]any{
		"seed":engine.SeedFromRoom("area-1"),
		"hashes":hashes,"tiles":tiles,"walkable":walk,"speeds":speeds,
		"moving":moving,
		"strike":[]bool{engine.CanStrike(attacker,engine.Target{X:28,Y:16},w),
			engine.CanStrike(attacker,engine.Target{X:4,Y:16},w)},
		"spawns":spawns,
	}
	if err:=json.NewEncoder(os.Stdout).Encode(result);err!=nil { fmt.Fprintln(os.Stderr,err);os.Exit(1) }
}
