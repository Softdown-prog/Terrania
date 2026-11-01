package autoscale

import (
	"math"
	"reflect"
	"testing"
	"time"
)

func config() Config {
	return Config{MinWorkers: 1, MaxWorkers: 4, SeatsPerWorker: 48, TargetPercent: 80,
		CPUMilliPerWorker: 500, MemoryMiBPerWorker: 256, ScaleInCooldown: 2 * time.Minute}
}
func when() time.Time { return time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC) }
func observe(ws []Worker, queued, cpu, mem int) Observation {
	return Observation{Workers: ws, Queued: queued, FreeCPUMilli: cpu, FreeMemoryMiB: mem, Now: when()}
}
func TestBurstIsBoundedBySameVPS(t *testing.T) {
	c := config()
	live := []Worker{{ID: "worker-1", Connected: 10, Ready: true}}
	cases := []struct {
		name                                                     string
		queued, cpu, ram, wantStart, wantRequested, wantUnserved int
		limited                                                  bool
	}{
		{"ten normal", 0, 1500, 768, 0, 1, 0, false},
		{"ninety", 80, 1500, 768, 2, 3, 0, false},
		{"ten thousand", 9990, 1500, 768, 3, 264, 9808, true},
		{"one million", 999990, 1500, 768, 3, 26316, 999808, true},
		{"no free RAM", 80, 1500, 0, 0, 3, 42, true},
		{"one spare CPU", 80, 500, 768, 1, 3, 0, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p, err := Calculate(c, observe(live, tc.queued, tc.cpu, tc.ram))
			if err != nil {
				t.Fatal(err)
			}
			if p.Start != tc.wantStart || p.RequestedWorkers != tc.wantRequested || p.UnservedAtHardCap != tc.wantUnserved || p.LimitedByHost != tc.limited {
				t.Fatalf("unexpected plan: %+v", p)
			}
		})
	}
}
func TestScaleInDrainsBeforeStopping(t *testing.T) {
	c := config()
	now := when()
	workers := []Worker{{ID: "worker-1", Connected: 10, Ready: true}, {ID: "worker-2", Ready: true}, {ID: "worker-3", Ready: true}}
	o := observe(workers, 0, 500, 256)
	p, err := Calculate(c, o)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(p.Drain, []string{"worker-2"}) || len(p.Stop) != 0 {
		t.Fatalf("must drain first: %+v", p)
	}
	workers[1].Draining = true
	workers[1].Connected = 1
	p, _ = Calculate(c, o)
	if len(p.Stop) != 0 || len(p.Drain) != 0 {
		t.Fatalf("must not kill occupied worker: %+v", p)
	}
	workers[1].Connected = 0
	p, _ = Calculate(c, o)
	if !reflect.DeepEqual(p.Stop, []string{"worker-2"}) {
		t.Fatalf("must stop empty drained worker: %+v", p)
	}
	o.LastScaleOut = now.Add(-time.Minute)
	p, _ = Calculate(c, o)
	if len(p.Stop) != 0 || len(p.Drain) != 0 {
		t.Fatal("cooldown must suppress scale-in")
	}
}
func TestNoChangeToInputAndOnlyOneDrain(t *testing.T) {
	c := config()
	ws := []Worker{{ID: "b", Connected: 5, Ready: true}, {ID: "a", Connected: 5, Ready: true}, {ID: "c", Connected: 5, Ready: true}}
	original := append([]Worker(nil), ws...)
	p, _ := Calculate(c, observe(ws, 0, 1000, 512))
	if !reflect.DeepEqual(p.Drain, []string{"a"}) {
		t.Fatalf("tie selection: %+v", p)
	}
	if !reflect.DeepEqual(original, ws) {
		t.Fatal("planner mutated observed workers")
	}
}
func TestSafeValidation(t *testing.T) {
	c := config()
	bad := []Observation{
		observe([]Worker{{ID: "x", Connected: 49, Ready: true}}, 0, 500, 256),
		observe([]Worker{{ID: "x", Connected: 1, Ready: true}, {ID: "x", Connected: 2, Ready: true}}, 0, 500, 256),
		observe(nil, -1, 500, 256),
		observe(nil, 0, -1, 256),
		observe([]Worker{{ID: "x", Draining: true}}, 0, 500, 256),
		observe([]Worker{{ID: "overflow", Connected: 1, Ready: true}}, math.MaxInt, 500, 256),
	}
	for i, o := range bad {
		if _, err := Calculate(c, o); err == nil {
			t.Errorf("invalid observation %d accepted", i)
		}
	}
	broken := c
	broken.MaxWorkers = 129
	if _, err := Calculate(broken, observe(nil, 0, 500, 256)); err == nil {
		t.Fatal("must match gateway 128 backend limit")
	}
	broken = c
	broken.TargetPercent = 0
	if _, err := Calculate(broken, observe(nil, 0, 500, 256)); err == nil {
		t.Fatal("invalid target")
	}
}
func TestColdStartAndZeroDemand(t *testing.T) {
	c := config()
	p, e := Calculate(c, observe(nil, 0, 1000, 1024))
	if e != nil {
		t.Fatal(e)
	}
	if p.Start != 1 || p.RequestedWorkers != 1 {
		t.Fatalf("min worker required: %+v", p)
	}
	p, e = Calculate(c, observe(nil, 0, 0, 0))
	if e != nil {
		t.Fatal(e)
	}
	if p.Start != 0 || !p.LimitedByHost {
		t.Fatalf("must not overcommit shared VPS: %+v", p)
	}
}
