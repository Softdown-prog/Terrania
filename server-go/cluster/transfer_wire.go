package cluster

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"
)

const (
	RegionSnapshotVersion    = 1
	MaxRegionSnapshotBytes   = 8 << 20
	MaxRegionWireBytes       = 12 << 20
	MaxStagedRegionSnapshots = 16
	RegionSnapshotPath       = "/internal/region/snapshot"
)

var (
	ErrSnapshotInvalid  = errors.New("invalid region snapshot")
	ErrSnapshotTooLarge = errors.New("region snapshot exceeds memory limit")
	ErrStagingFull      = errors.New("staging budget exhausted")
)

// RegionSnapshot is a bounded, opaque payload from the *frozen* source room.
// It is NOT a serializer for the existing engine.Room; a game-state adapter
// must be implemented separately before any region may actually be migrated.
type RegionSnapshot struct {
	Version  uint16
	Province Province
	OldEpoch uint64
	Tick     uint64
	Sequence uint64
	Payload  []byte
}

// Digest binds the snapshot's entire header AND payload, rather than merely
// hashing bytes that could be reinterpreted under another region or epoch.
func (s RegionSnapshot) Digest() [32]byte {
	h := sha256.New()
	_, _ = h.Write([]byte("terrania-region-snapshot-v1\x00"))
	var block [8]byte
	appendInt := func(v uint64) {
		binary.BigEndian.PutUint64(block[:], v)
		_, _ = h.Write(block[:])
	}
	appendInt(uint64(s.Version))
	appendInt(uint64(s.Province.X))
	appendInt(uint64(s.Province.Y))
	appendInt(s.OldEpoch)
	appendInt(s.Tick)
	appendInt(s.Sequence)
	appendInt(uint64(len(s.Payload)))
	_, _ = h.Write(s.Payload)
	var digest [32]byte
	copy(digest[:], h.Sum(nil))
	return digest
}

func (s RegionSnapshot) Validate() error {
	if s.Version != RegionSnapshotVersion || s.OldEpoch == 0 || len(s.Payload) == 0 {
		return ErrSnapshotInvalid
	}
	if len(s.Payload) > MaxRegionSnapshotBytes {
		return ErrSnapshotTooLarge
	}
	return nil
}

type RegionSnapshotRequest struct {
	Ticket   TransferTicket
	Snapshot RegionSnapshot
}

// Receipt is a bounded acknowledgment. It never contains the transfer token
// or world data; a source must verify ALL fields before quiescing or committing.
type RegionSnapshotReceipt struct {
	Province Province
	Target   string
	Epoch    uint64
	SHA256   string
	Bytes    int
	Staged   bool
}

type stagedRecord struct {
	ticket   TransferTicket
	snapshot RegionSnapshot
}

// SnapshotReceiver is an isolated private control-plane handler. It must only
// be mounted behind mTLS with the internal CA; it is not in the live gateway.
// All staging is in-memory and bounded, not crash-durable.
type SnapshotReceiver struct {
	mu        sync.Mutex
	directory *RegionDirectory
	workerID  string
	archive   *SnapshotArchive
	staged    map[Province]stagedRecord
}

func NewSnapshotReceiver(d *RegionDirectory, worker string) (*SnapshotReceiver, error) {
	if d == nil || !d.validWorker(worker) {
		return nil, ErrWorkerUnknown
	}
	return &SnapshotReceiver{directory: d, workerID: worker, staged: make(map[Province]stagedRecord)}, nil
}

// NewArchivedSnapshotReceiver persists the full authenticated frame BEFORE
// an acknowledgment or directory staging is published. This remains an
// opt-in control-plane component and is NOT mounted in production.
func NewArchivedSnapshotReceiver(d *RegionDirectory, worker string, a *SnapshotArchive) (*SnapshotReceiver, error) {
	if a == nil {
		return nil, ErrSnapshotArchiveInvalid
	}
	h, err := NewSnapshotReceiver(d, worker)
	if err != nil {
		return nil, err
	}
	h.archive = a
	return h, nil
}

// peerWorkerID requires an authenticated client certificate with exactly one
// SPIFFE-style URI SAN signed by the trusted internal CA. Headers and CNs are
// intentionally ignored; the HTTP TLS server must verify the client cert.
func peerWorkerID(r *http.Request) (string, bool) {
	if r.TLS == nil || len(r.TLS.VerifiedChains) == 0 || len(r.TLS.PeerCertificates) == 0 {
		return "", false
	}
	uris := r.TLS.PeerCertificates[0].URIs
	if len(uris) != 1 {
		return "", false
	}
	u := uris[0]
	if u == nil || u.Scheme != "spiffe" || u.Host != "terrania.internal" ||
		u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return "", false
	}
	if len(u.Path) < 9 || u.Path[:8] != "/worker/" {
		return "", false
	}
	worker := u.Path[8:]
	if worker == "" || len(worker) > 32 {
		return "", false
	}
	for _, ch := range worker {
		if (ch < 'a' || ch > 'z') && (ch < '0' || ch > '9') && ch != '-' {
			return "", false
		}
	}
	return worker, true
}

func (h *SnapshotReceiver) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != RegionSnapshotPath {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	from, ok := peerWorkerID(r)
	if !ok {
		http.Error(w, "worker identity required", http.StatusForbidden)
		return
	}
	if r.ContentLength > MaxRegionWireBytes {
		http.Error(w, "payload too large", http.StatusRequestEntityTooLarge)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, MaxRegionWireBytes)
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var transfer RegionSnapshotRequest
	if err := dec.Decode(&transfer); err != nil {
		var limit *http.MaxBytesError
		if errors.As(err, &limit) {
			http.Error(w, "payload too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "invalid envelope", http.StatusBadRequest)
		return
	}
	var extra json.RawMessage
	if err := dec.Decode(&extra); err != io.EOF {
		http.Error(w, "unexpected trailing envelope", http.StatusBadRequest)
		return
	}
	t := transfer.Ticket
	s := transfer.Snapshot
	if from != t.From || h.workerID != t.To ||
		s.Province != t.Province || s.OldEpoch != t.OldEpoch {
		http.Error(w, "invalid transfer ownership", http.StatusForbidden)
		return
	}
	if err := s.Validate(); err != nil {
		code := http.StatusBadRequest
		if errors.Is(err, ErrSnapshotTooLarge) {
			code = http.StatusRequestEntityTooLarge
		}
		http.Error(w, "invalid snapshot size or version", code)
		return
	}
	hash := s.Digest()
	if subtle.ConstantTimeCompare(hash[:], t.Digest[:]) != 1 {
		http.Error(w, "snapshot integrity failed", http.StatusConflict)
		return
	}
	// Only one authenticated coordinator ticket can be staged per province.
	// Save the copied data BEFORE signaling staging complete in the directory.
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, exists := h.staged[t.Province]; !exists && len(h.staged) >= MaxStagedRegionSnapshots {
		http.Error(w, "staging capacity reached", http.StatusServiceUnavailable)
		return
	}
	// Validate against the live coordinator before writing an archive. The
	// directory may still change while fsync runs; the final StageDestination
	// rechecks and rejects an outdated ticket without activating anything.
	if err := h.directory.ValidateStaging(t, hash, time.Now()); err != nil {
		http.Error(w, "transfer ticket not active or source not frozen", http.StatusConflict)
		return
	}
	if h.archive != nil {
		if err := h.archive.SaveDurable(transfer); err != nil {
			http.Error(w, "durable snapshot unavailable", http.StatusServiceUnavailable)
			return
		}
	}
	old, exists := h.staged[t.Province]
	payload := append([]byte(nil), s.Payload...)
	s.Payload = payload
	h.staged[t.Province] = stagedRecord{ticket: t, snapshot: s}
	if err := h.directory.StageDestination(t, hash, time.Now()); err != nil {
		if exists {
			h.staged[t.Province] = old
		} else {
			delete(h.staged, t.Province)
		}
		http.Error(w, "transfer ticket not active or source not frozen", http.StatusConflict)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(RegionSnapshotReceipt{
		Province: t.Province, Target: h.workerID, Epoch: t.NewEpoch,
		SHA256: hex.EncodeToString(hash[:]), Bytes: len(payload), Staged: true,
	})
}

// StagedCopy returns a defensive clone, exclusively for a future inactive-room
// state adapter. This does not activate the destination's simulation.
func (h *SnapshotReceiver) StagedCopy(p Province) (RegionSnapshot, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	s, ok := h.staged[p]
	if !ok {
		return RegionSnapshot{}, false
	}
	s.snapshot.Payload = append([]byte(nil), s.snapshot.Payload...)
	return s.snapshot, true
}

// SendRegionSnapshot is for ADMIN-CONFIGURED HTTPS peers. The injected client
// MUST use authenticated TLS with a worker cert. The caller must verify the
// receipt before QuiesceSource; this routine never commits ownership itself.
func SendRegionSnapshot(ctx context.Context, client *http.Client, endpoint string, request RegionSnapshotRequest) (RegionSnapshotReceipt, error) {
	if client == nil {
		return RegionSnapshotReceipt{}, ErrSnapshotInvalid
	}
	u, err := url.Parse(endpoint)
	if err != nil || u == nil || u.Scheme != "https" || u.Host == "" ||
		u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Path != RegionSnapshotPath {
		return RegionSnapshotReceipt{}, ErrSnapshotInvalid
	}
	if err := request.Snapshot.Validate(); err != nil {
		return RegionSnapshotReceipt{}, err
	}
	t, s := request.Ticket, request.Snapshot
	hash := s.Digest()
	if t.To == "" || t.From == "" || s.Province != t.Province ||
		s.OldEpoch != t.OldEpoch || subtle.ConstantTimeCompare(hash[:], t.Digest[:]) != 1 {
		return RegionSnapshotReceipt{}, ErrSnapshotInvalid
	}
	wire, err := json.Marshal(request)
	if err != nil || len(wire) > MaxRegionWireBytes {
		return RegionSnapshotReceipt{}, ErrSnapshotTooLarge
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(wire))
	if err != nil {
		return RegionSnapshotReceipt{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	// Never follow a 307/308 redirect carrying a private transfer token.
	// A compromised destination must not forward region state to another host.
	safeClient := *client
	safeClient.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := safeClient.Do(req)
	if err != nil {
		return RegionSnapshotReceipt{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return RegionSnapshotReceipt{}, fmt.Errorf("snapshot destination rejected transfer: HTTP %d", resp.StatusCode)
	}
	var receipt RegionSnapshotReceipt
	if err := json.NewDecoder(io.LimitReader(resp.Body, 4096)).Decode(&receipt); err != nil {
		return RegionSnapshotReceipt{}, fmt.Errorf("invalid snapshot receipt: %w", err)
	}
	if !receipt.Staged || receipt.Province != t.Province || receipt.Target != t.To ||
		receipt.Epoch != t.NewEpoch || receipt.Bytes != len(s.Payload) ||
		receipt.SHA256 != hex.EncodeToString(hash[:]) {
		return RegionSnapshotReceipt{}, errors.New("snapshot receipt mismatch")
	}
	return receipt, nil
}
