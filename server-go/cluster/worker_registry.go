package cluster

import (
	"errors"
	"fmt"
	"sort"
	"sync"
)

// WorkerRegistry is a SINGLE-GATEWAY, in-memory room-affinity directory.
// It does not discover containers, persist ownership or authorize a second gateway.
// Only trusted local supervisor code may mutate its membership; never expose
// Register/Drain/Remove as unauthenticated HTTP endpoints.
type WorkerRegistry struct {
	mu         sync.Mutex
	workers    map[string]*registryWorker
	rooms      map[string]*registryRoom
	maxClients int
	maxRooms   int
}

type registryWorker struct {
	backend  Backend
	ready    bool
	draining bool
	clients  int
	rooms    int
}
type registryRoom struct {
	workerID string
	sessions int
}

type WorkerStatus struct {
	ID       string
	Ready    bool
	Draining bool
	Clients  int
	Rooms    int
}

var (
	ErrRegistryInvalid         = errors.New("invalid worker registry configuration")
	ErrRegistryFull            = errors.New("worker registry is full")
	ErrNoWorkerCapacity        = errors.New("no ready worker has room and session capacity")
	ErrWorkerBusy              = errors.New("worker still owns active sessions or rooms")
	ErrWorkerNotDrained        = errors.New("worker must be draining before removal")
	ErrWorkerMissing           = errors.New("worker not registered")
	ErrWorkerAlreadyRegistered = errors.New("worker already registered")
)

func NewWorkerRegistry(maxClientsPerWorker, maxRoomsPerWorker int) (*WorkerRegistry, error) {
	if maxClientsPerWorker < 1 || maxClientsPerWorker > 10000 || maxRoomsPerWorker < 1 || maxRoomsPerWorker > 10000 {
		return nil, ErrRegistryInvalid
	}
	return &WorkerRegistry{
		workers:    make(map[string]*registryWorker),
		rooms:      make(map[string]*registryRoom),
		maxClients: maxClientsPerWorker,
		maxRooms:   maxRoomsPerWorker,
	}, nil
}

func NewWorkerRegistryFromRouter(router *Router, maxClientsPerWorker, maxRoomsPerWorker int) (*WorkerRegistry, error) {
	if router == nil {
		return nil, ErrRegistryInvalid
	}
	r, err := NewWorkerRegistry(maxClientsPerWorker, maxRoomsPerWorker)
	if err != nil {
		return nil, err
	}
	for _, backend := range router.Backends() {
		if err := r.Register(backend); err != nil {
			return nil, err
		}
	}
	return r, nil
}

// Register only admits a backend validated by the same URL and ID parser used
// by GO_SHARDS. The caller must have independently checked private-network
// reachability and readiness before making a new backend available to clients.
func (r *WorkerRegistry) Register(backend Backend) error {
	if r == nil || backend.URL == nil {
		return ErrRegistryInvalid
	}
	parsed, err := NewRouter(backend.ID + "=" + backend.URL.String())
	if err != nil {
		return fmt.Errorf("%w: %v", ErrRegistryInvalid, err)
	}
	backend = parsed.Backends()[0]
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.workers[backend.ID]; ok {
		return ErrWorkerAlreadyRegistered
	}
	if len(r.workers) >= 128 {
		return ErrRegistryFull
	}
	// A new worker stays unready until the supervisor explicitly confirms it.
	r.workers[backend.ID] = &registryWorker{backend: backend}
	return nil
}

func (r *WorkerRegistry) SetReady(id string, ready bool) error {
	if r == nil {
		return ErrRegistryInvalid
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	worker := r.workers[id]
	if worker == nil {
		return ErrWorkerMissing
	}
	if ready && worker.draining {
		return ErrWorkerNotDrained
	}
	worker.ready = ready
	return nil
}

// Drain blocks NEW WebSocket reservations, including reconnects to rooms on
// this worker. Existing connections remain bound until their normal release.
func (r *WorkerRegistry) Drain(id string) error {
	if r == nil {
		return ErrRegistryInvalid
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	worker := r.workers[id]
	if worker == nil {
		return ErrWorkerMissing
	}
	worker.draining = true
	return nil
}

// Remove must never delete an occupied worker: that would redirect active
// rooms to another authoritative process without a state handoff.
func (r *WorkerRegistry) Remove(id string) error {
	if r == nil {
		return ErrRegistryInvalid
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	worker := r.workers[id]
	if worker == nil {
		return ErrWorkerMissing
	}
	if !worker.draining {
		return ErrWorkerNotDrained
	}
	if worker.clients != 0 || worker.rooms != 0 {
		return ErrWorkerBusy
	}
	delete(r.workers, id)
	return nil
}

// Acquire reserves exactly one session on the chosen worker. A room with
// existing sessions NEVER moves as membership grows or shrinks. Calling the
// release closure repeatedly is safe.
func (r *WorkerRegistry) Acquire(room string) (Backend, func(), error) {
	if r == nil || room == "" {
		return Backend{}, nil, ErrRegistryInvalid
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	assigned := r.rooms[room]
	var chosen *registryWorker
	if assigned != nil {
		chosen = r.workers[assigned.workerID]
		if chosen == nil || !chosen.ready || chosen.draining || chosen.clients >= r.maxClients {
			return Backend{}, nil, ErrNoWorkerCapacity
		}
	} else {
		// Avoid the fixed rendezvous mapping of the legacy router: adding a
		// worker must not move an active room. New rooms prefer a worker with
		// fewer clients, then fewer rooms, then lexicographic ID.
		for _, candidate := range r.workers {
			if !candidate.ready || candidate.draining ||
				candidate.clients >= r.maxClients || candidate.rooms >= r.maxRooms {
				continue
			}
			if chosen == nil || candidate.clients < chosen.clients ||
				(candidate.clients == chosen.clients && candidate.rooms < chosen.rooms) ||
				(candidate.clients == chosen.clients && candidate.rooms == chosen.rooms && candidate.backend.ID < chosen.backend.ID) {
				chosen = candidate
			}
		}
		if chosen == nil {
			return Backend{}, nil, ErrNoWorkerCapacity
		}
		assigned = &registryRoom{workerID: chosen.backend.ID}
		r.rooms[room] = assigned
		chosen.rooms++
	}
	chosen.clients++
	assigned.sessions++
	var once sync.Once
	release := func() {
		once.Do(func() {
			r.mu.Lock()
			defer r.mu.Unlock()
			if assigned.sessions <= 0 || chosen.clients <= 0 {
				panic("cluster: worker registry session invariant violated")
			}
			assigned.sessions--
			chosen.clients--
			if assigned.sessions == 0 {
				delete(r.rooms, room)
				chosen.rooms--
			}
		})
	}
	return chosen.backend, release, nil
}

// Snapshot is a stable copy of currently observed directory occupancy.
// It is gateway-local, NOT a source of host RAM/CPU metrics.
func (r *WorkerRegistry) Snapshot() []WorkerStatus {
	if r == nil {
		return nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]WorkerStatus, 0, len(r.workers))
	for _, w := range r.workers {
		out = append(out, WorkerStatus{ID: w.backend.ID, Ready: w.ready, Draining: w.draining, Clients: w.clients, Rooms: w.rooms})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

func (r *WorkerRegistry) Count() int {
	if r == nil {
		return 0
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.workers)
}

func (r *WorkerRegistry) Backends() []Backend {
	if r == nil {
		return nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Backend, 0, len(r.workers))
	for _, w := range r.workers {
		out = append(out, w.backend)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}
