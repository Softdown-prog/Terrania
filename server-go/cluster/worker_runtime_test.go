package cluster

import (
	"bytes"
	"context"
	"crypto/sha256"
	"errors"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

func TestGuardedRoomHandoffFencesOldEpochAndRestoresDestination(t *testing.T) {
	d := testDirectory(t)
	p := Province{X: 1, Y: -1}
	owner, err := d.Register(p, "east")
	if err != nil {
		t.Fatal(err)
	}
	source, err := NewGuardedRoom(d, p, "east", owner.Epoch, engine.NewRoom("origins"))
	if err != nil {
		t.Fatal(err)
	}
	defer source.Close()
	if err := source.Join("player-1", "Explorer"); err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	if err := source.Input("player-1", engine.Input{Type: "input", X: .8, Y: 0, Attack: true}, now); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 5; i++ {
		if err := source.Tick(.05, now.Add(time.Duration(i)*50*time.Millisecond)); err != nil {
			t.Fatal(err)
		}
	}
	original, err := source.InspectState()
	if err != nil {
		t.Fatal(err)
	}
	req, err := source.PrepareHandoff("west", time.Now(), 5, 1)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(original, req.Snapshot.Payload) {
		t.Fatal("snapshot differs from source")
	}
	if req.Ticket.NewEpoch != owner.Epoch+1 {
		t.Fatal("epoch not incremented")
	}
	if d.CanSimulate(p, "east", 1) || d.CanSimulate(p, "west", 2) {
		t.Fatal("two owners during handoff")
	}
	if err := source.Tick(.05, time.Now()); !errors.Is(err, ErrRoomNotReady) {
		t.Fatalf("source tick not frozen: %v", err)
	}
	if err := source.Input("player-1", engine.Input{Type: "input", X: 1}, time.Now()); !errors.Is(err, ErrRoomNotReady) {
		t.Fatalf("source accepted input after freeze: %v", err)
	}
	target, err := NewStagedGuardedRoom(d, req, "west")
	if err != nil {
		t.Fatal(err)
	}
	defer target.Close()
	if err := target.Activate(); !errors.Is(err, ErrRoomNotAuthoritative) {
		t.Fatalf("destination activated before commit: %v", err)
	}
	if err := target.Tick(.05, time.Now()); !errors.Is(err, ErrRoomNotReady) {
		t.Fatalf("staged worker ran before commit: %v", err)
	}
	before, err := target.InspectState()
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(before, original) {
		t.Fatal("restored room is not identical to source")
	}
	if err := d.StageDestination(req.Ticket, req.Snapshot.Digest(), time.Now()); err != nil {
		t.Fatal(err)
	}
	if err := d.QuiesceSource(req.Ticket, time.Now()); err != nil {
		t.Fatal(err)
	}
	if _, err := d.Commit(req.Ticket, time.Now()); err != nil {
		t.Fatal(err)
	}
	if err := source.Tick(.05, time.Now()); err == nil {
		t.Fatal("old source resumed after ownership changed")
	}
	if err := target.Activate(); err != nil {
		t.Fatal(err)
	}
	if err := target.Tick(.05, now.Add(400*time.Millisecond)); err != nil {
		t.Fatalf("new owner did not tick: %v", err)
	}
	if _, err := target.StateFor("player-1"); err != nil {
		t.Fatal(err)
	}
	if err := target.Join("player-2", "Second"); err != nil {
		t.Fatal(err)
	}
	after, err := target.InspectState()
	if err != nil {
		t.Fatal(err)
	}
	originAfter, err := source.InspectState()
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Equal(after, originAfter) == true {
		t.Fatal("destination did not advance independently")
	}
}

func TestConcurrentRoomTickWaitsBeforeRegionFreeze(t *testing.T) {
	d := testDirectory(t)
	p := Province{10, 11}
	_, err := d.Register(p, "east")
	if err != nil {
		t.Fatal(err)
	}
	hash := sha256.Sum256([]byte("frozen snapshot"))
	now := time.Now()
	ticket, err := d.Begin(p, "east", "west", 1, hash, now)
	if err != nil {
		t.Fatal(err)
	}
	started := make(chan struct{})
	release := make(chan struct{})
	tickDone := make(chan error, 1)
	go func() {
		tickDone <- d.WithAuthority(p, "east", 1, func() error {
			close(started)
			<-release
			return nil
		})
	}()
	<-started
	freezeDone := make(chan error, 1)
	go func() { freezeDone <- d.FreezeSource(ticket, time.Now()) }()
	select {
	case err := <-freezeDone:
		t.Fatalf("freeze overtook in-flight tick: %v", err)
	case <-time.After(30 * time.Millisecond):
	}
	close(release)
	if err := <-tickDone; err != nil {
		t.Fatal(err)
	}
	if err := <-freezeDone; err != nil {
		t.Fatal(err)
	}
	if err := d.WithAuthority(p, "east", 1, func() error { t.Fatal("stale simulation invoked"); return nil }); !errors.Is(err, ErrRoomNotAuthoritative) {
		t.Fatalf("fenced old epoch was accepted: %v", err)
	}
}

func TestRegionExecutionGatesDontBlockUnrelatedProvinces(t *testing.T) {
	d := testDirectory(t)
	a, b := Province{1, 1}, Province{2, 2}
	for _, p := range []Province{a, b} {
		if _, err := d.Register(p, "east"); err != nil {
			t.Fatal(err)
		}
	}
	started := make(chan struct{})
	release := make(chan struct{})
	done := make(chan error, 1)
	go func() { done <- d.WithAuthority(a, "east", 1, func() error { close(started); <-release; return nil }) }()
	<-started
	out := make(chan error, 1)
	go func() { out <- d.WithAuthority(b, "east", 1, func() error { return nil }) }()
	select {
	case err := <-out:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("one province blocked unrelated province")
	}
	close(release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
}

func TestCaptureAndFreezeCannotRaceWithConcurrentSimulation(t *testing.T) {
	d := testDirectory(t)
	p := Province{3, 4}
	_, err := d.Register(p, "east")
	if err != nil {
		t.Fatal(err)
	}
	started := make(chan struct{})
	release := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = d.WithAuthority(p, "east", 1, func() error { close(started); <-release; return nil })
	}()
	<-started
	room := engine.NewRoom("origins")
	defer room.Close()
	ready := make(chan struct{})
	completed := make(chan error, 1)
	go func() {
		close(ready)
		_, _, err := d.CaptureAndFreeze(p, "east", "west", 1, time.Now(), func() (RegionSnapshot, error) {
			payload, err := room.ExportState()
			return RegionSnapshot{Version: 1, Province: p, OldEpoch: 1, Payload: payload}, err
		})
		completed <- err
	}()
	<-ready
	select {
	case err := <-completed:
		t.Fatalf("snapshot overtook in-flight mutation: %v", err)
	case <-time.After(30 * time.Millisecond):
	}
	close(release)
	wg.Wait()
	if err := <-completed; err != nil {
		t.Fatal(err)
	}
	if d.CanSimulate(p, "east", 1) {
		t.Fatal("snapshot freeze did not fence source")
	}
}

func TestStagedRoomRejectsTamperedSnapshot(t *testing.T) {
	d := testDirectory(t)
	p := Province{-20, 2}
	_, err := d.Register(p, "east")
	if err != nil {
		t.Fatal(err)
	}
	source, err := NewGuardedRoom(d, p, "east", 1, engine.NewRoom("origins"))
	if err != nil {
		t.Fatal(err)
	}
	defer source.Close()
	req, err := source.PrepareHandoff("west", time.Now(), 1, 1)
	if err != nil {
		t.Fatal(err)
	}
	tampered := req
	tampered.Snapshot.Payload = []byte("tampered")
	if staged, err := NewStagedGuardedRoom(d, tampered, "west"); staged != nil || err == nil {
		t.Fatalf("tampered snapshot accepted: %v", err)
	}
	if staged, err := NewStagedGuardedRoom(d, req, "center"); staged != nil || err == nil {
		t.Fatalf("wrong worker restored a room: %v", err)
	}
}

func TestGuardedRoomRejectsRecoveredEpochWithoutReconciliation(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "region.wal")
	d := persistentDirectory(t, path)
	p := Province{0, 0}
	if _, err := d.Register(p, "east"); err != nil {
		t.Fatal(err)
	}
	source, err := NewGuardedRoom(d, p, "east", 1, engine.NewRoom("origins"))
	if err != nil {
		t.Fatal(err)
	}
	defer source.Close()
	if err := source.Join("hero", "Hero"); err != nil {
		t.Fatal(err)
	}
	if err := d.Close(); err != nil {
		t.Fatal(err)
	}
	if err := source.Tick(.05, time.Now()); err == nil {
		t.Fatal("coordinator close ignored")
	}
	reopened := persistentDirectory(t, path)
	defer func() { _ = reopened.Close() }()
	if staged, err := NewGuardedRoom(reopened, p, "east", 1, engine.NewRoom("origins")); staged != nil || !errors.Is(err, ErrRoomNotAuthoritative) {
		if staged != nil {
			staged.Close()
		}
		t.Fatalf("recovery required was bypassed: %v", err)
	}
}

func TestRoomTransferNetworkStagingAndGuardedActivation(t *testing.T) {
	d := testDirectory(t)
	p := Province{-2, 6}
	if _, err := d.Register(p, "east"); err != nil {
		t.Fatal(err)
	}
	source, err := NewGuardedRoom(d, p, "east", 1, engine.NewRoom("origins"))
	if err != nil {
		t.Fatal(err)
	}
	defer source.Close()
	if err := source.Join("hero", "Hero"); err != nil {
		t.Fatal(err)
	}
	req, err := source.PrepareHandoff("west", time.Now(), 4, 17)
	if err != nil {
		t.Fatal(err)
	}
	receiver, err := NewSnapshotReceiver(d, "west")
	if err != nil {
		t.Fatal(err)
	}
	server, clients := testMutualTLS(t, receiver)
	if _, err := SendRegionSnapshot(context.Background(), clients("east"), server.URL+RegionSnapshotPath, req); err != nil {
		t.Fatal(err)
	}
	staged, ok := receiver.StagedCopy(p)
	if !ok {
		t.Fatal("destination has no staged snapshot")
	}
	if staged.Digest() != req.Snapshot.Digest() {
		t.Fatal("staged wire corrupted data")
	}
	target, err := NewStagedGuardedRoom(d, RegionSnapshotRequest{Ticket: req.Ticket, Snapshot: staged}, "west")
	if err != nil {
		t.Fatal(err)
	}
	defer target.Close()
	if err := d.QuiesceSource(req.Ticket, time.Now()); err != nil {
		t.Fatal(err)
	}
	if err := target.Activate(); err == nil {
		t.Fatal("early activation succeeded")
	}
	if _, err := d.Commit(req.Ticket, time.Now()); err != nil {
		t.Fatal(err)
	}
	if err := target.Activate(); err != nil {
		t.Fatal(err)
	}
	if err := target.Tick(.05, time.Now()); err != nil {
		t.Fatal(err)
	}
}
