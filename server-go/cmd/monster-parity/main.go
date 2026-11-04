package main

import (
	"encoding/json"
	"os"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

type Species struct {
	Name string `json:"name"`
	HP int `json:"hp"`
	Damage int `json:"damage"`
	Speed float64 `json:"speed"`
	AggroRadius float64 `json:"aggroRadius"`
	ContactRadius float64 `json:"contactRadius"`
	AttackCooldown float64 `json:"attackCooldown"`
	XP int `json:"xp"`
	Drop string `json:"drop"`
	AI string `json:"ai"`
}
type Mob struct {
	ID string `json:"id"`
	Kind engine.MonsterKind `json:"kind"`
	X float64 `json:"x"`
	Y float64 `json:"y"`
	HP int `json:"hp"`
}
type Sample struct {
	Seed uint32 `json:"seed"`
	Chunk [2]int `json:"chunk"`
	Mobs []Mob `json:"mobs"`
}
func main() {
	catalog := map[string]Species{}
	for kind,name:= range map[engine.MonsterKind]string{
		engine.SlimeKind: "Slime", engine.WolfKind: "Lobo", engine.SpiderKind: "Aranha",
	} {
		definition:=engine.MonsterStats(kind)
		catalog[string(kind)]=Species{Name:name,HP:definition.HP,Damage:definition.Damage,
			Speed:definition.Speed,AggroRadius:definition.AggroRadius,
			ContactRadius:definition.ContactRadius,AttackCooldown:definition.ContactCooldown,
			XP:definition.XP,Drop:definition.Drop,AI:definition.AI}
	}
	samples:=[]Sample{}
	chunks:=[]int{-11,-8,-6,-3,0,3,5,9,12}
	for _,seed:=range []uint32{842136,8912} {
		w:=engine.World{Seed:seed}
		for _,cy:=range chunks {
			for _,cx:=range chunks {
				record:=Sample{Seed:seed,Chunk:[2]int{cx,cy},Mobs:[]Mob{}}
				for _,m:=range engine.SpawnMonsters(cx,cy,w) {
					record.Mobs=append(record.Mobs,Mob{ID:m.ID,Kind:m.Species(),X:m.X,Y:m.Y,HP:m.HP})
				}
				samples=append(samples,record)
			}
		}
	}
	if err:=json.NewEncoder(os.Stdout).Encode(struct {
		Catalog map[string]Species `json:"catalog"`
		Samples []Sample `json:"samples"`
	}{Catalog:catalog,Samples:samples});err!=nil { panic(err) }
}
