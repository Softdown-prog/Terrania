package cluster

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/binary"
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
	replicaJournalVersion = 1
	replicaMaxRecordBytes = 2048
	MaxReplicaEntries     = 256
	zeroReplicaHash       = "0000000000000000000000000000000000000000000000000000000000000000"
)

var (
	ErrReplicaInvalid  = errors.New("invalid replication entry or receipt")
	ErrReplicaConflict = errors.New("replica rejected divergent index, hash, or obsolete leader term")
	ErrReplicaStorage  = errors.New("replica durable log unavailable; fail closed")
	ErrReplicaCorrupt  = errors.New("replica journal corrupt or truncated")
	ErrReplicaNoQuorum = errors.New("insufficient verified durable replica acknowledgments")
)

// AuthorityLogEntry contains ONLY a hash of a proposed operation, not player
// data or grant signing keys. No entry here can mutate GrantCoordinator.
type AuthorityLogEntry struct {
	ClusterID     string
	LeaderID      string
	Term          uint64
	Index         uint64
	PreviousHash  string
	Operation     string
	OperationHash string
}

type authorityEntryPayload struct {
	Domain string
	Entry  AuthorityLogEntry
}

func validSHA256Hex(v string) bool {
	raw, err := hex.DecodeString(v)
	return err == nil && len(raw) == sha256.Size && hex.EncodeToString(raw) == v
}

func (e AuthorityLogEntry) Validate() error {
	if !validServiceID(e.ClusterID) || !validServiceID(e.LeaderID) ||
		e.Term == 0 || e.Index == 0 || !validSHA256Hex(e.PreviousHash) ||
		!validSHA256Hex(e.OperationHash) {
		return ErrReplicaInvalid
	}
	switch e.Operation {
	case "grant", "renew", "revoke", "promote":
		return nil
	default:
		return ErrReplicaInvalid
	}
}

func (e AuthorityLogEntry) Digest() (string, error) {
	if err := e.Validate(); err != nil {
		return "", err
	}
	body, err := json.Marshal(authorityEntryPayload{Domain: "terrania/authority-log-entry/v1", Entry: e})
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:]), nil
}

// ReplicaReceipt is a signature over the exact stable log index + entry hash.
type ReplicaReceipt struct {
	ClusterID string
	MemberID  string
	Term      uint64
	Index     uint64
	EntryHash string
	Signature string
}

type replicaReceiptPayload struct {
	Domain    string
	ClusterID string
	MemberID  string
	Term      uint64
	Index     uint64
	EntryHash string
}

func (r ReplicaReceipt) payload() ([]byte, error) {
	return json.Marshal(replicaReceiptPayload{
		Domain: "terrania/authority-log-receipt/v1", ClusterID: r.ClusterID,
		MemberID: r.MemberID, Term: r.Term, Index: r.Index, EntryHash: r.EntryHash,
	})
}

type replicaRecord struct {
	Version      uint16
	Sequence     uint64
	ClusterID    string
	MemberID     string
	SignerHash   string
	Kind         string
	ObservedTerm uint64
	Entry        *AuthorityLogEntry
}

type ReplicaLog struct {
	mu         sync.Mutex
	file       *os.File
	lockPath   string
	cluster    string
	member     string
	signer     ed25519.PrivateKey
	signerHash string
	sequence   uint64
	highTerm   uint64
	entries    []AuthorityLogEntry
	faulted    bool
}

// OpenReplicaLog is an OFFLINE, private, single-process test store. It must not
// be mounted over shared storage, nor connected to the production gateway.
func OpenReplicaLog(path, cluster, member string, key ed25519.PrivateKey) (*ReplicaLog, error) {
	if !filepath.IsAbs(path) || !validServiceID(cluster) || !validServiceID(member) ||
		len(key) != ed25519.PrivateKeySize {
		return nil, ErrReplicaInvalid
	}
	if info, err := os.Lstat(path); err == nil {
		if !info.Mode().IsRegular() || info.Mode().Perm() != 0600 {
			return nil, ErrReplicaStorage
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	lockPath := path + ".lock"
	lock, err := os.OpenFile(lockPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return nil, fmt.Errorf("%w: exclusive writer: %v", ErrReplicaStorage, err)
	}
	if err := lock.Close(); err != nil {
		return nil, err
	}
	release := func() { _ = os.Remove(lockPath) }
	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0600)
	if err != nil {
		release()
		return nil, err
	}
	pub := key.Public().(ed25519.PublicKey)
	sum := sha256.Sum256(pub)
	log := &ReplicaLog{file: f, lockPath: lockPath, cluster: cluster, member: member,
		signer: append(ed25519.PrivateKey(nil), key...), signerHash: hex.EncodeToString(sum[:])}
	if err := log.replay(); err != nil {
		_ = f.Close()
		release()
		return nil, err
	}
	if _, err := f.Seek(0, io.SeekEnd); err != nil {
		_ = f.Close()
		release()
		return nil, err
	}
	return log, nil
}

func (l *ReplicaLog) validateTransition(r replicaRecord) error {
	if r.Version != replicaJournalVersion || r.Sequence != l.sequence+1 ||
		r.ClusterID != l.cluster || r.MemberID != l.member || r.SignerHash != l.signerHash ||
		r.ObservedTerm == 0 || r.ObservedTerm < l.highTerm {
		return ErrReplicaCorrupt
	}
	switch r.Kind {
	case "term":
		if r.Entry != nil || r.ObservedTerm <= l.highTerm {
			return ErrReplicaCorrupt
		}
	case "append":
		if r.Entry == nil || r.Entry.Validate() != nil || r.Entry.ClusterID != l.cluster ||
			r.Entry.Term != r.ObservedTerm || r.Entry.Index != uint64(len(l.entries))+1 ||
			len(l.entries) >= MaxReplicaEntries {
			return ErrReplicaCorrupt
		}
		if len(l.entries) == 0 {
			if r.Entry.PreviousHash != zeroReplicaHash {
				return ErrReplicaCorrupt
			}
		} else {
			hash, err := l.entries[len(l.entries)-1].Digest()
			if err != nil || hash != r.Entry.PreviousHash {
				return ErrReplicaCorrupt
			}
		}
	default:
		return ErrReplicaCorrupt
	}
	return nil
}

func (l *ReplicaLog) applyRecord(r replicaRecord) {
	l.sequence = r.Sequence
	l.highTerm = r.ObservedTerm
	if r.Entry != nil {
		l.entries = append(l.entries, *r.Entry)
	}
}

func (l *ReplicaLog) replay() error {
	if _, err := l.file.Seek(0, io.SeekStart); err != nil {
		return err
	}
	for {
		var header [36]byte
		_, err := io.ReadFull(l.file, header[:])
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return fmt.Errorf("%w: truncated header", ErrReplicaCorrupt)
		}
		n := binary.BigEndian.Uint32(header[:4])
		if n == 0 || n > replicaMaxRecordBytes {
			return ErrReplicaCorrupt
		}
		body := make([]byte, int(n))
		if _, err := io.ReadFull(l.file, body); err != nil {
			return fmt.Errorf("%w: truncated body", ErrReplicaCorrupt)
		}
		sum := sha256.Sum256(body)
		var expected [32]byte
		copy(expected[:], header[4:])
		if sum != expected {
			return fmt.Errorf("%w: checksum mismatch", ErrReplicaCorrupt)
		}
		var r replicaRecord
		if err := json.Unmarshal(body, &r); err != nil {
			return ErrReplicaCorrupt
		}
		if err := l.validateTransition(r); err != nil {
			return err
		}
		l.applyRecord(r)
	}
}

func (l *ReplicaLog) persistLocked(kind string, term uint64, entry *AuthorityLogEntry) error {
	if l.faulted || l.file == nil || l.sequence == ^uint64(0) {
		l.faulted = true
		return ErrReplicaStorage
	}
	r := replicaRecord{Version: replicaJournalVersion, Sequence: l.sequence + 1,
		ClusterID: l.cluster, MemberID: l.member, SignerHash: l.signerHash,
		Kind: kind, ObservedTerm: term, Entry: entry}
	body, err := json.Marshal(r)
	if err != nil || len(body) == 0 || len(body) > replicaMaxRecordBytes {
		l.faulted = true
		return ErrReplicaStorage
	}
	var header [36]byte
	binary.BigEndian.PutUint32(header[:4], uint32(len(body)))
	sum := sha256.Sum256(body)
	copy(header[4:], sum[:])
	if n, err := l.file.Write(header[:]); err != nil || n != len(header) {
		l.faulted = true
		return ErrReplicaStorage
	}
	if n, err := l.file.Write(body); err != nil || n != len(body) {
		l.faulted = true
		return ErrReplicaStorage
	}
	if err := l.file.Sync(); err != nil {
		l.faulted = true
		return ErrReplicaStorage
	}
	l.applyRecord(r)
	return nil
}

// ObserveLeaderTerm stores a higher term even without appending. A stale term
// cannot append after this durable observation; it remains unsafe to grant
// worker authority because election certs are not log-freshness checked.
func (l *ReplicaLog) ObserveLeaderTerm(term uint64) error {
	if l == nil || term == 0 {
		return ErrReplicaInvalid
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.faulted || l.file == nil {
		return ErrReplicaStorage
	}
	if term < l.highTerm {
		return ErrReplicaConflict
	}
	if term == l.highTerm {
		return nil
	}
	return l.persistLocked("term", term, nil)
}

func (l *ReplicaLog) receiptLocked(e AuthorityLogEntry) (ReplicaReceipt, error) {
	hash, err := e.Digest()
	if err != nil {
		return ReplicaReceipt{}, err
	}
	r := ReplicaReceipt{ClusterID: l.cluster, MemberID: l.member,
		Term: e.Term, Index: e.Index, EntryHash: hash}
	body, err := r.payload()
	if err != nil {
		return ReplicaReceipt{}, err
	}
	r.Signature = hex.EncodeToString(ed25519.Sign(l.signer, body))
	return r, nil
}

// AppendCandidate requires signed majority election votes and a strict
// contiguous hash chain. It NEVER truncates/overwrites a previous entry:
// divergence fails closed instead of pretending to implement Raft rollback.
func (l *ReplicaLog) AppendCandidate(roster ElectionRoster, cert ElectionCertificate, e AuthorityLogEntry) (ReplicaReceipt, error) {
	if l == nil || e.Validate() != nil || VerifyElectionCertificate(roster, cert) != nil ||
		cert.ClusterID != e.ClusterID || cert.CandidateID != e.LeaderID ||
		cert.Term != e.Term || roster.ClusterID != l.cluster {
		return ReplicaReceipt{}, ErrReplicaInvalid
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.faulted || l.file == nil {
		return ReplicaReceipt{}, ErrReplicaStorage
	}
	if e.ClusterID != l.cluster || e.Term < l.highTerm {
		return ReplicaReceipt{}, ErrReplicaConflict
	}
	if e.Index <= uint64(len(l.entries)) {
		existing := l.entries[e.Index-1]
		a, err := existing.Digest()
		if err != nil {
			return ReplicaReceipt{}, ErrReplicaCorrupt
		}
		b, err := e.Digest()
		if err != nil || a != b || e.Term < l.highTerm {
			return ReplicaReceipt{}, ErrReplicaConflict
		}
		return l.receiptLocked(e) // exact idempotent retry
	}
	if e.Index != uint64(len(l.entries))+1 || len(l.entries) >= MaxReplicaEntries {
		return ReplicaReceipt{}, ErrReplicaConflict
	}
	if len(l.entries) == 0 {
		if e.PreviousHash != zeroReplicaHash {
			return ReplicaReceipt{}, ErrReplicaConflict
		}
	} else {
		priorHash, err := l.entries[len(l.entries)-1].Digest()
		if err != nil || e.PreviousHash != priorHash {
			return ReplicaReceipt{}, ErrReplicaConflict
		}
	}
	if err := l.persistLocked("append", e.Term, &e); err != nil {
		return ReplicaReceipt{}, err
	}
	return l.receiptLocked(e)
}

func (l *ReplicaLog) Head() (uint64, string, error) {
	if l == nil {
		return 0, "", ErrReplicaInvalid
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.faulted || l.file == nil {
		return 0, "", ErrReplicaStorage
	}
	if len(l.entries) == 0 {
		return 0, zeroReplicaHash, nil
	}
	hash, err := l.entries[len(l.entries)-1].Digest()
	return uint64(len(l.entries)), hash, err
}

func (l *ReplicaLog) Close() error {
	if l == nil {
		return nil
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.file == nil {
		return nil
	}
	l.faulted = true
	err := l.file.Close()
	if err != nil {
		return err
	}
	l.file = nil
	return os.Remove(l.lockPath)
}

// ReplicaCommitProof is a READ-ONLY quorum certificate. It cannot issue
// worker leases, commit arbitrary executable commands or start simulations.
type ReplicaCommitProof struct {
	Election ElectionCertificate
	Entry    AuthorityLogEntry
	Receipts []ReplicaReceipt
}

// VerifyReplicaCommitProof proves a static roster majority fsynced the
// IDENTICAL entry hash at an index and term. It does NOT prove Raft log
// freshness, linearizable leadership, or a safely elected current leader.
func VerifyReplicaCommitProof(roster ElectionRoster, p ReplicaCommitProof) error {
	if err := VerifyElectionCertificate(roster, p.Election); err != nil {
		return err
	}
	if err := p.Entry.Validate(); err != nil {
		return err
	}
	if p.Election.ClusterID != p.Entry.ClusterID ||
		p.Election.CandidateID != p.Entry.LeaderID || p.Election.Term != p.Entry.Term {
		return ErrReplicaInvalid
	}
	n := len(roster.Members)
	if len(p.Receipts) < n/2+1 || len(p.Receipts) > n {
		return ErrReplicaNoQuorum
	}
	digest, err := p.Entry.Digest()
	if err != nil {
		return err
	}
	seen := make(map[string]struct{}, len(p.Receipts))
	for _, r := range p.Receipts {
		pub, ok := roster.Members[r.MemberID]
		if !ok || r.ClusterID != p.Entry.ClusterID || r.Term != p.Entry.Term ||
			r.Index != p.Entry.Index || r.EntryHash != digest {
			return ErrReplicaInvalid
		}
		if _, exists := seen[r.MemberID]; exists {
			return ErrReplicaInvalid
		}
		seen[r.MemberID] = struct{}{}
		sig, err := hex.DecodeString(r.Signature)
		if err != nil || len(sig) != ed25519.SignatureSize {
			return ErrReplicaInvalid
		}
		body, err := r.payload()
		if err != nil || !ed25519.Verify(pub, body, sig) {
			return ErrReplicaInvalid
		}
	}
	return nil
}
