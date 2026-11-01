// Package autoscale plans bounded horizontal worker scaling on ONE host.
// It does not access Docker or alter the live game's routing.
package autoscale

import (
	"errors"
	"fmt"
	"sort"
	"time"
)

// Config must reflect measured worker limits and the shared VPS CPU/RAM budget.
type Config struct {
	MinWorkers         int
	MaxWorkers         int
	SeatsPerWorker     int
	TargetPercent      int
	CPUMilliPerWorker  int
	MemoryMiBPerWorker int
	ScaleInCooldown    time.Duration
}

func (c Config) Validate() error {
	if c.MinWorkers < 1 || c.MaxWorkers < c.MinWorkers || c.MaxWorkers > 128 {
		return errors.New("workers must satisfy 1 <= min <= max <= 128 (gateway router limit)")
	}
	if c.SeatsPerWorker < 1 || c.SeatsPerWorker > 10000 || c.TargetPercent < 1 || c.TargetPercent > 95 {
		return errors.New("seats must be 1..10000 and target utilization 1..95 percent")
	}
	if c.CPUMilliPerWorker < 1 || c.MemoryMiBPerWorker < 1 || c.ScaleInCooldown < 0 {
		return errors.New("per-worker CPU/RAM must be positive and cooldown non-negative")
	}
	return nil
}

// Draining workers must receive no new sessions but retain existing ones.
type Worker struct {
	ID        string
	Connected int
	Ready     bool
	Draining  bool
}

// Host headroom excludes existing workers and other applications on this VPS.
type Observation struct {
	Workers       []Worker
	Queued        int
	FreeCPUMilli  int
	FreeMemoryMiB int
	Now           time.Time
	LastScaleOut  time.Time
}

// Plan is advice, NOT a Docker command. An external trusted controller must
// reconcile state, publish stable routes and verify draining before stopping.
type Plan struct {
	RequestedWorkers  int
	CurrentWorkers    int
	Start             int
	Drain             []string
	Stop              []string
	UnservedAtHardCap int
	LimitedByHost     bool
	Reason            string
}

func ceilDiv(n, d int) int { return n/d + boolToInt(n%d != 0) }
func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// Calculate is deterministic and does not mutate its input.
func Calculate(c Config, o Observation) (Plan, error) {
	if err := c.Validate(); err != nil {
		return Plan{}, err
	}
	if o.Queued < 0 || o.FreeCPUMilli < 0 || o.FreeMemoryMiB < 0 || o.Now.IsZero() {
		return Plan{}, errors.New("invalid demand, host headroom or observation timestamp")
	}
	seen := make(map[string]bool, len(o.Workers))
	connected := 0
	for _, w := range o.Workers {
		if w.ID == "" || seen[w.ID] || w.Connected < 0 || w.Connected > c.SeatsPerWorker || (w.Draining && !w.Ready) {
			return Plan{}, fmt.Errorf("invalid worker snapshot for %q", w.ID)
		}
		seen[w.ID] = true
		connected += w.Connected
	}
	if len(o.Workers) > c.MaxWorkers {
		return Plan{}, errors.New("observed worker count exceeds configured maximum")
	}
	if o.Queued > int(^uint(0)>>1)-connected {
		return Plan{}, errors.New("demand overflows int")
	}
	demand := connected + o.Queued
	targetSeats := max(1, c.SeatsPerWorker*c.TargetPercent/100)
	requested := max(c.MinWorkers, ceilDiv(demand, targetSeats))
	current := len(o.Workers)
	plan := Plan{RequestedWorkers: requested, CurrentWorkers: current}

	if requested > current {
		desiredExtra := requested - current
		hostExtra := min(o.FreeCPUMilli/c.CPUMilliPerWorker, o.FreeMemoryMiB/c.MemoryMiBPerWorker)
		plan.Start = max(0, min(desiredExtra, min(c.MaxWorkers-current, hostExtra)))
		plan.LimitedByHost = requested > current+plan.Start
		physicalSeats := (current + plan.Start) * c.SeatsPerWorker
		plan.UnservedAtHardCap = max(0, demand-physicalSeats)
		if plan.LimitedByHost {
			plan.Reason = "worker count or CPU/RAM ceiling; capacity requires a larger VPS or more hosts"
		} else {
			plan.Reason = "bounded scale-out"
		}
		return plan, nil
	}
	if requested == current {
		plan.Reason = "steady"
		return plan, nil
	}
	if !o.LastScaleOut.IsZero() && (o.Now.Before(o.LastScaleOut) || o.Now.Sub(o.LastScaleOut) < c.ScaleInCooldown) {
		plan.Reason = "scale-in cooldown"
		return plan, nil
	}
	// Stop only an ALREADY drained worker with zero sessions. Never kill players.
	drainedIdle := make([]string, 0)
	for _, w := range o.Workers {
		if w.Draining && w.Connected == 0 {
			drainedIdle = append(drainedIdle, w.ID)
		}
	}
	sort.Strings(drainedIdle)
	if len(drainedIdle) > 0 {
		plan.Stop = []string{drainedIdle[0]}
		plan.Reason = "drained, empty worker can be stopped"
		return plan, nil
	}
	// Only one new drain per observation; do not pile up migrations.
	for _, w := range o.Workers {
		if w.Draining {
			plan.Reason = "waiting for existing drained worker to become empty"
			return plan, nil
		}
	}
	candidates := make([]Worker, 0, len(o.Workers))
	for _, w := range o.Workers {
		if w.Ready {
			candidates = append(candidates, w)
		}
	}
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].Connected != candidates[j].Connected {
			return candidates[i].Connected < candidates[j].Connected
		}
		return candidates[i].ID < candidates[j].ID
	})
	if len(candidates) > 0 && current > c.MinWorkers {
		plan.Drain = []string{candidates[0].ID}
		plan.Reason = "stop new admissions; wait for sessions to finish"
		return plan, nil
	}
	plan.Reason = "waiting for workers to become ready"
	return plan, nil
}
