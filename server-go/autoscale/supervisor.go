package autoscale

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
)

var ErrUnmanagedWorker = errors.New("worker does not belong to this supervisor")
var ErrSupervisorBusy = errors.New("worker has active WebSocket sessions")
var ErrSupervisorExists = errors.New("worker has already been provisioned")

// WorkerRuntime encapsulates Docker's privileged operations. The public
// gateway must NEVER receive the runtime or the Docker socket.
type WorkerRuntime interface {
	Create(context.Context, string) (string, error)
	Start(context.Context, string, string) error
	ReadyBackend(context.Context, string, string) (cluster.Backend, error)
	StopAndRemove(context.Context, string, string) error
}

// WorkerDirectory is only allowed in the same trusted process (or via a
// future authenticated IPC channel). No HTTP admin route is installed.
type WorkerDirectory interface {
	Register(cluster.Backend) error
	SetReady(string, bool) error
	Drain(string) error
	Remove(string) error
	Snapshot() []cluster.WorkerStatus
}

type managedWorker struct {
	containerID      string
	directoryRemoved bool
}

// Supervisor coordinates exactly ONE worker transition at a time. Its
// temporary map is NOT durable after restart. No automatic reconciliation,
// daemon, Docker access or production activation is wired in this package.
type Supervisor struct {
	mu            sync.Mutex
	runtime       WorkerRuntime
	directory     WorkerDirectory
	managed       map[string]*managedWorker
	readyAttempts int
	readyInterval time.Duration
}

func NewSupervisor(runtime WorkerRuntime, directory WorkerDirectory) *Supervisor {
	return &Supervisor{runtime: runtime, directory: directory, managed: make(map[string]*managedWorker),
		readyAttempts: 15, readyInterval: 200 * time.Millisecond}
}

// ProvisionOne performs create -> start -> Docker health -> gateway register
// -> ready. Until SetReady succeeds, no new player can reach the new worker.
func (s *Supervisor) ProvisionOne(ctx context.Context, id string) error {
	if s == nil || s.runtime == nil || s.directory == nil || !workerIDPattern.MatchString(id) {
		return ErrDockerConfig
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.managed[id]; exists {
		return ErrSupervisorExists
	}
	for _, w := range s.directory.Snapshot() {
		if w.ID == id {
			return ErrSupervisorExists
		}
	}
	cid, err := s.runtime.Create(ctx, id)
	if err != nil {
		return err
	}
	// Only cleanup containers created in this call. Failure to cleanup is
	// surfaced, never interpreted as a successful start.
	cleanup := func(cause error) error {
		stopCtx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
		defer cancel()
		if closeErr := s.runtime.StopAndRemove(stopCtx, id, cid); closeErr != nil {
			return fmt.Errorf("%v; orphan cleanup failed: %w", cause, closeErr)
		}
		return cause
	}
	if err := s.runtime.Start(ctx, id, cid); err != nil {
		return cleanup(err)
	}
	attempts := s.readyAttempts
	if attempts < 1 {
		attempts = 1
	}
	var backend cluster.Backend
	for i := 0; i < attempts; i++ {
		backend, err = s.runtime.ReadyBackend(ctx, id, cid)
		if err == nil {
			break
		}
		if !errors.Is(err, ErrWorkerNotReady) {
			return cleanup(err)
		}
		if i+1 == attempts {
			return cleanup(ErrWorkerNotReady)
		}
		interval := s.readyInterval
		if interval <= 0 {
			interval = time.Millisecond
		}
		timer := time.NewTimer(interval)
		select {
		case <-ctx.Done():
			timer.Stop()
			return cleanup(ctx.Err())
		case <-timer.C:
		}
	}
	if backend.ID != id || backend.URL == nil {
		return cleanup(ErrDockerOwnership)
	}
	if err := s.directory.Register(backend); err != nil {
		return cleanup(err)
	}
	if err := s.directory.SetReady(id, true); err != nil {
		if drainErr := s.directory.Drain(id); drainErr != nil {
			return fmt.Errorf("failed to mark ready: %v; drain failed: %w", err, drainErr)
		}
		if removeErr := s.directory.Remove(id); removeErr != nil {
			return fmt.Errorf("failed to mark ready: %v; registry removal failed: %w", err, removeErr)
		}
		return cleanup(err)
	}
	s.managed[id] = &managedWorker{containerID: cid}
	return nil
}

// DrainOrStopOne first stops new admissions. Only on a later observation,
// with zero sessions AND zero rooms, does it remove the worker and container.
// A failed Docker removal retains the container ID for explicit retry.
func (s *Supervisor) DrainOrStopOne(ctx context.Context, id string) (bool, error) {
	if s == nil || s.runtime == nil || s.directory == nil || !workerIDPattern.MatchString(id) {
		return false, ErrDockerConfig
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	owned, ok := s.managed[id]
	if !ok {
		return false, ErrUnmanagedWorker
	}
	if !owned.directoryRemoved {
		found := false
		var state cluster.WorkerStatus
		for _, w := range s.directory.Snapshot() {
			if w.ID == id {
				state = w
				found = true
				break
			}
		}
		if !found {
			return false, ErrWorkerMissingState
		}
		if !state.Draining {
			if err := s.directory.Drain(id); err != nil {
				return false, err
			}
			return false, nil
		}
		if state.Clients != 0 || state.Rooms != 0 {
			return false, ErrSupervisorBusy
		}
		if err := s.directory.Remove(id); err != nil {
			return false, err
		}
		owned.directoryRemoved = true
	}
	if err := s.runtime.StopAndRemove(ctx, id, owned.containerID); err != nil {
		return false, err
	}
	delete(s.managed, id)
	return true, nil
}

var ErrWorkerMissingState = errors.New("managed worker missing from gateway directory")

// ManagedCount is local supervisor state, NOT the number of live containers
// after a supervisor restart.
func (s *Supervisor) ManagedCount() int {
	if s == nil {
		return 0
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.managed)
}
