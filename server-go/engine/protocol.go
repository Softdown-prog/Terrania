package engine

import (
	"encoding/json"
	"errors"
	"math"
	"regexp"
	"strings"
)

const ProtocolVersion = 3
const MaxInputBytes = 512
var roomNamePattern = regexp.MustCompile("^[a-z0-9-]{1,24}$")

func ValidRoom(s string) bool { return roomNamePattern.MatchString(s) }

type Input struct {
	Type string `json:"type"`
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Attack bool `json:"attack"`
}

// Validar na borda: o cliente nao define HP, coordenadas oficiais, seed nem kills.
func ParseInput(data []byte) (Input,error) {
	var in Input
	if len(data)==0||len(data)>MaxInputBytes { return in,errors.New("payload excede limite") }
	dec:=json.NewDecoder(strings.NewReader(string(data)))
	dec.DisallowUnknownFields()
	if err:=dec.Decode(&in);err!=nil { return Input{},err }
	if dec.Decode(new(any))==nil { return Input{},errors.New("mensagens concatenadas") }
	if in.Type!="input"|| math.IsNaN(in.X)||math.IsNaN(in.Y)||
		math.IsInf(in.X,0)||math.IsInf(in.Y,0)||math.Hypot(in.X,in.Y)>1.05 {
		return Input{},errors.New("input invalido")
	}
	// JSON unmarshal de bool rejeita strings. Checa campos obrigatorios.
	var raw map[string]json.RawMessage
	if err:=json.Unmarshal(data,&raw);err!=nil { return Input{},err }
	for _,k:=range []string{"type","x","y","attack"} {
		if _,ok:=raw[k];!ok { return Input{},errors.New("campo ausente: "+k) }
	}
	return in,nil
}

type HeroState struct {
	ID string `json:"id"`
	Name string `json:"name"`
	X float64 `json:"x"`
	Y float64 `json:"y"`
	HP int `json:"hp"`
	Kills int `json:"kills"`
	FaceX float64 `json:"faceX"`
	FaceY float64 `json:"faceY"`
	WalkTime float64 `json:"walkTime"`
	AttackTime float64 `json:"attackTime"`
	VX float64 `json:"vx"`
	VY float64 `json:"vy"`
	HurtTime float64 `json:"hurtTime"`
}

type MobState struct {
	ID string `json:"id"`
	X float64 `json:"x"`
	Y float64 `json:"y"`
	HP int `json:"hp"`
	Bounce float64 `json:"bounce"`
	HurtTime float64 `json:"hurtTime"`
}

type Snapshot struct {
	Type string `json:"type"`
	Players []HeroState `json:"players"`
	Mobs []MobState `json:"mobs"`
}

type Welcome struct {
	Type string `json:"type"`
	Version int `json:"version"`
	ID string `json:"id"`
	Room string `json:"room"`
	Seed uint32 `json:"seed"`
}

func NewWelcome(id,room string,seed uint32) Welcome {
	return Welcome{Type:"welcome",Version:ProtocolVersion,ID:id,Room:room,Seed:seed}
}
