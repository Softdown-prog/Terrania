package engine

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"time"
	"unicode/utf8"
)

// RoomStateVersion changes only when the simulation-state encoding changes,
// independently of the public client WebSocket protocol.
const RoomStateVersion = 1
const MaxRoomStateBytes = 1 << 20
const maxRoomStatePlayers = 12
const maxRoomStateDefeated = 5000

var ErrRoomStateInvalid = errors.New("invalid serialized room state")

// RoomState is a private, bounded, versioned, complete snapshot of the CURRENT
// Go room simulation. It is NOT a browser-facing SnapshotFor and excludes
// sockets, membership locks, Rust arena mirrors, scratch buffers and transport.
// Call ExportState while holding the room's tick/ownership mutex.
type RoomState struct {
	Version    uint16
	RoomID     string
	Seed       uint32
	SpawnClock float64
	Players    []RoomGuestState
	Mobs       []RoomMobState
	Defeated   []string
}

type RoomGuestState struct {
	ID           string
	Name         string
	Actor        RoomPlayerState
	Input        Direction
	AttackQueued bool
	LastInputAt  time.Time
	Kills        int
}

type RoomPlayerState struct {
	X, Y                float64
	HP, MaxHP           int
	VX, VY              float64
	FaceX, FaceY        float64
	WalkTime            float64
	AttackTime          float64
	AttackCooldownTimer float64
	HurtTime            float64
	Invulnerable        float64
	KnockX, KnockY      float64
	StrikePending       bool
}

type RoomMobState struct {
	// Optional tag preserves version-1 checkpoints for legacy Slimes.
	Kind            MonsterKind `json:",omitempty"`
	ID              string
	X, Y            float64
	HP              int
	HurtTime        float64
	ContactCooldown float64
	Pulse           float64
	KnockX, KnockY  float64
}

func finite(v ...float64) bool {
	for _, n := range v {
		if math.IsNaN(n) || math.IsInf(n, 0) {
			return false
		}
	}
	return true
}

func validStateID(id string) bool {
	return len(id) > 0 && len(id) <= 128 && utf8.ValidString(id)
}

func validPlayerState(p RoomPlayerState) bool {
	return p.MaxHP > 0 && p.MaxHP <= 1_000_000 && p.HP >= 0 && p.HP <= p.MaxHP &&
		finite(p.X, p.Y, p.VX, p.VY, p.FaceX, p.FaceY, p.WalkTime,
			p.AttackTime, p.AttackCooldownTimer, p.HurtTime, p.Invulnerable,
			p.KnockX, p.KnockY) &&
		math.Abs(p.X) <= 1_000_000 && math.Abs(p.Y) <= 1_000_000 &&
		p.WalkTime >= 0 && p.AttackTime >= 0 && p.AttackCooldownTimer >= 0 &&
		p.HurtTime >= 0 && p.Invulnerable >= 0
}

func validMobState(m RoomMobState) bool {
	return validStateID(m.ID) && validMonsterKind(m.Kind) && m.HP > 0 &&
		m.HP <= monsterMaximumHP(m.Kind) &&
		finite(m.X, m.Y, m.HurtTime, m.ContactCooldown, m.Pulse, m.KnockX, m.KnockY) &&
		math.Abs(m.X) <= 1_000_000 && math.Abs(m.Y) <= 1_000_000 &&
		m.HurtTime >= 0 && m.ContactCooldown >= 0
}

func (s RoomState) validate() error {
	if s.Version != RoomStateVersion || !ValidRoom(s.RoomID) ||
		!finite(s.SpawnClock) || s.SpawnClock < 0 || s.SpawnClock > 1.55 ||
		len(s.Players) > maxRoomStatePlayers || len(s.Mobs) > MaxMobs ||
		len(s.Defeated) > maxRoomStateDefeated {
		return ErrRoomStateInvalid
	}
	reference := NewRoom(s.RoomID)
	if reference.Seed != s.Seed {
		return fmt.Errorf("%w: world seed mismatch", ErrRoomStateInvalid)
	}
	seen := make(map[string]struct{}, len(s.Players))
	for _, g := range s.Players {
		if !validStateID(g.ID) || len(g.Name) == 0 || len(g.Name) > 128 ||
			!utf8.ValidString(g.Name) || g.Kills < 0 ||
			!finite(g.Input.X, g.Input.Y) || math.Hypot(g.Input.X, g.Input.Y) > 1.05 ||
			!validPlayerState(g.Actor) {
			return fmt.Errorf("%w: invalid player", ErrRoomStateInvalid)
		}
		if _, ok := seen[g.ID]; ok {
			return fmt.Errorf("%w: duplicate player", ErrRoomStateInvalid)
		}
		seen[g.ID] = struct{}{}
	}
	seen = make(map[string]struct{}, len(s.Mobs))
	for _, m := range s.Mobs {
		if !validMobState(m) {
			return fmt.Errorf("%w: invalid monster", ErrRoomStateInvalid)
		}
		if _, ok := seen[m.ID]; ok {
			return fmt.Errorf("%w: duplicate monster", ErrRoomStateInvalid)
		}
		seen[m.ID] = struct{}{}
	}
	seen = make(map[string]struct{}, len(s.Defeated))
	for _, id := range s.Defeated {
		if !validStateID(id) {
			return fmt.Errorf("%w: invalid defeated ID", ErrRoomStateInvalid)
		}
		if _, ok := seen[id]; ok {
			return fmt.Errorf("%w: duplicate defeated monster", ErrRoomStateInvalid)
		}
		seen[id] = struct{}{}
	}
	return nil
}

func playerState(p *Player) RoomPlayerState {
	return RoomPlayerState{
		X: p.X, Y: p.Y, HP: p.HP, MaxHP: p.MaxHP, VX: p.VX, VY: p.VY,
		FaceX: p.FaceX, FaceY: p.FaceY, WalkTime: p.WalkTime,
		AttackTime: p.AttackTime, AttackCooldownTimer: p.AttackCooldownTimer,
		HurtTime: p.HurtTime, Invulnerable: p.invulnerable,
		KnockX: p.knockX, KnockY: p.knockY, StrikePending: p.strikePending,
	}
}

func (p RoomPlayerState) restore() *Player {
	return &Player{
		X: p.X, Y: p.Y, HP: p.HP, MaxHP: p.MaxHP, VX: p.VX, VY: p.VY,
		FaceX: p.FaceX, FaceY: p.FaceY, WalkTime: p.WalkTime,
		AttackTime: p.AttackTime, AttackCooldownTimer: p.AttackCooldownTimer,
		HurtTime: p.HurtTime, invulnerable: p.Invulnerable,
		knockX: p.KnockX, knockY: p.KnockY, strikePending: p.StrikePending,
	}
}

// ExportState serializes the live authoritative gameplay state. No mutable
// pointers escape and no Go or Rust ownership is transferred. The caller MUST
// hold the room's tick lock, and stop new inputs during capture.
func (r *Room) ExportState() ([]byte, error) {
	if r == nil {
		return nil, ErrRoomStateInvalid
	}
	if len(r.guestOrder) != len(r.Guests) ||
		len(r.mobOrder) != len(r.mobs) ||
		len(r.defeatedOrder) != len(r.defeated) {
		return nil, ErrRoomStateInvalid
	}
	s := RoomState{Version: RoomStateVersion, RoomID: r.ID, Seed: r.Seed,
		SpawnClock: r.spawnClock,
		Players:    make([]RoomGuestState, 0, len(r.guestsInOrder())),
		Mobs:       make([]RoomMobState, 0, len(r.mobs)),
		Defeated:   append([]string{}, r.defeatedOrder...),
	}
	for _, id := range r.guestOrder {
		g := r.Guests[id]
		if g == nil || g.Actor == nil {
			return nil, ErrRoomStateInvalid
		}
		s.Players = append(s.Players, RoomGuestState{ID: g.ID, Name: g.Name,
			Actor: playerState(g.Actor), Input: g.Input, AttackQueued: g.AttackQueued,
			LastInputAt: g.LastInputAt, Kills: g.Kills})
		if g.ID != id {
			return nil, ErrRoomStateInvalid
		}
	}
	for _, id := range r.mobOrder {
		m := r.mobs[id]
		if m == nil || m.ID != id {
			return nil, ErrRoomStateInvalid
		}
		s.Mobs = append(s.Mobs, RoomMobState{
			Kind: m.Kind, ID: m.ID, X: m.X, Y: m.Y, HP: m.HP,
			HurtTime: m.HurtTime, ContactCooldown: m.ContactCooldown,
			Pulse: m.pulse, KnockX: m.knockX, KnockY: m.knockY,
		})
	}
	if err := s.validate(); err != nil {
		return nil, err
	}
	data, err := json.Marshal(s)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrRoomStateInvalid, err)
	}
	if len(data) > MaxRoomStateBytes {
		return nil, ErrRoomStateInvalid
	}
	return data, nil
}

// RestoreRoomState validates the ENTIRE decoded state before constructing a
// new independent room. It never mutates an active room in place, never
// restores sockets, and never copies Rust native handles across processes.
func RestoreRoomState(data []byte) (*Room, error) {
	if len(data) == 0 || len(data) > MaxRoomStateBytes {
		return nil, ErrRoomStateInvalid
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	var s RoomState
	if err := dec.Decode(&s); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrRoomStateInvalid, err)
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		return nil, ErrRoomStateInvalid
	}
	if err := s.validate(); err != nil {
		return nil, err
	}
	r := NewRoom(s.RoomID)
	r.spawnClock = s.SpawnClock
	for _, p := range s.Players {
		r.Guests[p.ID] = &Guest{ID: p.ID, Name: p.Name, Actor: p.Actor.restore(),
			Input: p.Input, AttackQueued: p.AttackQueued,
			LastInputAt: p.LastInputAt, Kills: p.Kills}
		r.guestOrder = append(r.guestOrder, p.ID)
	}
	for _, m := range s.Mobs {
		r.mobs[m.ID] = &Slime{Kind: m.Kind, ID: m.ID, X: m.X, Y: m.Y, HP: m.HP,
			HurtTime: m.HurtTime, ContactCooldown: m.ContactCooldown,
			pulse: m.Pulse, knockX: m.KnockX, knockY: m.KnockY}
		r.mobOrder = append(r.mobOrder, m.ID)
	}
	for _, id := range s.Defeated {
		r.defeated[id] = true
		r.defeatedOrder = append(r.defeatedOrder, id)
	}
	return r, nil
}
