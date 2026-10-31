package engine

import "math"

const (
	AttackDuration = 0.28
	AttackCooldown = 0.42
	AttackWindup = 0.07
	AttackReach = 52.
)

type Direction struct { X, Y float64 }

type Player struct {
	X, Y float64
	HP int
	MaxHP int
	VX, VY float64
	FaceX, FaceY float64
	WalkTime float64
	AttackTime float64
	AttackCooldownTimer float64
	HurtTime float64
	invulnerable float64
	knockX, knockY float64
	strikePending bool
}

func NewPlayer() *Player { return &Player{X:16,Y:16,HP:100,MaxHP:100,FaceY:1} }

// Update preserva a integracao exata de aceleracao do TypeScript.
func (p *Player) Update(dt float64, dir Direction, w World) {
	if math.IsNaN(dt)||math.IsInf(dt,0)||dt<=0 { return }
	dt=math.Min(dt,.1)
	length:=math.Hypot(dir.X,dir.Y)
	moving:=!math.IsNaN(length)&&!math.IsInf(length,0)&&length>.001
	nx,ny:=0.,0.
	if moving {
		denom:=math.Max(1,length)
		nx,ny=dir.X/denom,dir.Y/denom
		if p.AttackTime<=0 { p.FaceX,p.FaceY=dir.X/length,dir.Y/length }
	}
	speed:=126*w.SpeedAt(p.X,p.Y)
	if p.AttackTime>0 { speed*=.72 }
	response:=25.
	if moving { response=18 }
	decay:=math.Exp(-response*dt)
	dx:=nx*speed*dt + ((p.VX-nx*speed)*(1-decay))/response
	dy:=ny*speed*dt + ((p.VY-ny*speed)*(1-decay))/response
	p.VX=nx*speed+(p.VX-nx*speed)*decay
	p.VY=ny*speed+(p.VY-ny*speed)*decay
	oldX,oldY:=p.X,p.Y
	MoveBody(&p.X,&p.Y,dx+p.knockX*dt,dy+p.knockY*dt,w)
	if math.Abs(p.X-oldX)<.001 { p.VX=0 }
	if math.Abs(p.Y-oldY)<.001 { p.VY=0 }
	p.WalkTime+=math.Hypot(p.X-oldX,p.Y-oldY)*.12
	p.knockX*=math.Exp(-12*dt)
	p.knockY*=math.Exp(-12*dt)
	p.AttackTime=math.Max(0,p.AttackTime-dt)
	p.AttackCooldownTimer=math.Max(0,p.AttackCooldownTimer-dt)
	p.HurtTime=math.Max(0,p.HurtTime-dt)
	p.invulnerable=math.Max(0,p.invulnerable-dt)
}

func (p *Player) StartAttack() bool {
	if p.AttackCooldownTimer>0||p.HP<=0 { return false }
	p.AttackTime=AttackDuration
	p.AttackCooldownTimer=AttackCooldown
	p.strikePending=true
	return true
}

func (p *Player) ConsumeStrike() bool {
	if !p.strikePending||p.AttackTime>AttackDuration-AttackWindup { return false }
	p.strikePending=false
	return p.HP>0
}

func (p *Player) TakeDamage(amount int,sourceX,sourceY float64) bool {
	if p.invulnerable>0||p.HP<=0 { return false }
	p.HP-=amount
	if p.HP<0 { p.HP=0 }
	p.HurtTime=.3
	p.invulnerable=.65
	dx,dy:=p.X-sourceX,p.Y-sourceY
	d:=math.Hypot(dx,dy)
	if d==0 { d=1 }
	p.knockX,p.knockY=dx/d*100,dy/d*100
	return true
}

type Target struct { X,Y float64 }

func CanStrike(attacker *Player,target Target,w World) bool {
	dx,dy:=target.X-attacker.X,target.Y-attacker.Y
	distance:=math.Hypot(dx,dy)
	facingLength:=math.Hypot(attacker.FaceX,attacker.FaceY)
	if facingLength==0 { facingLength=1 }
	if distance>=AttackReach||(dx*attacker.FaceX+dy*attacker.FaceY)/
		(math.Max(1,distance)*facingLength) < -0.1 { return false }
	steps:=int(math.Ceil(distance/6))
	for i:=1;i<=steps;i++ {
		if !w.CanMove(attacker.X+dx*float64(i)/float64(steps),
			attacker.Y+dy*float64(i)/float64(steps)) { return false }
	}
	return true
}
