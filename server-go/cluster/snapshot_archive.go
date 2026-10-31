package cluster

import (
	"bytes"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
)

const (
	snapshotArchiveVersion = 1
	MaxArchivedRegionSnapshots = 128
)

var (
	ErrSnapshotArchiveInvalid = errors.New("invalid or corrupted archived snapshot")
	ErrSnapshotArchiveFull = errors.New("snapshot archive full; operator cleanup required")
	ErrSnapshotArchiveMissing = errors.New("archived snapshot not found")
)

type snapshotArchiveFrame struct {
	Version uint16
	Request RegionSnapshotRequest
}

// SnapshotArchive is an opt-in LOCAL, single-machine archive for region
// handoffs. Snapshots are immutable and keyed by (province, transfer token),
// so retries cannot overwrite prior snapshots or roll back an active region.
// Files are never automatically loaded into a running worker.
type SnapshotArchive struct {
	mu sync.Mutex
	dir string
}

func NewSnapshotArchive(dir string) (*SnapshotArchive,error) {
	if !filepath.IsAbs(dir) {return nil,errors.New("snapshot archive requires absolute directory")}
	if err:=os.Mkdir(dir,0700);err!=nil && !errors.Is(err,os.ErrExist) {return nil,err}
	info,err:=os.Lstat(dir)
	if err!=nil{return nil,err}
	if !info.IsDir()||info.Mode().Perm()!=0700 {return nil,errors.New("snapshot archive requires private 0700 directory without symlinks")}
	return &SnapshotArchive{dir:dir},nil
}

func validateArchiveRequest(req RegionSnapshotRequest) error {
	t,s:=req.Ticket,req.Snapshot
	if err:=s.Validate();err!=nil{return fmt.Errorf("%w: snapshot",ErrSnapshotArchiveInvalid)}
	if s.Province!=t.Province || s.OldEpoch!=t.OldEpoch ||
		t.NewEpoch!=t.OldEpoch+1 || t.OldEpoch==0 ||
		t.From=="" || t.To=="" || t.From==t.To || t.ExpiresAt.IsZero() {
		return ErrSnapshotArchiveInvalid
	}
	token,err:=hex.DecodeString(t.Token)
	if err!=nil || len(token)!=16 || hex.EncodeToString(token)!=t.Token {
		return ErrSnapshotArchiveInvalid
	}
	digest:=s.Digest()
	if subtle.ConstantTimeCompare(digest[:],t.Digest[:])!=1 {
		return ErrSnapshotArchiveInvalid
	}
	return nil
}

func (a *SnapshotArchive) filename(t TransferTicket) string {
	return filepath.Join(a.dir,fmt.Sprintf("region-%d-%d-%s.snap",t.Province.X,t.Province.Y,t.Token))
}

// SaveDurable acknowledges only after the immutable full frame and its
// directory entry are synced. A partial file remains invalid and blocks
// that ticket until a human investigates it (no silent repair/overwrite).
func (a *SnapshotArchive) SaveDurable(req RegionSnapshotRequest)error {
	if a==nil{return ErrSnapshotArchiveInvalid}
	if err:=validateArchiveRequest(req);err!=nil{return err}
	wire,err:=json.Marshal(snapshotArchiveFrame{Version:snapshotArchiveVersion,Request:req})
	if err!=nil{return fmt.Errorf("%w: marshal",ErrSnapshotArchiveInvalid)}
	if len(wire)>MaxRegionWireBytes{return ErrSnapshotTooLarge}

	a.mu.Lock()
	defer a.mu.Unlock()
	target:=a.filename(req.Ticket)
	if _,err:=os.Lstat(target);err==nil {
		prior,err:=a.readLocked(req.Ticket)
		if err!=nil{return err}
		old,err:=json.Marshal(snapshotArchiveFrame{Version:snapshotArchiveVersion,Request:prior})
		if err!=nil||!bytes.Equal(wire,old){return ErrSnapshotArchiveInvalid}
		return nil // exact idempotent retransmission
	}else if !errors.Is(err,os.ErrNotExist){return err}

	entries,err:=os.ReadDir(a.dir)
	if err!=nil{return err}
	if len(entries)>=MaxArchivedRegionSnapshots{return ErrSnapshotArchiveFull}
	f,err:=os.OpenFile(target,os.O_WRONLY|os.O_CREATE|os.O_EXCL,0600)
	if err!=nil{return err}
	// Intentionally do not unlink on write failures. A torn/unsynced entry
	// must never be silently treated as successfully restaged after restart.
	n,writeErr:=f.Write(wire)
	if writeErr==nil && n!=len(wire){writeErr=io.ErrShortWrite}
	if writeErr==nil {writeErr=f.Sync()}
	closeErr:=f.Close()
	if writeErr!=nil{return writeErr}
	if closeErr!=nil{return closeErr}
	parent,err:=os.Open(a.dir)
	if err!=nil{return err}
	syncErr:=parent.Sync()
	closeErr=parent.Close()
	if syncErr!=nil{return syncErr}
	return closeErr
}

func (a *SnapshotArchive) readLocked(t TransferTicket)(RegionSnapshotRequest,error){
	path:=a.filename(t)
	info,err:=os.Lstat(path)
	if errors.Is(err,os.ErrNotExist){return RegionSnapshotRequest{},ErrSnapshotArchiveMissing}
	if err!=nil{return RegionSnapshotRequest{},err}
	if !info.Mode().IsRegular()||info.Mode().Perm()!=0600||info.Size()>MaxRegionWireBytes || info.Size()<=0 {
		return RegionSnapshotRequest{},ErrSnapshotArchiveInvalid
	}
	f,err:=os.Open(path)
	if err!=nil{return RegionSnapshotRequest{},err}
	defer f.Close()
	dec:=json.NewDecoder(io.LimitReader(f,MaxRegionWireBytes+1))
	dec.DisallowUnknownFields()
	var frame snapshotArchiveFrame
	if err:=dec.Decode(&frame);err!=nil{return RegionSnapshotRequest{},ErrSnapshotArchiveInvalid}
	var extra any
	if err:=dec.Decode(&extra);err!=io.EOF || frame.Version!=snapshotArchiveVersion {
		return RegionSnapshotRequest{},ErrSnapshotArchiveInvalid
	}
	if err:=validateArchiveRequest(frame.Request);err!=nil{return RegionSnapshotRequest{},err}
	loaded:=frame.Request.Ticket
	if loaded.Province!=t.Province||loaded.Token!=t.Token||
		loaded.From!=t.From||loaded.To!=t.To||loaded.OldEpoch!=t.OldEpoch||
		loaded.NewEpoch!=t.NewEpoch||loaded.Digest!=t.Digest||
		!loaded.ExpiresAt.Equal(t.ExpiresAt) {
		return RegionSnapshotRequest{},ErrSnapshotArchiveInvalid
	}
	return frame.Request,nil
}

// LoadVerified is read-only, returns owned bytes, and NEVER unfreezes or
// activates a province. Requires a matching transfer ticket from the journal.
func (a *SnapshotArchive) LoadVerified(t TransferTicket)(RegionSnapshotRequest,error){
	if a==nil{return RegionSnapshotRequest{},ErrSnapshotArchiveInvalid}
	if _,err:=hex.DecodeString(t.Token);err!=nil || len(t.Token)!=32{
		return RegionSnapshotRequest{},ErrSnapshotArchiveInvalid
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.readLocked(t)
}
