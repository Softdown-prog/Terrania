package cluster

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func grantTestCoordinator(t *testing.T, path string, key ed25519.PrivateKey) *GrantCoordinator {
	t.Helper()
	c, err := OpenGrantCoordinator(path, key)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestGrantCoordinatorSingleHolderRenewAndForgedBoot(t *testing.T) {
	pub, key := testLeaseKeys(t)
	path := filepath.Join(t.TempDir(), "authority.wal")
	c := grantTestCoordinator(t, path, key)
	defer c.Close()
	province := Province{100, -99}
	g, err := NewWorkerLeaseGate(pub, "east", province)
	if err != nil {
		t.Fatal(err)
	}
	defer g.Close()
	permit, err := c.GrantInitial(province, "east", g.BootID(), time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if !verifyWorkerLease(pub, permit) || permit.Epoch != 1 || permit.Sequence != 1 {
		t.Fatalf("incorrect signed permit: %+v", permit)
	}
	if err := g.Install(permit); err != nil {
		t.Fatal(err)
	}
	if _, err := c.GrantInitial(province, "west", g.BootID(), time.Second); !errors.Is(err, ErrGrantConflict) {
		t.Fatalf("concurrent conflicting authority accepted: %v", err)
	}
	if _, err := c.Renew(province, "west", g.BootID(), 1, time.Second); !errors.Is(err, ErrGrantConflict) {
		t.Fatalf("wrong worker renewed grant: %v", err)
	}
	other, err := NewWorkerLeaseGate(pub, "east", province)
	if err != nil {
		t.Fatal(err)
	}
	defer other.Close()
	if _, err := c.Renew(province, "east", other.BootID(), 1, time.Second); !errors.Is(err, ErrGrantConflict) {
		t.Fatalf("worker restart stole existing epoch: %v", err)
	}
	second, err := c.Renew(province, "east", g.BootID(), 1, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if second.Sequence != 2 || second.Epoch != 1 || !verifyWorkerLease(pub, second) {
		t.Fatal("invalid renewal")
	}
	if err := g.Install(second); err != nil {
		t.Fatal(err)
	}
	state, err := c.Status(province)
	if err != nil || state.Fenced || state.Epoch != 1 || state.Sequence != 2 {
		t.Fatalf("wrong grant state: %+v %v", state, err)
	}
}

func TestGrantCoordinatorRevokeAndPromotionFencesOlderLease(t *testing.T) {
	pub, key := testLeaseKeys(t)
	path := filepath.Join(t.TempDir(), "authority.wal")
	c := grantTestCoordinator(t, path, key)
	defer c.Close()
	p := Province{-7, 9}
	old, err := NewWorkerLeaseGate(pub, "east", p)
	if err != nil {
		t.Fatal(err)
	}
	defer old.Close()
	newWorker, err := NewWorkerLeaseGate(pub, "west", p)
	if err != nil {
		t.Fatal(err)
	}
	defer newWorker.Close()
	issued, err := c.GrantInitial(p, "east", old.BootID(), 300*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	endpoint, err := NewWorkerLeaseEndpoint(old, "control")
	if err != nil {
		t.Fatal(err)
	}
	srv, clients := testMutualTLS(t, endpoint)
	url := srv.URL + WorkerLeasePath
	if _, err := SendWorkerLeaseCommand(context.Background(), clients("control"), url, LeaseCommandFor(issued)); err != nil {
		t.Fatal(err)
	}
	if _, err := c.Promote(p, "west", newWorker.BootID(), 500*time.Millisecond); !errors.Is(err, ErrGrantNotReady) {
		t.Fatalf("promoted without evidence: %v", err)
	}
	if err := c.RevokeAndRecordFence(context.Background(), clients("west"), url, p); err == nil {
		t.Fatal("other worker certificate revoked old worker")
	}
	status, err := c.Status(p)
	if err != nil || status.Fenced {
		t.Fatal("untrusted revocation changed persisted ledger")
	}
	started := make(chan struct{})
	release := make(chan struct{})
	tickDone := make(chan error, 1)
	go func() { tickDone <- old.WithLease(func() error { close(started); <-release; return nil }) }()
	<-started
	ack := make(chan error, 1)
	go func() { ack <- c.RevokeAndRecordFence(context.Background(), clients("control"), url, p) }()
	select {
	case err := <-ack:
		t.Fatalf("revocation acknowledged before tick stopped: %v", err)
	case <-time.After(25 * time.Millisecond):
	}
	close(release)
	if err := <-tickDone; err != nil {
		t.Fatal(err)
	}
	if err := <-ack; err != nil {
		t.Fatal(err)
	}
	if _, err := c.Promote(p, "west", newWorker.BootID(), 500*time.Millisecond); !errors.Is(err, ErrGrantNotReady) {
		t.Fatalf("promoted during prior permit's expiry interval: %v", err)
	}
	for deadline := time.Now().Add(2 * time.Second); ; {
		permit, err := c.Promote(p, "west", newWorker.BootID(), 500*time.Millisecond)
		if err == nil {
			if permit.Epoch != 2 || permit.Sequence != 1 || !verifyWorkerLease(pub, permit) {
				t.Fatal("invalid promoted permit")
			}
			if err := newWorker.Install(permit); err != nil {
				t.Fatal(err)
			}
			if err := old.WithLease(func() error { return nil }); !errors.Is(err, ErrWorkerLeaseRevoked) {
				t.Fatalf("old worker still active: %v", err)
			}
			if err := newWorker.WithLease(func() error { return nil }); err != nil {
				t.Fatal(err)
			}
			if _, err := c.Renew(p, "east", old.BootID(), 1, time.Second); !errors.Is(err, ErrGrantConflict) {
				t.Fatalf("old worker revived: %v", err)
			}
			break
		}
		if !errors.Is(err, ErrGrantNotReady) || time.Now().After(deadline) {
			t.Fatalf("failed promotion: %v", err)
		}
		time.Sleep(20 * time.Millisecond)
	}
	status, err = c.Status(p)
	if err != nil || status.WorkerID != "west" || status.Epoch != 2 || status.Fenced {
		t.Fatalf("unsafe successor state: %+v %v", status, err)
	}
}

func TestGrantCoordinatorRefusesFailoverWithoutRevocationDespiteExpiredPermit(t *testing.T) {
	pub, key := testLeaseKeys(t)
	c := grantTestCoordinator(t, filepath.Join(t.TempDir(), "authority.wal"), key)
	defer c.Close()
	p := Province{15, 16}
	a, err := NewWorkerLeaseGate(pub, "east", p)
	if err != nil {
		t.Fatal(err)
	}
	defer a.Close()
	b, err := NewWorkerLeaseGate(pub, "west", p)
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	_, err = c.GrantInitial(p, "east", a.BootID(), 200*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	time.Sleep(520 * time.Millisecond)
	if _, err := c.Promote(p, "west", b.BootID(), time.Second); !errors.Is(err, ErrGrantNotReady) {
		t.Fatalf("lost coordinator contact caused unsafe automatic promotion: %v", err)
	}
	if _, err := c.Renew(p, "east", a.BootID(), 1, time.Second); !errors.Is(err, ErrGrantNotReady) {
		t.Fatalf("expired authority was revived: %v", err)
	}
}

func TestGrantCoordinatorRestartIsReadOnlyUntilOfflineReconciliation(t *testing.T) {
	pub, key := testLeaseKeys(t)
	path := filepath.Join(t.TempDir(), "authority.wal")
	c := grantTestCoordinator(t, path, key)
	p := Province{4, -12}
	g, err := NewWorkerLeaseGate(pub, "east", p)
	if err != nil {
		t.Fatal(err)
	}
	defer g.Close()
	if _, err := c.GrantInitial(p, "east", g.BootID(), time.Second); err != nil {
		t.Fatal(err)
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	again := grantTestCoordinator(t, path, key)
	defer again.Close()
	state, err := again.Status(p)
	if err != nil || !state.RecoveryRequired || state.WorkerID != "east" || state.Epoch != 1 {
		t.Fatalf("restart removed fence: %+v %v", state, err)
	}
	if _, err := again.Renew(p, "east", g.BootID(), 1, time.Second); !errors.Is(err, ErrGrantRecovery) {
		t.Fatalf("reboot renewal issued: %v", err)
	}
	if err := again.RevokeAndRecordFence(context.Background(), nil, "", p); !errors.Is(err, ErrGrantRecovery) {
		t.Fatalf("reboot allowed unsigned recovery: %v", err)
	}
	if _, err := again.Promote(p, "west", g.BootID(), time.Second); !errors.Is(err, ErrGrantRecovery) {
		t.Fatalf("reboot auto-promoted: %v", err)
	}
	if _, err := again.GrantInitial(p, "west", g.BootID(), time.Second); !errors.Is(err, ErrGrantConflict) {
		t.Fatalf("reboot created overlapping initial grant: %v", err)
	}
}

func TestGrantCoordinatorRejectsCorruptionAndWrongSigningKey(t *testing.T) {
	_, key := testLeaseKeys(t)
	path := filepath.Join(t.TempDir(), "authority.wal")
	c := grantTestCoordinator(t, path, key)
	if _, err := c.GrantInitial(Province{6, 6}, "east", "0123456789abcdef0123456789abcdef", time.Second); err != nil {
		t.Fatal(err)
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	original, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	corrupt := append([]byte(nil), original...)
	corrupt[len(corrupt)-1] ^= 0x1
	testCases := map[string][]byte{
		"truncated-header": append([]byte(nil), original[:15]...),
		"truncated-record": append([]byte(nil), original[:len(original)-1]...),
		"checksum":         corrupt,
		"trailing-garbage": append(append([]byte(nil), original...), 0x30),
	}
	for name, content := range testCases {
		t.Run(name, func(t *testing.T) {
			target := filepath.Join(t.TempDir(), "corrupt.wal")
			if err := os.WriteFile(target, content, 0600); err != nil {
				t.Fatal(err)
			}
			reopened, err := OpenGrantCoordinator(target, key)
			if reopened != nil || !errors.Is(err, ErrGrantCorrupt) {
				t.Fatalf("accepted %s: %v", name, err)
			}
		})
	}
	_, otherKey := testLeaseKeys(t)
	if reopened, err := OpenGrantCoordinator(path, otherKey); reopened != nil || !errors.Is(err, ErrGrantCorrupt) {
		t.Fatalf("changed grant signer was silently trusted: %v", err)
	}
}

func TestGrantCoordinatorSingleWriterAndConcurrentInitialGrants(t *testing.T) {
	_, key := testLeaseKeys(t)
	path := filepath.Join(t.TempDir(), "authority.wal")
	c := grantTestCoordinator(t, path, key)
	if another, err := OpenGrantCoordinator(path, key); err == nil || another != nil {
		t.Fatal("two live coordinators opened identical grant ledger")
	}
	const parallel = 32
	p := Province{88, 1}
	var wg sync.WaitGroup
	var successes int
	var mu sync.Mutex
	for i := 0; i < parallel; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := c.GrantInitial(p, "east", "0123456789abcdef0123456789abcdef", time.Second)
			mu.Lock()
			defer mu.Unlock()
			if err == nil {
				successes++
			} else if !errors.Is(err, ErrGrantConflict) {
				t.Errorf("unexpected parallel grant: %v", err)
			}
		}()
	}
	wg.Wait()
	if successes != 1 {
		t.Fatalf("overlapping grants accepted: %d", successes)
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	replayed := grantTestCoordinator(t, path, key)
	defer replayed.Close()
	status, err := replayed.Status(p)
	if err != nil || !status.RecoveryRequired || status.Sequence != 1 {
		t.Fatalf("ledger replay mismatch: %+v %v", status, err)
	}
}

func TestGrantCoordinatorRefusesInsecurePathsAndStaleLock(t *testing.T) {
	_, key := testLeaseKeys(t)
	if c, err := OpenGrantCoordinator("relative.wal", key); c != nil || err == nil {
		t.Fatal("relative journal accepted")
	}
	root := t.TempDir()
	path := filepath.Join(root, "authority.wal")
	if err := os.WriteFile(path, bytes.Repeat([]byte{'x'}, 10), 0644); err != nil {
		t.Fatal(err)
	}
	if c, err := OpenGrantCoordinator(path, key); c != nil || err == nil {
		t.Fatal("world-readable journal accepted")
	}
	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path+".lock", []byte("prior coordinator"), 0600); err != nil {
		t.Fatal(err)
	}
	if c, err := OpenGrantCoordinator(path, key); c != nil || err == nil {
		t.Fatal("unreconciled lock bypassed")
	}
}
