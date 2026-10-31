package engine

import (
	"math"
	"time"
)

const MaxMobs = 96

type Guest struct {
	ID,Name string
	Actor *Player
	Input Direction
	AttackQueued bool
	LastInputAt time.Time
	Kills int
}

type Room struct {
	ID string
	Seed uint32
	World World
	Guests map[string]*Guest
	guestOrder []string // TypeScript Map iteration order: insertion, not alphabetical
	mobs map[string]*Slime
	mobOrder []string
	defeated map[string]bool
	defeatedOrder []string
	spawnClock float64
}

func NewRoom(id string) *Room {
	seed:=SeedFromRoom(id)
	if id=="origins" { seed=842136 }
	return &Room{ID:id,Seed:seed,World:World{Seed:seed},
		Guests:make(map[string]*Guest),mobs:make(map[string]*Slime),defeated:make(map[string]bool)}
}

func (r *Room) Add(id,name string) *Guest {
	if _,ok:=r.Guests[id];!ok {r.guestOrder=append(r.guestOrder,id)}
	g:=&Guest{ID:id,Name:name,Actor:NewPlayer(),LastInputAt:time.Now()}
	r.Guests[id]=g
	return g
}
func (r *Room) Remove(id string) {
	delete(r.Guests,id)
	for i,k:=range r.guestOrder {
		if k==id { r.guestOrder=append(r.guestOrder[:i],r.guestOrder[i+1:]...);break }
	}
}
func (r *Room) ReceiveInput(id string,input Input,now time.Time) {
	if g:=r.Guests[id];g!=nil {
		g.Input=Direction{X:input.X,Y:input.Y}
		g.LastInputAt=now
		if input.Attack { g.AttackQueued=true }
	}
}
func (r *Room) guestsInOrder() []*Guest {
	out:=make([]*Guest,0,len(r.Guests))
	for _,id:=range r.guestOrder { if g:=r.Guests[id];g!=nil {out=append(out,g)} }
	return out
}
func (r *Room) mobsInOrder() []*Slime {
	out:=make([]*Slime,0,len(r.mobs))
	for _,id:=range r.mobOrder {if m:=r.mobs[id];m!=nil {out=append(out,m)}}
	return out
}
func (r *Room) removeMob(id string) {
	delete(r.mobs,id)
	for i,k:=range r.mobOrder {
		if k==id {r.mobOrder=append(r.mobOrder[:i],r.mobOrder[i+1:]...);break}
	}
}

// Tick somente pela goroutine dona da sala. Nenhuma dependência de navegador.
func (r *Room) Tick(dt float64,now time.Time) {
	if dt<=0||math.IsNaN(dt)||math.IsInf(dt,0) { return }
	dt=math.Min(dt,.05)
	guests:=r.guestsInOrder()
	for _,g:=range guests {
		input:=g.Input
		if now.Sub(g.LastInputAt)>=350*time.Millisecond { input=Direction{} }
		g.Actor.Update(dt,input,r.World)
	}
	r.spawnClock+=dt
	if r.spawnClock>1.5 {
		r.spawnClock=0
		r.spawnNearGuests(guests)
	}
	for _,g:=range guests {
		if g.AttackQueued { g.Actor.StartAttack();g.AttackQueued=false }
		if !g.Actor.ConsumeStrike() { continue }
		for _,mob:=range r.mobsInOrder() {
			if CanStrike(g.Actor,Target{X:mob.X,Y:mob.Y},r.World) {
				mob.TakeHit(g.Actor.X,g.Actor.Y)
				if mob.HP<=0 {
					r.removeMob(mob.ID)
					r.defeated[mob.ID]=true
					r.defeatedOrder=append(r.defeatedOrder,mob.ID)
					if len(r.defeatedOrder)>5000 {
						delete(r.defeated,r.defeatedOrder[0])
						r.defeatedOrder=r.defeatedOrder[1:]
					}
					g.Kills++
				}
			}
		}
	}
	for _,mob:=range r.mobsInOrder() {
		var near *Guest
		closest:=260.
		for _,g:=range guests {
			d:=math.Hypot(g.Actor.X-mob.X,g.Actor.Y-mob.Y)
			if d<closest { closest=d;near=g }
		}
		if near!=nil { mob.Update(dt,near.Actor,r.World) }
		keep:=false
		for _,g:=range guests {
			if math.Hypot(g.Actor.X-mob.X,g.Actor.Y-mob.Y)<ChunkPixels*2.5 { keep=true;break }
		}
		if !keep { r.removeMob(mob.ID) }
	}
	for _,g:=range guests {
		if g.Actor.HP<=0 {
			g.Actor=NewPlayer()
			g.Input=Direction{}
			g.LastInputAt=time.Time{}
		}
	}
}

func (r *Room) spawnNearGuests(guests []*Guest) {
	for _,g:=range guests {
		if len(r.mobs)>=MaxMobs { return }
		cx,cy:=ChunkOf(g.Actor.X),ChunkOf(g.Actor.Y)
		for dy:=-1;dy<=1;dy++ {
			for dx:=-1;dx<=1;dx++ {
				for _,mob:=range SpawnSlimes(cx+dx,cy+dy,r.World) {
					if len(r.mobs)>=MaxMobs { return }
					if !r.defeated[mob.ID]&&r.mobs[mob.ID]==nil {
						r.mobs[mob.ID]=mob
						r.mobOrder=append(r.mobOrder,mob.ID)
					}
				}
			}
		}
	}
}

func (r *Room) SnapshotFor(id string) *Snapshot {
	me:=r.Guests[id]
	if me==nil { return nil }
	near:=func(x,y float64) bool {
		return math.Abs(x-me.Actor.X)<920&&math.Abs(y-me.Actor.Y)<920
	}
	result:=&Snapshot{Type:"state",Players:[]HeroState{},Mobs:[]MobState{}}
	for _,g:=range r.guestsInOrder() {
		a:=g.Actor
		if !near(a.X,a.Y) { continue }
		result.Players=append(result.Players,HeroState{ID:g.ID,Name:g.Name,X:a.X,Y:a.Y,HP:a.HP,
			Kills:g.Kills,FaceX:a.FaceX,FaceY:a.FaceY,WalkTime:a.WalkTime,
			AttackTime:a.AttackTime,VX:a.VX,VY:a.VY,HurtTime:a.HurtTime})
	}
	for _,m:=range r.mobsInOrder() {
		if !near(m.X,m.Y) { continue }
		result.Mobs=append(result.Mobs,MobState{ID:m.ID,X:m.X,Y:m.Y,HP:m.HP,
			Bounce:m.Bounce(),HurtTime:m.HurtTime})
	}
	return result
}

// Contagem observavel por testes e telemetria sem expor mapas mutaveis.
func (r *Room) MobCount() int { return len(r.mobs) }
