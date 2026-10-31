package cluster

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const (
	grantJournalVersion = 1
	maxGrantRecordBytes = 2048
	// Bound clock drift/transport jitter in the LAB, not an operational SLA.
	// Real deployments need measured clock discipline and consensus fencing.
	GrantPromotionGuard = 300 * time.Millisecond
)

var (
	ErrGrantConflict = errors.New("conflicting worker grant or stale epoch")
	ErrGrantNotReady = errors.New("worker not fenced or previous grant still within safety interval")
	ErrGrantRecovery = errors.New("coordinator restart requires offline grant reconciliation")
	ErrGrantStorage = errors.New("grant journal failure; coordinator fenced")
	ErrGrantCorrupt = errors.New("invalid or truncated grant journal")
)

type GrantStatus struct {
	Province Province
	WorkerID string
	Epoch uint64
	Sequence uint64
	Expiry time.Time
	Fenced bool
	RecoveryRequired bool
}

type grantState struct {
	WorkerID string
	BootID string
	Epoch uint64
	Sequence uint64
	IssuedAt int64
	ExpiresAt int64
	Fenced bool
	RecoveryRequired bool
}

type grantRecord struct {
	Version uint16
	Index uint64
	Province Province
	WorkerID string
	BootID string
	Epoch uint64
	Sequence uint64
	IssuedAt int64
	ExpiresAt int64
	Fenced bool
	SignerSHA256 string
}

// GrantCoordinator is an intentionally SINGLE-WRITER lab authority. Its local
// filesystem journal is NOT a distributed lock/lease or consensus service.
// No endpoint is exposed, and no signing key is serialized to disk.
type GrantCoordinator struct {
	mu sync.Mutex
	file *os.File
	lockPath string
	key ed25519.PrivateKey
	signerHash string
	states map[Province]grantState
	index uint64
	faulted bool
}

// OpenGrantCoordinator creates a private append-only log. A second process on
// the same filesystem cannot open it while the .lock marker exists. If an
// unexpected crash leaves the marker, operator isolation is required before
// manually removing it. No shared-NFS or multi-VPS use is supported.
func OpenGrantCoordinator(path string,key ed25519.PrivateKey)(*GrantCoordinator,error){
	if !filepath.IsAbs(path)||len(key)!=ed25519.PrivateKeySize{
		return nil,ErrGrantStorage
	}
	info,err:=os.Lstat(path)
	if err==nil && (!info.Mode().IsRegular()||info.Mode().Perm()!=0600){
		return nil,ErrGrantStorage
	}
	if err!=nil&&!errors.Is(err,os.ErrNotExist){return nil,err}
	lockPath:=path+".lock"
	lock,err:=os.OpenFile(lockPath,os.O_WRONLY|os.O_CREATE|os.O_EXCL,0600)
	if err!=nil{return nil,fmt.Errorf("%w: journal locked: %v",ErrGrantStorage,err)}
	if err:=lock.Close();err!=nil{return nil,err}
	release:=func(){_ = os.Remove(lockPath)}
	f,err:=os.OpenFile(path,os.O_RDWR|os.O_CREATE,0600)
	if err!=nil{release();return nil,err}
	public:=key.Public().(ed25519.PublicKey)
	digest:=sha256.Sum256(public)
	c:=&GrantCoordinator{file:f,lockPath:lockPath,key:append(ed25519.PrivateKey(nil),key...),
		signerHash:hex.EncodeToString(digest[:]),states:make(map[Province]grantState)}
	if err:=c.replay();err!=nil{_ = f.Close();release();return nil,err}
	if _,err:=f.Seek(0,io.SeekEnd);err!=nil{_ = f.Close();release();return nil,err}
	return c,nil
}

func validGrantBootID(boot string)bool{
	raw,err:=hex.DecodeString(boot)
	return err==nil&&len(raw)==16&&hex.EncodeToString(raw)==boot
}

func (c *GrantCoordinator) replay()error{
	if _,err:=c.file.Seek(0,io.SeekStart);err!=nil{return err}
	for{
		var header [36]byte
		_,err:=io.ReadFull(c.file,header[:])
		if err==io.EOF{return nil}
		if err!=nil{return fmt.Errorf("%w: partial record header",ErrGrantCorrupt)}
		n:=binary.BigEndian.Uint32(header[:4])
		if n==0||n>maxGrantRecordBytes{return ErrGrantCorrupt}
		data:=make([]byte,int(n))
		if _,err:=io.ReadFull(c.file,data);err!=nil{return fmt.Errorf("%w: partial record body",ErrGrantCorrupt)}
		want:=sha256.Sum256(data)
		var stored [32]byte
		copy(stored[:],header[4:])
		if want!=stored{return fmt.Errorf("%w: checksum mismatch",ErrGrantCorrupt)}
		var r grantRecord
		if err:=json.Unmarshal(data,&r);err!=nil{return ErrGrantCorrupt}
		if r.Version!=grantJournalVersion||r.Index!=c.index+1||r.SignerSHA256!=c.signerHash||
			!validServiceID(r.WorkerID)||!validGrantBootID(r.BootID)||
			r.Epoch==0||r.Sequence==0||r.IssuedAt==0||r.ExpiresAt<=r.IssuedAt||
			r.ExpiresAt-r.IssuedAt>int64(MaxWorkerLease/time.Millisecond){
			return ErrGrantCorrupt
		}
		old,exists:=c.states[r.Province]
		switch {
		case !exists && (r.Epoch!=1||r.Sequence!=1||r.Fenced):
			return ErrGrantCorrupt
		case exists && r.Fenced:
			if old.Fenced||r.WorkerID!=old.WorkerID||r.BootID!=old.BootID||
				r.Epoch!=old.Epoch||r.Sequence!=old.Sequence||
				r.IssuedAt!=old.IssuedAt||r.ExpiresAt!=old.ExpiresAt {
				return ErrGrantCorrupt
			}
		case exists && r.Epoch==old.Epoch:
			if old.Fenced||r.WorkerID!=old.WorkerID||r.BootID!=old.BootID||
				r.Sequence!=old.Sequence+1||r.ExpiresAt<old.ExpiresAt||
				r.IssuedAt>old.ExpiresAt {
				return ErrGrantCorrupt
			}
		case exists && r.Epoch==old.Epoch+1:
			if !old.Fenced||old.Epoch==^uint64(0)||r.Sequence!=1||
				r.IssuedAt<=old.ExpiresAt+int64(GrantPromotionGuard/time.Millisecond){
				return ErrGrantCorrupt
			}
		default:
			return ErrGrantCorrupt
		}
		c.states[r.Province]=grantState{
			WorkerID:r.WorkerID,BootID:r.BootID,Epoch:r.Epoch,
			Sequence:r.Sequence,IssuedAt:r.IssuedAt,ExpiresAt:r.ExpiresAt,
			Fenced:r.Fenced,RecoveryRequired:true, // fail CLOSED on restart
		}
		c.index=r.Index
	}
}

func (c *GrantCoordinator) appendLocked(p Province,s grantState)error{
	if c.faulted||c.file==nil{return ErrGrantStorage}
	if c.index==^uint64(0){c.faulted=true;return ErrGrantStorage}
	r:=grantRecord{Version:grantJournalVersion,Index:c.index+1,Province:p,
		WorkerID:s.WorkerID,BootID:s.BootID,Epoch:s.Epoch,Sequence:s.Sequence,
		IssuedAt:s.IssuedAt,ExpiresAt:s.ExpiresAt,Fenced:s.Fenced,SignerSHA256:c.signerHash}
	data,err:=json.Marshal(r)
	if err!=nil||len(data)==0||len(data)>maxGrantRecordBytes{
		c.faulted=true
		return ErrGrantStorage
	}
	var header [36]byte
	binary.BigEndian.PutUint32(header[:4],uint32(len(data)))
	sum:=sha256.Sum256(data)
	copy(header[4:],sum[:])
	if n,err:=c.file.Write(header[:]);err!=nil||n!=len(header){
		c.faulted=true
		return ErrGrantStorage
	}
	if n,err:=c.file.Write(data);err!=nil||n!=len(data){
		c.faulted=true
		return ErrGrantStorage
	}
	if err:=c.file.Sync();err!=nil{
		c.faulted=true
		return ErrGrantStorage
	}
	c.index++
	c.states[p]=s
	return nil
}

func (c *GrantCoordinator) statusLocked(p Province)(GrantStatus,error){
	if c.faulted{return GrantStatus{},ErrGrantStorage}
	s,ok:=c.states[p]
	if !ok{return GrantStatus{},ErrRegionUnknown}
	return GrantStatus{
		Province:p,WorkerID:s.WorkerID,Epoch:s.Epoch,Sequence:s.Sequence,
		Expiry:time.UnixMilli(s.ExpiresAt),Fenced:s.Fenced,
		RecoveryRequired:s.RecoveryRequired,
	},nil
}

func (c *GrantCoordinator) Status(p Province)(GrantStatus,error){
	if c==nil{return GrantStatus{},ErrGrantStorage}
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.statusLocked(p)
}

func validGrantRequest(worker,boot string,ttl time.Duration)bool{
	return validServiceID(worker)&&validGrantBootID(boot)&&
		ttl>=200*time.Millisecond&&ttl<=MaxWorkerLease
}

func (c *GrantCoordinator) grantLocked(p Province,worker,boot string,ttl time.Duration,s grantState)(WorkerLeasePermit,error){
	now:=time.Now()
	// Rounding down to integer milliseconds avoids granting extra time.
	issued:=now.UnixMilli()
	expires:=issued+int64(ttl/time.Millisecond)
	if expires<=issued{return WorkerLeasePermit{},ErrWorkerLeaseInvalid}
	s.WorkerID=worker
	s.BootID=boot
	s.IssuedAt=issued
	s.ExpiresAt=expires
	s.Fenced=false
	s.RecoveryRequired=false
	if err:=c.appendLocked(p,s);err!=nil{return WorkerLeasePermit{},err}
	// Sign ONLY AFTER fsync. If signing fails, the durable entry still
	// reserves ownership; never issue a different grant as a fallback.
	return SignWorkerLease(c.key,WorkerLeasePermit{
		Province:p,WorkerID:worker,BootID:boot,Epoch:s.Epoch,
		Sequence:s.Sequence,IssuedAtUnixMS:issued,ExpiresAtUnixMS:expires,
	})
}

// GrantInitial durably reserves a previously unknown province at epoch 1.
// No concurrent/cross-process second grant can succeed in this coordinator.
func (c *GrantCoordinator) GrantInitial(p Province,worker,boot string,ttl time.Duration)(WorkerLeasePermit,error){
	if c==nil||!validGrantRequest(worker,boot,ttl){return WorkerLeasePermit{},ErrWorkerLeaseInvalid}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.faulted{return WorkerLeasePermit{},ErrGrantStorage}
	if _,exists:=c.states[p];exists{return WorkerLeasePermit{},ErrGrantConflict}
	return c.grantLocked(p,worker,boot,ttl,grantState{Epoch:1,Sequence:1})
}

// Renew is only allowed while the SAME process still has a current lease.
// A late or missed renewal cannot reanimate an expired worker.
func (c *GrantCoordinator) Renew(p Province,worker,boot string,epoch uint64,ttl time.Duration)(WorkerLeasePermit,error){
	if c==nil||!validGrantRequest(worker,boot,ttl){return WorkerLeasePermit{},ErrWorkerLeaseInvalid}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.faulted{return WorkerLeasePermit{},ErrGrantStorage}
	s,ok:=c.states[p]
	if !ok{return WorkerLeasePermit{},ErrRegionUnknown}
	if s.RecoveryRequired{return WorkerLeasePermit{},ErrGrantRecovery}
	if s.Fenced||s.WorkerID!=worker||s.BootID!=boot||s.Epoch!=epoch||
		s.Sequence==^uint64(0) {return WorkerLeasePermit{},ErrGrantConflict}
	if time.Now().UnixMilli()>=s.ExpiresAt-int64(leaseClockMargin/time.Millisecond){
		return WorkerLeasePermit{},ErrGrantNotReady
	}
	s.Sequence++
	return c.grantLocked(p,worker,boot,ttl,s)
}

// RevokeAndRecordFence contacts the actual worker's internal mTLS endpoint,
// waits for its in-flight ticks and validates the ACK before durably recording
// local fencing evidence. The caller must configure a pinned TLS peer/CA;
// a broken or unreachable worker is NOT marked fenced.
func (c *GrantCoordinator) RevokeAndRecordFence(ctx context.Context,client *http.Client,endpoint string,p Province)error{
	if c==nil{return ErrGrantStorage}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.faulted{return ErrGrantStorage}
	s,ok:=c.states[p]
	if !ok{return ErrRegionUnknown}
	if s.RecoveryRequired{return ErrGrantRecovery}
	if s.Fenced{return nil}
	command:=WorkerLeaseCommand{Action:"revoke",Province:p,WorkerID:s.WorkerID,
		BootID:s.BootID,Epoch:s.Epoch}
	ack,err:=SendWorkerLeaseCommand(ctx,client,endpoint,command)
	if err!=nil{return err}
	if ack.Action!="revoked"||ack.Sequence==0||ack.Sequence>s.Sequence ||
		ack.Province!=p||ack.WorkerID!=s.WorkerID||ack.BootID!=s.BootID||ack.Epoch!=s.Epoch {
		return ErrGrantConflict
	}
	s.Fenced=true
	return c.appendLocked(p,s)
}

// Promote requires BOTH a confirmed (and fsynced) remote revocation and
// expiration of the last issued permit + a guard interval. It never promotes
// on mere timeout. New epoch is monotonically previous +1.
// IMPORTANT: no distributed election, storage quorum or proof of remote OS
// isolation is provided; do not connect this to live production workers.
func (c *GrantCoordinator) Promote(p Province,worker,boot string,ttl time.Duration)(WorkerLeasePermit,error){
	if c==nil||!validGrantRequest(worker,boot,ttl){return WorkerLeasePermit{},ErrWorkerLeaseInvalid}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.faulted{return WorkerLeasePermit{},ErrGrantStorage}
	s,ok:=c.states[p]
	if !ok{return WorkerLeasePermit{},ErrRegionUnknown}
	if s.RecoveryRequired{return WorkerLeasePermit{},ErrGrantRecovery}
	if !s.Fenced||s.Epoch==^uint64(0) {return WorkerLeasePermit{},ErrGrantNotReady}
	// Conservative extra delay for clock and transport jitter.
	if time.Now().UnixMilli()<=s.ExpiresAt+int64(GrantPromotionGuard/time.Millisecond){
		return WorkerLeasePermit{},ErrGrantNotReady
	}
	if s.WorkerID==worker&&s.BootID==boot {return WorkerLeasePermit{},ErrGrantConflict}
	return c.grantLocked(p,worker,boot,ttl,grantState{Epoch:s.Epoch+1,Sequence:1})
}

// Close fences this process and removes its lock marker on a CLEAN shutdown.
// On unexpected termination the marker remains, requiring manual recovery.
func (c *GrantCoordinator) Close()error{
	if c==nil{return nil}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.file==nil{return nil}
	c.faulted=true
	err:=c.file.Close()
	if err!=nil{return err}
	c.file=nil
	return os.Remove(c.lockPath)
}
