package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

type frame struct {
	Player []float64 `json:"p"`
	HP int `json:"hp"`
	Mob []float64 `json:"mob"`
	MobHP int `json:"mobHp"`
	Strikes int `json:"strikes"`
}
func round(v float64) float64 {return math.Round(v*1e6)/1e6}
func rounded(values ...float64) []float64 {
	out:=make([]float64,0,len(values))
	for _,v:=range values {out=append(out,round(v))}
	return out
}
func placement(w engine.World) (float64,float64,error) {
	for y:=-480;y<=480;y+=32 {
		for x:=-480;x<=480;x+=32 {
			// Match villageGround check of TS: this search begins far from village.
			tx,ty:=x/32,y/32
			if tx>=6&&tx<=21&&ty>=-7&&ty<=9 {continue}
			attacker:=engine.NewPlayer()
			attacker.X=float64(x);attacker.Y=float64(y)
			attacker.FaceX=1;attacker.FaceY=0
			if w.CanMove(float64(x),float64(y))&&w.CanMove(float64(x+35),float64(y))&&
				engine.CanStrike(attacker,engine.Target{X:float64(x+35),Y:float64(y)},w) {
				return float64(x),float64(y),nil
			}
		}
	}
	return 0,0,fmt.Errorf("no combat placement")
}
func main() {
	w:=engine.World{Seed:842136}
	x,y,err:=placement(w)
	if err!=nil {fmt.Fprintln(os.Stderr,err);os.Exit(1)}
	hero:=engine.NewPlayer()
	hero.X=x;hero.Y=y;hero.FaceX=1;hero.FaceY=0
	mob:=engine.NewSlime("fixture",x+35,y)
	trace:=make([]frame,0,26)
	strikes:=0
	for step:=0;step<26;step++ {
		direction:=engine.Direction{}
		if step>=18&&step<23 {direction.X=1}
		hero.Update(.05,direction,w)
		if step==0||step==11 {hero.StartAttack()}
		if hero.ConsumeStrike()&&mob.HP>0&&engine.CanStrike(hero,engine.Target{X:mob.X,Y:mob.Y},w) {
			mob.TakeHit(hero.X,hero.Y)
			strikes++
		}
		if mob.HP>0 {mob.Update(.05,hero,w)}
		if step==14||step==15||step==25 {hero.TakeDamage(7,mob.X,mob.Y)}
		trace=append(trace,frame{
			Player:rounded(hero.X,hero.Y,hero.VX,hero.VY,hero.FaceX,hero.FaceY,hero.AttackTime,hero.HurtTime),
			HP:hero.HP,
			Mob:rounded(mob.X,mob.Y,mob.Bounce(),mob.HurtTime,mob.ContactCooldown),
			MobHP:mob.HP,
			Strikes:strikes,
		})
	}
	_ = json.NewEncoder(os.Stdout).Encode(map[string]any{"position":[]float64{x,y},"trace":trace})
}
