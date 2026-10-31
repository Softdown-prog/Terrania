package cluster

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

const (
	MaxWorkerLease = 2 * time.Second
	leaseClockMargin = 50 * time.Millisecond
	leaseFutureTolerance = 150 * time.Millisecond
)

var (
	ErrWorkerLeaseInvalid = errors.New("worker lease signature, identity or sequence invalid")
	ErrWorkerLeaseExpired = errors.New("worker lease expired; simulation fenced")
	ErrWorkerLeaseRevoked = errors.New("worker lease revoked or worker closed")
)

// WorkerLeasePermit binds a trusted coordinator's signature to ONE worker
// process boot and one province/epoch. This is an opt-in lab protocol, not a
// distributed authority service: the coordinator MUST prevent overlapping
// leases for different workers using an external durable consensus system.
type WorkerLeasePermit struct {
	Province Province
	WorkerID string
	Epoch uint64
	BootID string
	Sequence uint64
	IssuedAtUnixMS int64
	ExpiresAtUnixMS int64
	SignatureHex string
}

type leasePayload struct {
	Domain string
	Province Province
	WorkerID string
	Epoch uint64
	BootID string
	Sequence uint64
	IssuedAtUnixMS int64
	ExpiresAtUnixMS int64
}

func (p WorkerLeasePermit) payload() ([]byte,error) {
	return json.Marshal(leasePayload{
		Domain:"terrania/worker-lease/v1",Province:p.Province,
		WorkerID:p.WorkerID,Epoch:p.Epoch,BootID:p.BootID,
		Sequence:p.Sequence,IssuedAtUnixMS:p.IssuedAtUnixMS,
		ExpiresAtUnixMS:p.ExpiresAtUnixMS,
	})
}

func validLeaseFields(p WorkerLeasePermit) bool {
	if p.WorkerID==""||len(p.WorkerID)>32||p.Epoch==0||
		p.Sequence==0||p.ExpiresAtUnixMS<=p.IssuedAtUnixMS {return false}
	boot,err:=hex.DecodeString(p.BootID)
	if err!=nil||len(boot)!=16||hex.EncodeToString(boot)!=p.BootID{return false}
	span:=p.ExpiresAtUnixMS-p.IssuedAtUnixMS
	return span>0&&span<=int64(MaxWorkerLease/time.Millisecond)
}

// SignWorkerLease builds an offline-test capability. Possession of this private
// key enables signing ANY region; production must keep signing in the elected,
// durable coordinator and never provide it to workers or user-facing services.
func SignWorkerLease(key ed25519.PrivateKey,p WorkerLeasePermit)(WorkerLeasePermit,error){
	p.SignatureHex=""
	if len(key)!=ed25519.PrivateKeySize||!validLeaseFields(p){return WorkerLeasePermit{},ErrWorkerLeaseInvalid}
	msg,err:=p.payload()
	if err!=nil{return WorkerLeasePermit{},err}
	p.SignatureHex=hex.EncodeToString(ed25519.Sign(key,msg))
	return p,nil
}

func verifyWorkerLease(key ed25519.PublicKey,p WorkerLeasePermit) bool {
	if len(key)!=ed25519.PublicKeySize||!validLeaseFields(p){return false}
	sig,err:=hex.DecodeString(p.SignatureHex)
	if err!=nil||len(sig)!=ed25519.SignatureSize{return false}
	msg,err:=p.payload()
	return err==nil&&ed25519.Verify(key,msg,sig)
}

// WorkerLeaseGate is intentionally worker-local, independent from
// RegionDirectory and its Go mutexes. All simulation mutations must pass
// through WithLease; a lost renewal shuts them off at the local deadline.
// Revocation acquires the exclusive gate and waits for prior mutations.
// It cannot preempt a stuck callback or prove remote process termination.
type WorkerLeaseGate struct {
	mu sync.RWMutex
	key ed25519.PublicKey
	worker string
	province Province
	bootID string
	epoch uint64
	sequence uint64
	deadline time.Time // locally monotonic, conservative relative to wall expiry
	initialized bool
	revoked bool
	closed bool
}

func NewWorkerLeaseGate(public ed25519.PublicKey,worker string,p Province)(*WorkerLeaseGate,error){
	if len(public)!=ed25519.PublicKeySize||worker==""||len(worker)>32 {return nil,ErrWorkerLeaseInvalid}
	var id [16]byte
	if _,err:=rand.Read(id[:]);err!=nil{return nil,fmt.Errorf("generate worker boot nonce: %w",err)}
	return &WorkerLeaseGate{
		key:append(ed25519.PublicKey(nil),public...),worker:worker,province:p,
		bootID:hex.EncodeToString(id[:]),
	},nil
}

// BootID is a nonsecret per-process challenge used to reject permits issued
// to a previous worker incarnation. Never reuse it after process restart.
func (g *WorkerLeaseGate) BootID()string{
	if g==nil{return ""}
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.bootID
}

func (g *WorkerLeaseGate) Install(p WorkerLeasePermit)error{
	if g==nil{return ErrWorkerLeaseInvalid}
	now:=time.Now()
	if p.WorkerID!=g.worker||p.Province!=g.province||p.BootID!=g.bootID||
		!verifyWorkerLease(g.key,p) {
		return ErrWorkerLeaseInvalid
	}
	issued:=time.UnixMilli(p.IssuedAtUnixMS)
	expires:=time.UnixMilli(p.ExpiresAtUnixMS)
	if issued.After(now.Add(leaseFutureTolerance))||!expires.After(now.Add(leaseClockMargin))||
		expires.Sub(now)>MaxWorkerLease+leaseFutureTolerance {
		return ErrWorkerLeaseExpired
	}
	// Conservative local monotonic expiry. A wall clock adjustment after
	// installation cannot lengthen a lease in a running process.
	remaining:=expires.Sub(now)-leaseClockMargin
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.closed||g.revoked{return ErrWorkerLeaseRevoked}
	if g.initialized {
		if p.Epoch!=g.epoch||p.Sequence<=g.sequence {
			return ErrWorkerLeaseInvalid
		}
		if !time.Now().Before(g.deadline){
			return ErrWorkerLeaseExpired // no silent resume after lease loss
		}
	}
	if remaining<=0{return ErrWorkerLeaseExpired}
	g.deadline=time.Now().Add(remaining)
	g.initialized=true
	g.epoch=p.Epoch
	g.sequence=p.Sequence
	return nil
}

func (g *WorkerLeaseGate) WithLease(fn func()error)error{
	if g==nil||fn==nil{return ErrWorkerLeaseInvalid}
	g.mu.RLock()
	defer g.mu.RUnlock()
	if g.closed||g.revoked{return ErrWorkerLeaseRevoked}
	if !g.initialized||!time.Now().Before(g.deadline){
		return ErrWorkerLeaseExpired
	}
	return fn()
}

// WorkerRevocationEvidence is only a LOCAL acknowledgment. It has no remote
// cryptographic proof, so a real coordinator must authenticate the revocation
// response over mTLS and ensure all old workers have stopped/expired before
// transferring authority. Never use this struct alone as proof of fencing.
type WorkerRevocationEvidence struct {
	Province Province
	WorkerID string
	Epoch uint64
	Sequence uint64
	BootID string
}

func (g *WorkerLeaseGate) Revoke()(WorkerRevocationEvidence,error){
	if g==nil{return WorkerRevocationEvidence{},ErrWorkerLeaseInvalid}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.closed{return WorkerRevocationEvidence{},ErrWorkerLeaseRevoked}
	g.revoked=true
	return WorkerRevocationEvidence{Province:g.province,WorkerID:g.worker,
		Epoch:g.epoch,Sequence:g.sequence,BootID:g.bootID},nil
}

func (g *WorkerLeaseGate) Close(){
	if g==nil{return}
	g.mu.Lock()
	defer g.mu.Unlock()
	g.closed=true
	g.revoked=true
}

// LeaseBoundRoom owns one Go room on a worker process without sharing a
// RegionDirectory. This is a LAB ADAPTER, not the production WebSocket loop.
type LeaseBoundRoom struct {
	mu sync.Mutex
	gate *WorkerLeaseGate
	room *engine.Room
	closed bool
}

func NewLeaseBoundRoom(g *WorkerLeaseGate,room *engine.Room)(*LeaseBoundRoom,error){
	if g==nil||room==nil{return nil,ErrRoomNotReady}
	return &LeaseBoundRoom{gate:g,room:room},nil
}

func (l *LeaseBoundRoom) apply(fn func(*engine.Room)error)error{
	if l==nil{return ErrRoomClosed}
	return l.gate.WithLease(func()error{
		l.mu.Lock()
		defer l.mu.Unlock()
		if l.closed{return ErrRoomClosed}
		return fn(l.room)
	})
}

func (l *LeaseBoundRoom) Tick(dt float64,now time.Time)error{
	return l.apply(func(r *engine.Room)error{r.Tick(dt,now);return nil})
}
func (l *LeaseBoundRoom) Input(id string,input engine.Input,now time.Time)error{
	return l.apply(func(r *engine.Room)error{
		if r.Guests[id]==nil{return errors.New("guest missing")}
		r.ReceiveInput(id,input,now)
		return nil
	})
}
func (l *LeaseBoundRoom) Join(id,name string)error{
	return l.apply(func(r *engine.Room)error{
		if id==""||name==""||len(r.Guests)>=12||r.Guests[id]!=nil{return ErrRoomNotReady}
		r.Add(id,name)
		return nil
	})
}
func (l *LeaseBoundRoom) SnapshotState()([]byte,error){
	var result []byte
	err:=l.apply(func(r *engine.Room)error{
		var e error
		result,e=r.ExportState()
		return e
	})
	return result,err
}
func (l *LeaseBoundRoom) Close(){
	if l==nil{return}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed{return}
	l.closed=true
	l.room.Close()
}
