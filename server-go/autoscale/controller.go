package autoscale

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
)

var (
	ErrTelemetryStale   = errors.New("host capacity telemetry is stale or from the future")
	ErrControllerConfig = errors.New("invalid autoscale controller configuration")
	ErrNoWorkerID       = errors.New("no available autoscale worker ID")
)

// HostSample must come from a trusted local collector that already excludes
// the OS, other projects, and reserved CPU/RAM. It is NOT collected by DockerDriver.
type HostSample struct {
	SampledAt     time.Time
	Queued        int
	FreeCPUMilli  int
	FreeMemoryMiB int
}

type HostObserver interface {
	Read(context.Context) (HostSample, error)
}

type ControllerConfig struct {
	Policy         Config
	MaxSampleAge   time.Duration
	LowLoadSamples int
}

func (c ControllerConfig) Validate() error {
	if err := c.Policy.Validate(); err != nil {
		return err
	}
	if c.MaxSampleAge <= 0 || c.MaxSampleAge > time.Minute || c.LowLoadSamples < 2 || c.LowLoadSamples > 100 {
		return ErrControllerConfig
	}
	return nil
}

type ReconcileResult struct {
	Plan      Plan
	Action    string
	WorkerID  string
	Completed bool
}

// Controller serializes planning and transitions in ONE trusted process.
// It never acts on client-controlled counts or exposes a public HTTP route.
// No default runtime, polling loop or Docker socket is enabled in the game.
type Controller struct {
	mu           sync.Mutex
	config       ControllerConfig
	observer     HostObserver
	supervisor   *Supervisor
	directory    WorkerDirectory
	lowSamples   int
	lastScaleOut time.Time
	lastProcessedSample time.Time
}

func NewController(config ControllerConfig, observer HostObserver, supervisor *Supervisor, directory WorkerDirectory) (*Controller, error) {
	if err := config.Validate(); err != nil {
		return nil, err
	}
	if observer == nil || supervisor == nil || directory == nil || supervisor.directory != directory {
		return nil, ErrControllerConfig
	}
	return &Controller{config: config, observer: observer, supervisor: supervisor, directory: directory}, nil
}

// Reconcile executes AT MOST ONE lifecycle transition per invocation.
// Metrics must be fresh and measured for the whole shared host. Its result is
// audit data only: the actual gateway and Docker are NOT wired to a daemon.
func (c *Controller) Reconcile(ctx context.Context, now time.Time) (ReconcileResult, error) {
	if c == nil {
		return ReconcileResult{}, ErrControllerConfig
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return ReconcileResult{}, err
	}
	if now.IsZero() {
		return ReconcileResult{}, ErrTelemetryStale
	}
	sample, err := c.observer.Read(ctx)
	if err != nil {
		return ReconcileResult{}, err
	}
	age := now.Sub(sample.SampledAt)
	if sample.SampledAt.IsZero() || age < 0 || age > c.config.MaxSampleAge {
		return ReconcileResult{}, ErrTelemetryStale
	}
	// Never spend the same CPU/RAM headroom twice when an observer repeats data.
	if !sample.SampledAt.After(c.lastProcessedSample) {
		return ReconcileResult{Action: "duplicate-sample"}, nil
	}
	live := c.directory.Snapshot()
	workers := make([]Worker, 0, len(live))
	for _, w := range live {
		workers = append(workers, Worker{ID: w.ID, Ready: w.Ready, Draining: w.Draining, Connected: w.Clients})
	}
	plan, err := Calculate(c.config.Policy, Observation{
		Workers: workers, Queued: sample.Queued, FreeCPUMilli: sample.FreeCPUMilli,
		FreeMemoryMiB: sample.FreeMemoryMiB, Now: now, LastScaleOut: c.lastScaleOut,
	})
	if err != nil {
		return ReconcileResult{}, err
	}
	c.lastProcessedSample = sample.SampledAt
	result := ReconcileResult{Plan: plan, Action: "none"}

	if plan.Start > 0 {
		c.lowSamples = 0
		id, err := c.nextWorkerID(live)
		if err != nil {
			return result, err
		}
		result.WorkerID = id
		result.Action = "start"
		if err := c.supervisor.ProvisionOne(ctx, id); err != nil {
			return result, fmt.Errorf("provision %s: %w", id, err)
		}
		c.lastScaleOut = now
		result.Completed = true
		return result, nil
	}
	if plan.RequestedWorkers >= plan.CurrentWorkers {
		c.lowSamples = 0
		return result, nil
	}
	if c.lowSamples < c.config.LowLoadSamples {
		c.lowSamples++
	}
	if c.lowSamples < c.config.LowLoadSamples {
		result.Action = "stabilizing"
		return result, nil
	}
	if len(plan.Stop) > 0 {
		result.WorkerID = plan.Stop[0]
		result.Action = "stop"
		stopped, err := c.supervisor.DrainOrStopOne(ctx, result.WorkerID)
		if err != nil {
			return result, err
		}
		result.Completed = stopped
		return result, nil
	}
	if len(plan.Drain) > 0 {
		result.WorkerID = plan.Drain[0]
		result.Action = "drain"
		_, err := c.supervisor.DrainOrStopOne(ctx, result.WorkerID)
		if err != nil {
			return result, err
		}
		result.Completed = true // admissions are closed, NOT the container stopped.
		return result, nil
	}
	return result, nil
}

func (c *Controller) nextWorkerID(live []cluster.WorkerStatus) (string, error) {
	taken := make(map[string]bool, len(live))
	for _, w := range live {
		taken[w.ID] = true
	}
	c.supervisor.mu.Lock()
	for id := range c.supervisor.managed {
		taken[id] = true
	}
	c.supervisor.mu.Unlock()
	for i := 1; i <= 9999; i++ {
		id := fmt.Sprintf("as-worker-%04d", i)
		if !taken[id] {
			return id, nil
		}
	}
	return "", ErrNoWorkerID
}

// Run is a library API for a FUTURE local controller executable. The current
// Terrania main binaries never call it, so there is no automatic provisioning.
// The callback handles errors; no unbounded retries are performed internally.
func (c *Controller) Run(ctx context.Context, interval time.Duration, onTick func(ReconcileResult, error)) error {
	if c == nil || interval < time.Second || interval > time.Hour {
		return ErrControllerConfig
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case now := <-ticker.C:
			result, err := c.Reconcile(ctx, now)
			if onTick != nil {
				onTick(result, err)
			}
		}
	}
}
