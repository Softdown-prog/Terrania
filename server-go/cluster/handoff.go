package cluster

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"sync"
	"time"
)

// This is a CONTROL-PLANE PROTOTYPE, not a distributed consensus service.
// Actual workers must check their fencing epoch on every authority transition.
// It has no network listener, persistence, gRPC, or game state serialization.
const HandoffTTL = 30 * time.Second

var (
	ErrRegionUnknown = errors.New("region not registered")
	ErrWorkerUnknown = errors.New("worker not registered")
	ErrRegionBusy = errors.New("region transfer already pending")
	ErrStaleOwner = errors.New("stale region owner or epoch")
	ErrHandoffInvalid = errors.New("invalid transfer ticket")
	ErrHandoffExpired = errors.New("transfer deadline passed")
	ErrHandoffNotReady = errors.New("transfer missing destination staging or source quiescence")
)

type Ownership struct {
	Province Province
	WorkerID string
	Epoch uint64
	Phase string // active, preparing, quiesced (quiesced has NO writer)
}

type TransferTicket struct {
	Province Province
	From string
	To string
	OldEpoch uint64
	NewEpoch uint64
	Digest [32]byte // Hash of serialized snapshot, never the snapshot itself.
	ExpiresAt time.Time
	Token string // Random 128-bit nonce; NEVER log or expose to clients.
}

type pendingTransfer struct {
	ticket TransferTicket
	staged bool
	quiesced bool
}

type regionState struct {
	owner string
	epoch uint64
	pending *pendingTransfer
	lastCommitted string
}

// RegionDirectory simulates a single trusted coordinator. A real multi-node
// deployment requires durable consensus/leases and authenticated worker RPC.
type RegionDirectory struct {
	mu sync.Mutex
	workers map[string]struct{}
	regions map[Province]*regionState
}

func NewRegionDirectory(router *Router) (*RegionDirectory, error) {
	if router == nil || router.Count() == 0 {
		return nil, errors.New("region directory requires a configured router")
	}
	d := &RegionDirectory{
		workers: make(map[string]struct{}, router.Count()),
		regions: make(map[Province]*regionState),
	}
	for _, b := range router.Backends() { d.workers[b.ID] = struct{}{} }
	return d, nil
}

func (d *RegionDirectory) validWorker(worker string) bool {
	_, ok := d.workers[worker]
	return ok
}

// Register binds a new province once. Re-registering to a different owner
// cannot silently bypass the transfer protocol.
func (d *RegionDirectory) Register(p Province, worker string) (Ownership, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if !d.validWorker(worker) { return Ownership{}, ErrWorkerUnknown }
	if s, ok := d.regions[p]; ok {
		if s.owner != worker { return Ownership{}, ErrStaleOwner }
		return ownership(p, s), nil
	}
	d.regions[p] = &regionState{owner: worker, epoch: 1}
	return ownership(p, d.regions[p]), nil
}

func ownership(p Province, s *regionState) Ownership {
	phase := "active"
	if s.pending != nil {
		phase = "preparing"
		if s.pending.quiesced { phase = "quiesced" }
	}
	return Ownership{Province:p,WorkerID:s.owner,Epoch:s.epoch,Phase:phase}
}

func (d *RegionDirectory) Status(p Province) (Ownership,error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	s,ok := d.regions[p];if !ok{return Ownership{},ErrRegionUnknown}
	return ownership(p,s),nil
}

// CanSimulate must be checked by the current owner before accepting work.
// After source quiescence, neither side is permitted to simulate until commit.
func (d *RegionDirectory) CanSimulate(p Province,worker string,epoch uint64) bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	s,ok := d.regions[p]
	return ok && s.owner==worker && s.epoch==epoch &&
		(s.pending==nil || !s.pending.quiesced)
}

// Begin reserves one move without changing authority. The destination must
// stage an exact digest match BEFORE the source can stop. Old epoch is fenced
// only when the transfer is committed or explicitly aborted.
func (d *RegionDirectory) Begin(p Province, from,to string, epoch uint64, digest [32]byte,now time.Time)(TransferTicket,error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	s,ok:=d.regions[p];if !ok{return TransferTicket{},ErrRegionUnknown}
	if !d.validWorker(from)||!d.validWorker(to){return TransferTicket{},ErrWorkerUnknown}
	if from==to||s.owner!=from||s.epoch!=epoch||s.epoch==math.MaxUint64{return TransferTicket{},ErrStaleOwner}
	if s.pending!=nil{return TransferTicket{},ErrRegionBusy}
	if digest==([32]byte{})||now.IsZero(){return TransferTicket{},ErrHandoffInvalid}
	var nonce [16]byte
	if _,err:=rand.Read(nonce[:]);err!=nil{return TransferTicket{},fmt.Errorf("handoff nonce: %w",err)}
	t:=TransferTicket{Province:p,From:from,To:to,OldEpoch:epoch,
		NewEpoch:epoch+1,Digest:digest,ExpiresAt:now.Add(HandoffTTL),
		Token:hex.EncodeToString(nonce[:])}
	s.pending=&pendingTransfer{ticket:t}
	return t,nil
}

func validTicket(s *regionState,t TransferTicket,now time.Time)error{
	if s.pending==nil{return ErrHandoffInvalid}
	p:=s.pending.ticket
	if len(t.Token)!=32||subtle.ConstantTimeCompare([]byte(t.Token),[]byte(p.Token))!=1 ||
		p.Province!=t.Province||p.From!=t.From||p.To!=t.To||
		p.OldEpoch!=t.OldEpoch||p.NewEpoch!=t.NewEpoch||
		p.Digest!=t.Digest||!p.ExpiresAt.Equal(t.ExpiresAt) {
		return ErrHandoffInvalid
	}
	if now.After(p.ExpiresAt){return ErrHandoffExpired}
	return nil
}

// StageDestination records that an inactive destination loaded a complete
// snapshot whose SHA-256 matches the ticket. It is still NOT authoritative.
func (d *RegionDirectory) StageDestination(t TransferTicket,digest [32]byte,now time.Time)error {
	d.mu.Lock()
	defer d.mu.Unlock()
	s,ok:=d.regions[t.Province];if !ok{return ErrRegionUnknown}
	if err:=validTicket(s,t,now);err!=nil{return err}
	if digest!=t.Digest{return ErrHandoffInvalid}
	s.pending.staged=true
	return nil
}

// QuiesceSource is an explicit acknowledgement from the OLD worker after it
// stops its simulation. The directory then rejects both epochs until commit.
func (d *RegionDirectory) QuiesceSource(t TransferTicket,now time.Time)error {
	d.mu.Lock()
	defer d.mu.Unlock()
	s,ok:=d.regions[t.Province];if !ok{return ErrRegionUnknown}
	if err:=validTicket(s,t,now);err!=nil{return err}
	if !s.pending.staged{return ErrHandoffNotReady}
	s.pending.quiesced=true
	return nil
}

// Commit activates the new owner only after staging and quiescence. Retrying
// the last commit is harmless while no newer transfer is underway.
func (d *RegionDirectory) Commit(t TransferTicket,now time.Time)(Ownership,error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	s,ok:=d.regions[t.Province];if !ok{return Ownership{},ErrRegionUnknown}
	if s.pending==nil && s.lastCommitted==t.Token && t.To==s.owner && t.NewEpoch==s.epoch {
		return ownership(t.Province,s),nil
	}
	if err:=validTicket(s,t,now);err!=nil{return Ownership{},err}
	if !s.pending.staged||!s.pending.quiesced{return Ownership{},ErrHandoffNotReady}
	s.owner=t.To
	s.epoch=t.NewEpoch
	s.pending=nil
	s.lastCommitted=t.Token
	return ownership(t.Province,s),nil
}

// Abort explicitly recovers the original owner. The epoch is incremented even
// if the original worker never stopped; old in-flight commands stay fenced.
// No automatic abort on timeout: an operator/coordinator must reconcile first.
func (d *RegionDirectory) Abort(t TransferTicket)(Ownership,error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	s,ok:=d.regions[t.Province];if !ok{return Ownership{},ErrRegionUnknown}
	if s.pending==nil{return Ownership{},ErrHandoffInvalid}
	// An expired ticket may still be aborted explicitly for safe recovery.
	if err:=validTicket(s,t,t.ExpiresAt);err!=nil{return Ownership{},err}
	s.epoch=t.NewEpoch
	s.pending=nil
	s.lastCommitted=""
	return ownership(t.Province,s),nil
}
