package cluster

import (
	"errors"
	"sync"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

var (
	ErrRoomNotAuthoritative = errors.New("room lacks region authority or has stale epoch")
	ErrRoomNotReady         = errors.New("staged room cannot run before explicit activation")
	ErrRoomClosed           = errors.New("region room is closed")
)

func (d *RegionDirectory) gateForProvince(p Province) (*sync.RWMutex, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.faulted {
		return nil, ErrRegionStorageFailed
	}
	if _, ok := d.regions[p]; !ok {
		return nil, ErrRegionUnknown
	}
	g := d.gates[p]
	if g == nil {
		return nil, ErrRegionRecoveryRequired
	}
	return g, nil
}

// WithAuthority serializes a gameplay mutation against FreezeSource and Abort
// for this province. Only a local, single-process control plane is supported.
// Callback MUST NOT call gate-changing methods: it runs under the read gate.
// It is safe for OTHER provinces to execute concurrently.
func (d *RegionDirectory) WithAuthority(p Province, worker string, epoch uint64, fn func() error) error {
	if d == nil || fn == nil {
		return ErrRoomNotAuthoritative
	}
	g, err := d.gateForProvince(p)
	if err != nil {
		return err
	}
	g.RLock()
	defer g.RUnlock()
	d.mu.Lock()
	s, ok := d.regions[p]
	allowed := ok && !d.faulted && !s.recoveryRequired && s.owner == worker && s.epoch == epoch &&
		(s.pending == nil || !s.pending.frozen)
	d.mu.Unlock()
	if !allowed {
		return ErrRoomNotAuthoritative
	}
	return fn()
}

// CaptureAndFreeze holds the EXCLUSIVE province gate for both state capture
// and Begin + frozen journal publication. It avoids a race where a different
// local room updates a province after snapshot serialization but before freeze.
// It is NOT protection from remote workers lacking this same coordinator.
func (d *RegionDirectory) CaptureAndFreeze(p Province, from, to string, epoch uint64, now time.Time,
	capture func() (RegionSnapshot, error),
) (TransferTicket, RegionSnapshot, error) {
	if d == nil || capture == nil {
		return TransferTicket{}, RegionSnapshot{}, ErrSnapshotInvalid
	}
	g, err := d.gateForProvince(p)
	if err != nil {
		return TransferTicket{}, RegionSnapshot{}, err
	}
	g.Lock()
	defer g.Unlock()
	d.mu.Lock()
	s, ok := d.regions[p]
	allowed := ok && !d.faulted && !s.recoveryRequired && s.owner == from && s.epoch == epoch &&
		(s.pending == nil)
	d.mu.Unlock()
	if !allowed {
		return TransferTicket{}, RegionSnapshot{}, ErrRoomNotAuthoritative
	}
	snapshot, err := capture()
	if err != nil {
		return TransferTicket{}, RegionSnapshot{}, err
	}
	if err := snapshot.Validate(); err != nil {
		return TransferTicket{}, RegionSnapshot{}, err
	}
	if snapshot.Province != p || snapshot.OldEpoch != epoch {
		return TransferTicket{}, RegionSnapshot{}, ErrSnapshotInvalid
	}
	t, err := d.Begin(p, from, to, epoch, snapshot.Digest(), now)
	if err != nil {
		return TransferTicket{}, RegionSnapshot{}, err
	}
	// We already hold the gate. Calling FreezeSource here would deadlock.
	d.mu.Lock()
	s = d.regions[p]
	if err := d.guardLocked(s); err != nil {
		d.mu.Unlock()
		return t, RegionSnapshot{}, err
	}
	if err := validTicket(s, t, now); err != nil {
		d.mu.Unlock()
		return t, RegionSnapshot{}, err
	}
	next := cloneRegionState(s)
	next.pending.frozen = true
	err = d.persistLocked(p, next)
	if err == nil {
		d.regions[p] = next
	}
	d.mu.Unlock()
	if err != nil {
		return t, RegionSnapshot{}, err
	}
	return t, snapshot, nil
}

// GuardedRoom owns exactly ONE mutable engine.Room within one experimental
// province. It exposes no mutable engine pointers and locks every operation.
// Callers must transfer exclusive ownership of room into the constructor.
// This is a local simulator adapter, NOT cmd/terrania's live roomSession.
type GuardedRoom struct {
	mu       sync.Mutex
	dir      *RegionDirectory
	province Province
	worker   string
	epoch    uint64
	room     *engine.Room
	active   bool
	closed   bool
}

func NewGuardedRoom(d *RegionDirectory, p Province, worker string, epoch uint64, room *engine.Room) (*GuardedRoom, error) {
	if d == nil || room == nil || worker == "" || epoch == 0 {
		return nil, ErrRoomNotAuthoritative
	}
	if !d.CanSimulate(p, worker, epoch) {
		return nil, ErrRoomNotAuthoritative
	}
	return &GuardedRoom{dir: d, province: p, worker: worker, epoch: epoch, room: room, active: true}, nil
}

// NewStagedGuardedRoom validates the FULL snapshot and ticket while the source
// is frozen. The destination remains inactive until Activate() after Commit().
func NewStagedGuardedRoom(d *RegionDirectory, request RegionSnapshotRequest, worker string) (*GuardedRoom, error) {
	t, s := request.Ticket, request.Snapshot
	if d == nil || worker != t.To || s.Province != t.Province || s.OldEpoch != t.OldEpoch {
		return nil, ErrSnapshotInvalid
	}
	if err := s.Validate(); err != nil {
		return nil, err
	}
	if err := d.ValidateStaging(t, s.Digest(), time.Now()); err != nil {
		return nil, err
	}
	room, err := engine.RestoreRoomState(s.Payload)
	if err != nil {
		return nil, err
	}
	return &GuardedRoom{dir: d, province: t.Province, worker: worker, epoch: t.NewEpoch, room: room}, nil
}

// Activate may only succeed AFTER the coordinator commits the exact new epoch.
// It cannot bypass recovery-required or stale ownership.
func (g *GuardedRoom) Activate() error {
	if g == nil {
		return ErrRoomClosed
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.closed {
		return ErrRoomClosed
	}
	if !g.dir.CanSimulate(g.province, g.worker, g.epoch) {
		return ErrRoomNotAuthoritative
	}
	g.active = true
	return nil
}

func (g *GuardedRoom) withAuthority(fn func(*engine.Room) error) error {
	if g == nil {
		return ErrRoomClosed
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.closed {
		return ErrRoomClosed
	}
	if !g.active {
		return ErrRoomNotReady
	}
	return g.dir.WithAuthority(g.province, g.worker, g.epoch, func() error { return fn(g.room) })
}

func (g *GuardedRoom) Tick(dt float64, now time.Time) error {
	return g.withAuthority(func(room *engine.Room) error { room.Tick(dt, now); return nil })
}
func (g *GuardedRoom) Input(id string, input engine.Input, now time.Time) error {
	return g.withAuthority(func(room *engine.Room) error {
		if room.Guests[id] == nil {
			return errors.New("guest missing")
		}
		room.ReceiveInput(id, input, now)
		return nil
	})
}
func (g *GuardedRoom) Join(id, name string) error {
	return g.withAuthority(func(room *engine.Room) error {
		if len(room.Guests) >= 12 {
			return errors.New("room full")
		}
		if room.Guests[id] != nil {
			return errors.New("guest already present")
		}
		if id == "" || name == "" {
			return errors.New("invalid guest identity")
		}
		room.Add(id, name)
		return nil
	})
}
func (g *GuardedRoom) Leave(id string) error {
	return g.withAuthority(func(room *engine.Room) error { room.Remove(id); return nil })
}
func (g *GuardedRoom) StateFor(id string) (*engine.Snapshot, error) {
	var state *engine.Snapshot
	err := g.withAuthority(func(room *engine.Room) error {
		state = room.SnapshotFor(id)
		if state == nil {
			return errors.New("guest missing")
		}
		return nil
	})
	return state, err
}

// InspectState is a read-only snapshot of the current owned room even if it
// has been frozen. It never grants simulation authority or exposes pointers.
func (g *GuardedRoom) InspectState() ([]byte, error) {
	if g == nil {
		return nil, ErrRoomClosed
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.closed {
		return nil, ErrRoomClosed
	}
	return g.room.ExportState()
}

// PrepareHandoff runs capture + freeze under the same room lock and the
// province's exclusive gate. The origin is locally disarmed on ANY partial
// handoff (ticket exists), including a journal failure after Begin.
func (g *GuardedRoom) PrepareHandoff(to string, now time.Time, tick, sequence uint64) (RegionSnapshotRequest, error) {
	if g == nil {
		return RegionSnapshotRequest{}, ErrRoomClosed
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.closed {
		return RegionSnapshotRequest{}, ErrRoomClosed
	}
	if !g.active {
		return RegionSnapshotRequest{}, ErrRoomNotReady
	}
	t, s, err := g.dir.CaptureAndFreeze(g.province, g.worker, to, g.epoch, now, func() (RegionSnapshot, error) {
		payload, err := g.room.ExportState()
		if err != nil {
			return RegionSnapshot{}, err
		}
		return RegionSnapshot{Version: RegionSnapshotVersion, Province: g.province,
			OldEpoch: g.epoch, Tick: tick, Sequence: sequence, Payload: payload}, nil
	})
	if t.Token != "" {
		g.active = false
	}
	if err != nil {
		return RegionSnapshotRequest{}, err
	}
	return RegionSnapshotRequest{Ticket: t, Snapshot: s}, nil
}

// Close is idempotent. It only frees this process's engine resources.
// It does NOT release a distributed lease or attest remote worker shutdown.
func (g *GuardedRoom) Close() {
	if g == nil {
		return
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.closed {
		return
	}
	g.closed = true
	g.active = false
	g.room.Close()
}
