package engine

import (
	"bytes"
	"encoding/json"
	"errors"
	"math"
	"reflect"
	"testing"
	"time"
)

func populatedRoomState(t *testing.T) *Room {
	t.Helper()
	r := NewRoom("origins")
	now := time.Unix(1_700_000_000, 345).UTC()
	for _, id := range []string{"z-player", "a-player", "m-player"} {
		g := r.Add(id, "Teste "+id)
		g.LastInputAt = now
		g.Input = Direction{X: .8, Y: .4}
		g.Kills = 5
	}
	g := r.Guests["z-player"]
	g.Actor.X, g.Actor.Y = 40, 60
	g.Actor.FaceX, g.Actor.FaceY = .8, .6
	g.Actor.VX, g.Actor.VY = 12, 7
	g.Actor.WalkTime = 17.5
	g.Actor.AttackTime = .16
	g.Actor.AttackCooldownTimer = .4
	g.Actor.HurtTime = .2
	g.Actor.invulnerable = .5
	g.Actor.knockX, g.Actor.knockY = 3, 4
	g.Actor.strikePending = true
	g.AttackQueued = true
	g.Actor.HP = 82
	r.spawnClock = .7
	for _, id := range []string{"older", "younger"} {
		m := NewSlime(id, 150, 180)
		m.HurtTime = .2
		m.ContactCooldown = .9
		m.pulse = 2.3
		m.knockX, m.knockY = 1, -3
		r.mobs[id] = m
		r.mobOrder = append(r.mobOrder, id)
	}
	for _, id := range []string{"dead-z", "dead-a"} {
		r.defeated[id] = true
		r.defeatedOrder = append(r.defeatedOrder, id)
	}
	return r
}

func TestRoomStateRoundTripFullGameplayAndDeterministicTick(t *testing.T) {
	original := populatedRoomState(t)
	defer original.Close()
	state, err := original.ExportState()
	if err != nil {
		t.Fatal(err)
	}
	clone, err := RestoreRoomState(state)
	if err != nil {
		t.Fatal(err)
	}
	defer clone.Close()
	result, err := clone.ExportState()
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(state, result) {
		t.Fatalf("state changed after restore:\n%s\n%s", state, result)
	}
	if !reflect.DeepEqual(original.guestOrder, clone.guestOrder) ||
		!reflect.DeepEqual(original.mobOrder, clone.mobOrder) ||
		!reflect.DeepEqual(original.defeatedOrder, clone.defeatedOrder) {
		t.Fatal("simulation insertion order changed")
	}
	if original.Guests["z-player"].Actor == clone.Guests["z-player"].Actor {
		t.Fatal("player pointer shared")
	}
	if original.mobs["older"] == clone.mobs["older"] {
		t.Fatal("monster pointer shared")
	}
	clone.Guests["z-player"].Actor.HP--
	if original.Guests["z-player"].Actor.HP != 82 {
		t.Fatal("clone mutated source")
	}
	clone.Guests["z-player"].Actor.HP++
	now := time.Unix(1_700_000_000, 345).Add(50 * time.Millisecond)
	for i := 0; i < 20; i++ {
		now = now.Add(50 * time.Millisecond)
		original.Tick(.05, now)
		clone.Tick(.05, now)
		first, err := original.ExportState()
		if err != nil {
			t.Fatal(err)
		}
		second, err := clone.ExportState()
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(first, second) {
			t.Fatalf("post-restore tick diverged at %d:\n%s\n%s", i, first, second)
		}
	}
}

func TestRoomStateRejectsMalformedAndForgedState(t *testing.T) {
	r := populatedRoomState(t)
	defer r.Close()
	good, err := r.ExportState()
	if err != nil {
		t.Fatal(err)
	}
	for _, raw := range [][]byte{
		nil, []byte("{}"), append(append([]byte(nil), good...), []byte("{}")...),
		append(append([]byte(nil), good...), []byte("\nfalse")...),
		bytes.Repeat([]byte("a"), MaxRoomStateBytes+1),
		bytes.Replace(good, []byte("\"RoomID\":\"origins\""), []byte("\"RoomID\":\"../../outside\""), 1),
		bytes.Replace(good, []byte("\"Version\":1"), []byte("\"Version\":9"), 1),
		bytes.Replace(good, []byte("\"SpawnClock\":0.7"), []byte("\"SpawnClock\":1e309"), 1),
	} {
		if room, err := RestoreRoomState(raw); !errors.Is(err, ErrRoomStateInvalid) || room != nil {
			t.Fatalf("accepted malformed room (%d bytes): %v", len(raw), err)
		}
	}
	tests := []struct {
		name  string
		alter func(*RoomState)
	}{
		{"different seed", func(s *RoomState) { s.Seed++ }},
		{"duplicate player", func(s *RoomState) { s.Players = append(s.Players, s.Players[0]) }},
		{"duplicate mob", func(s *RoomState) { s.Mobs = append(s.Mobs, s.Mobs[0]) }},
		{"duplicate defeated", func(s *RoomState) { s.Defeated = append(s.Defeated, s.Defeated[0]) }},
		{"invalid HP", func(s *RoomState) { s.Players[0].Actor.HP = -2 }},
		{"invalid cooldown", func(s *RoomState) { s.Players[0].Actor.Invulnerable = -1 }},
		{"invalid input", func(s *RoomState) { s.Players[0].Input.X = 10 }},
		{"invalid monster position", func(s *RoomState) { s.Mobs[0].X = 1_000_001 }},
		{"forged monster kind", func(s *RoomState) { s.Mobs[0].Kind = "dragon" }},
		{"negative kills", func(s *RoomState) { s.Players[0].Kills = -1 }},
		{"invalid room", func(s *RoomState) { s.RoomID = "ABC" }},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			var s RoomState
			if err := json.Unmarshal(good, &s); err != nil {
				t.Fatal(err)
			}
			test.alter(&s)
			data, err := json.Marshal(s)
			if err != nil {
				t.Fatal(err)
			}
			room, err := RestoreRoomState(data)
			if !errors.Is(err, ErrRoomStateInvalid) || room != nil {
				t.Fatalf("accepted bad state %v: %v", test.name, err)
			}
		})
	}
	if !bytes.Contains(good, []byte("\"StrikePending\":true")) {
		t.Fatal("snapshot omitted private attack state")
	}
}

func TestRoomStateExportRejectsCorruptRuntimeData(t *testing.T) {
	r := populatedRoomState(t)
	defer r.Close()
	r.Guests["z-player"].Actor.knockX = math.NaN()
	if data, err := r.ExportState(); !errors.Is(err, ErrRoomStateInvalid) || data != nil {
		t.Fatalf("exported nonfinite state: %v", err)
	}
	r.Guests["z-player"].Actor.knockX = 0
	r.guestOrder = append(r.guestOrder, r.guestOrder[0])
	if data, err := r.ExportState(); !errors.Is(err, ErrRoomStateInvalid) || data != nil {
		t.Fatalf("exported inconsistent insertion ordering: %v", err)
	}
}

// Mixed checkpoints keep species, health and order; legacy states omit Kind.
func TestRoomStateRoundTripMixedSpecies(t *testing.T) {
	r := NewRoom("origins")
	defer r.Close()
	r.Add("one", "Alice")
	r.Add("two", "Bob")
	for _, kind := range []MonsterKind{WolfKind, SpiderKind} {
		id := string(kind) + ":fixture"
		m := NewMonster(kind, id, 1400, 1200)
		m.HP--
		r.mobs[id] = m
		r.mobOrder = append(r.mobOrder, id)
	}
	data, err := r.ExportState()
	if err != nil { t.Fatal(err) }
	clone, err := RestoreRoomState(data)
	if err != nil { t.Fatal(err) }
	defer clone.Close()
	for _, id := range r.mobOrder {
		before, after := r.mobs[id], clone.mobs[id]
		if after == nil || after.Kind != before.Kind || after.HP != before.HP {
			t.Fatalf("lost monster species on room restore: %s", id)
		}
	}
	second, err := clone.ExportState()
	if err != nil || !bytes.Equal(data, second) { t.Fatalf("mixed checkpoint drift: %v", err) }
	legacy := NewRoom("origins")
	defer legacy.Close()
	legacy.Add("legacy", "Old")
	legacy.mobs["old"] = NewSlime("old", 1200, 1200)
	legacy.mobOrder = append(legacy.mobOrder, "old")
	raw, err := legacy.ExportState()
	if err != nil { t.Fatal(err) }
	if bytes.Contains(raw, []byte(`"Kind"`)) { t.Fatal("legacy schema changed") }
}
