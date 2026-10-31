package cluster

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

const (
	regionJournalVersion  = 1
	maxRegionJournalEntry = 4096
)

var (
	ErrRegionJournalCorrupt   = errors.New("region journal corrupt or incomplete")
	ErrRegionRecoveryRequired = errors.New("region requires offline reconciliation")
	ErrRegionStorageFailed    = errors.New("region journal write failed; coordinator fenced")
)

type journalPending struct {
	Ticket   TransferTicket
	Frozen   bool
	Staged   bool
	Quiesced bool
}

type journalEntry struct {
	Version       uint16
	Sequence      uint64
	Province      Province
	Owner         string
	Epoch         uint64
	Pending       *journalPending
	LastCommitted string
}

// regionJournal is a SINGLE-WRITER, append-only local persistence log. One
// frame is [4-byte big-endian length][32-byte SHA-256][JSON]. Each completed
// state transition is appended and fsynced BEFORE it becomes visible.
// This log is not replicated consensus and must never be mounted concurrently.
type regionJournal struct {
	file     *os.File
	lockPath string
	sequence uint64
}

func openRegionJournal(path string, d *RegionDirectory) (*regionJournal, error) {
	if !filepath.IsAbs(path) {
		return nil, errors.New("journal path must be absolute")
	}
	// Refuse symlinks and accessible files containing transfer nonces.
	info, err := os.Lstat(path)
	if err == nil {
		if !info.Mode().IsRegular() || info.Mode().Perm() != 0600 {
			return nil, errors.New("journal must be a regular file with mode 0600")
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	// The parent must be created by the caller. The exclusive lock marker
	// deliberately remains after a crash: removing it requires an operator
	// to prove no other process still owns this file. It is NOT distributed
	// fencing or a replicated lease.
	lockPath := path+".lock"
	lock, err := os.OpenFile(lockPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return nil, fmt.Errorf("journal already locked or lock unavailable: %w",err)
	}
	_ = lock.Close()
	release := func(){_ = os.Remove(lockPath)}
	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0600)
	if err != nil {
		release()
		return nil, err
	}
	j := &regionJournal{file: f,lockPath: lockPath}
	if err := j.replay(d); err != nil {
		_ = f.Close()
		release()
		return nil, err
	}
	if _, err = f.Seek(0, io.SeekEnd); err != nil {
		_ = f.Close()
		release()
		return nil, err
	}
	return j, nil
}

func validJournalEntry(d *RegionDirectory, e journalEntry) error {
	if e.Version != regionJournalVersion || e.Sequence == 0 || e.Epoch == 0 ||
		!d.validWorker(e.Owner) {
		return ErrRegionJournalCorrupt
	}
	if e.LastCommitted != "" {
		token, err := hex.DecodeString(e.LastCommitted)
		if err != nil || len(token) != 16 {
			return ErrRegionJournalCorrupt
		}
	}
	if e.Pending != nil {
		p := e.Pending
		t := p.Ticket
		token, err := hex.DecodeString(t.Token)
		if err != nil || len(token) != 16 ||
			t.Province != e.Province || t.From != e.Owner ||
			!d.validWorker(t.To) || t.From == t.To ||
			t.OldEpoch != e.Epoch || e.Epoch == ^uint64(0) || t.NewEpoch != e.Epoch+1 ||
			t.Digest == ([32]byte{}) || t.ExpiresAt.IsZero() ||
			(p.Quiesced && (!p.Frozen || !p.Staged)) ||
			(p.Staged && !p.Frozen) || e.LastCommitted != "" {
			return ErrRegionJournalCorrupt
		}
	}
	return nil
}

func (j *regionJournal) replay(d *RegionDirectory) error {
	if _, err := j.file.Seek(0, io.SeekStart); err != nil {
		return err
	}
	for {
		var head [36]byte
		_, err := io.ReadFull(j.file, head[:])
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return fmt.Errorf("%w: truncated header: %v", ErrRegionJournalCorrupt, err)
		}
		size := binary.BigEndian.Uint32(head[:4])
		if size == 0 || size > maxRegionJournalEntry {
			return fmt.Errorf("%w: entry size %d", ErrRegionJournalCorrupt, size)
		}
		body := make([]byte, int(size))
		if _, err = io.ReadFull(j.file, body); err != nil {
			return fmt.Errorf("%w: truncated body: %v", ErrRegionJournalCorrupt, err)
		}
		sum := sha256.Sum256(body)
		var stored [32]byte
		copy(stored[:], head[4:])
		if sum != stored {
			return fmt.Errorf("%w: checksum mismatch", ErrRegionJournalCorrupt)
		}
		var e journalEntry
		if err = json.Unmarshal(body, &e); err != nil {
			return fmt.Errorf("%w: invalid JSON", ErrRegionJournalCorrupt)
		}
		if e.Sequence != j.sequence+1 || validJournalEntry(d, e) != nil {
			return fmt.Errorf("%w: invalid journal entry or sequence", ErrRegionJournalCorrupt)
		}
		s := &regionState{owner: e.Owner, epoch: e.Epoch,
			lastCommitted: e.LastCommitted, recoveryRequired: true}
		if e.Pending != nil {
			p := e.Pending
			s.pending = &pendingTransfer{ticket: p.Ticket, frozen: p.Frozen, staged: p.Staged, quiesced: p.Quiesced}
		}
		d.regions[e.Province] = s
		j.sequence = e.Sequence
	}
}

func (j *regionJournal) append(p Province, s *regionState) error {
	if j.sequence == ^uint64(0) {
		return ErrRegionStorageFailed
	}
	e := journalEntry{Version: regionJournalVersion, Sequence: j.sequence + 1,
		Province: p, Owner: s.owner, Epoch: s.epoch, LastCommitted: s.lastCommitted}
	if s.pending != nil {
		e.Pending = &journalPending{Ticket: s.pending.ticket, Frozen: s.pending.frozen,
			Staged: s.pending.staged, Quiesced: s.pending.quiesced}
	}
	data, err := json.Marshal(e)
	if err != nil {
		return fmt.Errorf("%w: encode: %v", ErrRegionStorageFailed, err)
	}
	if len(data) == 0 || len(data) > maxRegionJournalEntry {
		return ErrRegionStorageFailed
	}
	var head [36]byte
	binary.BigEndian.PutUint32(head[:4], uint32(len(data)))
	sum := sha256.Sum256(data)
	copy(head[4:], sum[:])
	// If a write or Sync fails, RegionDirectory is faulted and must NOT
	// continue serving. A torn frame causes fail-closed on next startup.
	if _, err := j.file.Write(head[:]); err != nil {
		return fmt.Errorf("%w: header: %v", ErrRegionStorageFailed, err)
	}
	if _, err := j.file.Write(data); err != nil {
		return fmt.Errorf("%w: body: %v", ErrRegionStorageFailed, err)
	}
	if err := j.file.Sync(); err != nil {
		return fmt.Errorf("%w: fsync: %v", ErrRegionStorageFailed, err)
	}
	j.sequence++
	return nil
}

func (j *regionJournal) close() error {
	if err:=j.file.Close();err!=nil{return err}
	// Release only on deliberate clean close. A crash leaves the marker,
	// so a second process cannot casually claim recovered authority.
	return os.Remove(j.lockPath)
}

// NewPersistentRegionDirectory is deliberately NOT wired into gameplay.
// It replays durable region ownership and transfer phases, but ALL recovered
// regions are fenced ("recovery-required"). No region is auto-resumed after
// a process restart, even if the last journal entry says "active".
// Reconciliation against live workers and persisted snapshots is future work.
func NewPersistentRegionDirectory(router *Router, path string) (*RegionDirectory, error) {
	d, err := NewRegionDirectory(router)
	if err != nil {
		return nil, err
	}
	j, err := openRegionJournal(path, d)
	if err != nil {
		return nil, err
	}
	d.journal = j
	return d, nil
}

// Close fences the local coordinator, ensuring no future CanSimulate() result
// is true. Callers must stop all workers separately; this is not a lease.
func (d *RegionDirectory) Close() error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.faulted {
		if d.journal == nil {
			return nil
		}
		err := d.journal.close()
		d.journal = nil
		return err
	}
	d.faulted = true
	if d.journal == nil {
		return nil
	}
	err := d.journal.close()
	d.journal = nil
	return err
}

func (d *RegionDirectory) guardLocked(s *regionState) error {
	if d.faulted {
		return ErrRegionStorageFailed
	}
	if s != nil && s.recoveryRequired {
		return ErrRegionRecoveryRequired
	}
	return nil
}

// persistLocked must be called under the directory mutex BEFORE publication
// of a new state. Its failure fences the directory; never fall back to RAM.
func (d *RegionDirectory) persistLocked(p Province, s *regionState) error {
	if d.faulted {
		return ErrRegionStorageFailed
	}
	if d.journal == nil {
		return nil
	}
	if err := d.journal.append(p, s); err != nil {
		d.faulted = true
		return err
	}
	return nil
}

func cloneRegionState(s *regionState) *regionState {
	next := *s
	if s.pending != nil {
		p := *s.pending
		next.pending = &p
	}
	return &next
}
