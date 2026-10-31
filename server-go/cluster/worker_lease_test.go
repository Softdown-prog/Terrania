package cluster

import (
	"crypto/ed25519"
	"crypto/rand"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

func testLeaseKeys(t *testing.T) (ed25519.PublicKey, ed25519.PrivateKey) {
	t.Helper()
	pub, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return pub, key
}

func testSignedLease(t *testing.T, key ed25519.PrivateKey, g *WorkerLeaseGate, epoch, seq uint64, life time.Duration) WorkerLeasePermit {
	t.Helper()
	now := time.Now()
	p, err := SignWorkerLease(key, WorkerLeasePermit{
		Province: g.province, WorkerID: g.worker, BootID: g.BootID(),
		Epoch: epoch, Sequence: seq, IssuedAtUnixMS: now.UnixMilli(),
		ExpiresAtUnixMS: now.Add(life).UnixMilli(),
	})
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func TestWorkerLeaseRejectsForgedReplayedAndWrongProcessPermits(t *testing.T) {
	pub, key := testLeaseKeys(t)
	p := Province{12, -11}
	east, err := NewWorkerLeaseGate(pub, "east", p)
	if err != nil {
		t.Fatal(err)
	}
	defer east.Close()
	restarted, err := NewWorkerLeaseGate(pub, "east", p)
	if err != nil {
		t.Fatal(err)
	}
	defer restarted.Close()
	west, err := NewWorkerLeaseGate(pub, "west", p)
	if err != nil {
		t.Fatal(err)
	}
	defer west.Close()
	if east.BootID() == restarted.BootID() {
		t.Fatal("process boot nonce reused")
	}
	p1 := testSignedLease(t, key, east, 3, 1, 800*time.Millisecond)
	if err := east.Install(p1); err != nil {
		t.Fatal(err)
	}
	for _, g := range []*WorkerLeaseGate{restarted, west} {
		if err := g.Install(p1); !errors.Is(err, ErrWorkerLeaseInvalid) {
			t.Fatalf("permit accepted by wrong process: %v", err)
		}
	}
	if err := east.Install(p1); !errors.Is(err, ErrWorkerLeaseInvalid) {
		t.Fatalf("replayed sequence accepted: %v", err)
	}
	modified := p1
	modified.Epoch = 4
	if err := east.Install(modified); !errors.Is(err, ErrWorkerLeaseInvalid) {
		t.Fatalf("modified epoch accepted: %v", err)
	}
	modified = p1
	modified.Province.X++
	if err := east.Install(modified); !errors.Is(err, ErrWorkerLeaseInvalid) {
		t.Fatalf("modified province accepted: %v", err)
	}
	modified = p1
	modified.SignatureHex = "01"
	if err := east.Install(modified); !errors.Is(err, ErrWorkerLeaseInvalid) {
		t.Fatalf("forged signature accepted: %v", err)
	}
	_, otherKey := testLeaseKeys(t)
	rogue := testSignedLease(t, otherKey, east, 3, 2, 800*time.Millisecond)
	if err := east.Install(rogue); !errors.Is(err, ErrWorkerLeaseInvalid) {
		t.Fatalf("unknown signing key accepted: %v", err)
	}
	renewal := testSignedLease(t, key, east, 3, 2, 800*time.Millisecond)
	if err := east.Install(renewal); err != nil {
		t.Fatal(err)
	}
	staleEpoch := testSignedLease(t, key, east, 4, 3, 800*time.Millisecond)
	if err := east.Install(staleEpoch); !errors.Is(err, ErrWorkerLeaseInvalid) {
		t.Fatalf("worker changed epoch without rebootstrap: %v", err)
	}
}

func TestWorkerLeaseRejectsOversizedOrDistantCapabilities(t *testing.T) {
	pub, key := testLeaseKeys(t)
	g, err := NewWorkerLeaseGate(pub, "east", Province{1, 2})
	if err != nil {
		t.Fatal(err)
	}
	defer g.Close()
	if _, err := SignWorkerLease(key, WorkerLeasePermit{
		Province: g.province, WorkerID: "east", BootID: g.BootID(), Epoch: 1, Sequence: 1,
		IssuedAtUnixMS: time.Now().UnixMilli(), ExpiresAtUnixMS: time.Now().Add(10 * time.Second).UnixMilli(),
	}); !errors.Is(err, ErrWorkerLeaseInvalid) {
		t.Fatalf("unbounded lease signed: %v", err)
	}
	future := time.Now().Add(time.Second)
	p, err := SignWorkerLease(key, WorkerLeasePermit{
		Province: g.province, WorkerID: "east", BootID: g.BootID(), Epoch: 1, Sequence: 1,
		IssuedAtUnixMS: future.UnixMilli(), ExpiresAtUnixMS: future.Add(time.Second).UnixMilli(),
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := g.Install(p); !errors.Is(err, ErrWorkerLeaseExpired) {
		t.Fatalf("future permit accepted: %v", err)
	}
}

func TestDisconnectedWorkerStopsTicksAndCannotSilentlyRestart(t *testing.T) {
	pub, key := testLeaseKeys(t)
	g, err := NewWorkerLeaseGate(pub, "east", Province{2, 4})
	if err != nil {
		t.Fatal(err)
	}
	defer g.Close()
	p := testSignedLease(t, key, g, 1, 1, 230*time.Millisecond)
	if err := g.Install(p); err != nil {
		t.Fatal(err)
	}
	room, err := NewLeaseBoundRoom(g, engine.NewRoom("origins"))
	if err != nil {
		t.Fatal(err)
	}
	defer room.Close()
	if err := room.Join("hero", "Hero"); err != nil {
		t.Fatal(err)
	}
	if err := room.Tick(.05, time.Now()); err != nil {
		t.Fatal(err)
	}
	if err := room.Input("hero", engine.Input{Type: "input", X: 1}, time.Now()); err != nil {
		t.Fatal(err)
	}
	before, err := room.SnapshotState()
	if err != nil {
		t.Fatal(err)
	}
	// Represents a lost control-plane connection: no renewal arrives.
	time.Sleep(260 * time.Millisecond)
	if err := room.Tick(.05, time.Now()); !errors.Is(err, ErrWorkerLeaseExpired) {
		t.Fatalf("expired worker ticked: %v", err)
	}
	if err := room.Input("hero", engine.Input{Type: "input", X: 1}, time.Now()); !errors.Is(err, ErrWorkerLeaseExpired) {
		t.Fatalf("expired worker accepted input: %v", err)
	}
	if err := room.Join("second", "Second"); !errors.Is(err, ErrWorkerLeaseExpired) {
		t.Fatalf("expired worker admitted new player: %v", err)
	}
	if _, err := room.SnapshotState(); !errors.Is(err, ErrWorkerLeaseExpired) {
		t.Fatalf("expired worker generated game state: %v", err)
	}
	// A delayed renewal cannot reactivate a worker whose lease already expired.
	late := testSignedLease(t, key, g, 1, 2, time.Second)
	if err := g.Install(late); !errors.Is(err, ErrWorkerLeaseExpired) {
		t.Fatalf("late renewal silently restarted worker: %v", err)
	}
	// Inspect engine only through the owning room lock in this test.
	room.mu.Lock()
	after, err := room.room.ExportState()
	room.mu.Unlock()
	if err != nil {
		t.Fatal(err)
	}
	if string(before) != string(after) {
		t.Fatal("game state mutated without authority")
	}
}

func TestWorkerRevocationWaitsForInflightTickAndFencesNewOperations(t *testing.T) {
	pub, key := testLeaseKeys(t)
	g, err := NewWorkerLeaseGate(pub, "east", Province{3, 7})
	if err != nil {
		t.Fatal(err)
	}
	defer g.Close()
	if err := g.Install(testSignedLease(t, key, g, 1, 1, time.Second)); err != nil {
		t.Fatal(err)
	}
	started, release := make(chan struct{}), make(chan struct{})
	inside := make(chan error, 1)
	go func() {
		inside <- g.WithLease(func() error { close(started); <-release; return nil })
	}()
	<-started
	fenced := make(chan error, 1)
	go func() {
		_, err := g.Revoke()
		fenced <- err
	}()
	select {
	case err := <-fenced:
		t.Fatalf("revocation acknowledged while old tick active: %v", err)
	case <-time.After(25 * time.Millisecond):
	}
	close(release)
	if err := <-inside; err != nil {
		t.Fatal(err)
	}
	if err := <-fenced; err != nil {
		t.Fatal(err)
	}
	if err := g.WithLease(func() error { t.Fatal("revoked tick executed"); return nil }); !errors.Is(err, ErrWorkerLeaseRevoked) {
		t.Fatalf("revoked capability was used: %v", err)
	}
	if err := g.Install(testSignedLease(t, key, g, 1, 2, time.Second)); !errors.Is(err, ErrWorkerLeaseRevoked) {
		t.Fatalf("revoked process was renewed: %v", err)
	}
}

func TestWorkerGatesAreIndependentAcrossProcesses(t *testing.T) {
	pub, key := testLeaseKeys(t)
	first, err := NewWorkerLeaseGate(pub, "east", Province{1, 0})
	if err != nil {
		t.Fatal(err)
	}
	defer first.Close()
	second, err := NewWorkerLeaseGate(pub, "west", Province{2, 0})
	if err != nil {
		t.Fatal(err)
	}
	defer second.Close()
	if err := first.Install(testSignedLease(t, key, first, 1, 1, time.Second)); err != nil {
		t.Fatal(err)
	}
	if err := second.Install(testSignedLease(t, key, second, 1, 1, time.Second)); err != nil {
		t.Fatal(err)
	}
	start := make(chan struct{})
	release := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = first.WithLease(func() error { close(start); <-release; return nil })
	}()
	<-start
	other := make(chan error, 1)
	go func() { other <- second.WithLease(func() error { return nil }) }()
	select {
	case err := <-other:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(150 * time.Millisecond):
		t.Fatal("unrelated worker blocked by another worker tick")
	}
	close(release)
	wg.Wait()
}
