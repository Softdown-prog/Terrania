package autoscale

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"sync"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/cluster"
)

type fakeRuntime struct {
	mu         sync.Mutex
	created    int
	started    int
	removed    int
	readyCalls int
	notReady   int
	failStop   bool
	failStart  bool
}

func (f *fakeRuntime) Create(_ context.Context, id string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.created++
	return fmt.Sprintf("%064x", f.created), nil
}
func (f *fakeRuntime) Start(_ context.Context, id, cid string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.started++
	if f.failStart {
		return errors.New("cannot start")
	}
	return nil
}
func (f *fakeRuntime) ReadyBackend(_ context.Context, id, cid string) (cluster.Backend, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.readyCalls++
	if f.notReady > 0 {
		f.notReady--
		return cluster.Backend{}, ErrWorkerNotReady
	}
	u, _ := url.Parse("http://127.0.0.1:8788")
	return cluster.Backend{ID: id, URL: u}, nil
}
func (f *fakeRuntime) StopAndRemove(_ context.Context, id, cid string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.failStop {
		return errors.New("docker unavailable")
	}
	f.removed++
	return nil
}
func newTestSupervisor(t *testing.T, run *fakeRuntime) (*Supervisor, *cluster.WorkerRegistry) {
	t.Helper()
	r, err := cluster.NewWorkerRegistry(48, 8)
	if err != nil {
		t.Fatal(err)
	}
	s := NewSupervisor(run, LocalWorkerDirectory{Registry: r})
	s.readyAttempts = 3
	s.readyInterval = time.Millisecond
	return s, r
}
func TestSupervisorProvisionReadyThenDrainLiveSession(t *testing.T) {
	f := &fakeRuntime{notReady: 1}
	s, r := newTestSupervisor(t, f)
	ctx := context.Background()
	if err := s.ProvisionOne(ctx, "as-worker-0001"); err != nil {
		t.Fatal(err)
	}
	if f.created != 1 || f.started != 1 || f.readyCalls != 2 || r.Count() != 1 {
		t.Fatalf("incorrect provision sequence: %+v status=%+v", f, r.Snapshot())
	}
	node, release, err := r.Acquire("origins")
	if err != nil || node.ID != "as-worker-0001" {
		t.Fatalf("route failed: %v %v", node, err)
	}
	if stopped, err := s.DrainOrStopOne(ctx, "as-worker-0001"); stopped || err != nil {
		t.Fatalf("drain result: %v %v", stopped, err)
	}
	if _, _, err := r.Acquire("new-room"); !errors.Is(err, cluster.ErrNoWorkerCapacity) {
		t.Fatalf("drained worker accepted a new room: %v", err)
	}
	if stopped, err := s.DrainOrStopOne(ctx, "as-worker-0001"); stopped || !errors.Is(err, ErrSupervisorBusy) {
		t.Fatalf("occupied worker removed: %v %v", stopped, err)
	}
	if f.removed != 0 {
		t.Fatal("docker stop occurred with active session")
	}
	release()
	stopped, err := s.DrainOrStopOne(ctx, "as-worker-0001")
	if err != nil || !stopped || s.ManagedCount() != 0 || r.Count() != 0 || f.removed != 1 {
		t.Fatalf("drained worker stop failed: stopped=%v err=%v removed=%d", stopped, err, f.removed)
	}
}
func TestSupervisorFailsClosedWhenHealthNeverReady(t *testing.T) {
	f := &fakeRuntime{notReady: 100}
	s, r := newTestSupervisor(t, f)
	if err := s.ProvisionOne(context.Background(), "as-worker-0001"); !errors.Is(err, ErrWorkerNotReady) {
		t.Fatalf("unhealthy worker registered: %v", err)
	}
	if r.Count() != 0 || s.ManagedCount() != 0 || f.removed != 1 {
		t.Fatalf("failed startup not cleaned: %+v", f)
	}
}
func TestSupervisorCleansFailedStart(t *testing.T) {
	f := &fakeRuntime{failStart: true}
	s, r := newTestSupervisor(t, f)
	if err := s.ProvisionOne(context.Background(), "as-worker-0001"); err == nil {
		t.Fatal("start failure accepted")
	}
	if r.Count() != 0 || f.removed != 1 {
		t.Fatalf("failed start not cleaned: %+v", f)
	}
}
func TestSupervisorStopRetryRetainsOwnership(t *testing.T) {
	f := &fakeRuntime{failStop: true}
	s, r := newTestSupervisor(t, f)
	if err := s.ProvisionOne(context.Background(), "as-worker-0001"); err != nil {
		t.Fatal(err)
	}
	if stopped, err := s.DrainOrStopOne(context.Background(), "as-worker-0001"); err != nil || stopped {
		t.Fatal(err)
	}
	if stopped, err := s.DrainOrStopOne(context.Background(), "as-worker-0001"); err == nil || stopped {
		t.Fatal("Docker failure incorrectly reported success")
	}
	if s.ManagedCount() != 1 || r.Count() != 0 {
		t.Fatal("must retain container ID for retry but block admissions")
	}
	f.mu.Lock()
	f.failStop = false
	f.mu.Unlock()
	if stopped, err := s.DrainOrStopOne(context.Background(), "as-worker-0001"); err != nil || !stopped {
		t.Fatalf("retry failed: %v", err)
	}
	if s.ManagedCount() != 0 || f.removed != 1 {
		t.Fatal("leaked tracked container")
	}
}
func TestSupervisorRefusesUnownedWorkersAndInvalidIDs(t *testing.T) {
	f := &fakeRuntime{}
	s, _ := newTestSupervisor(t, f)
	if _, err := s.DrainOrStopOne(context.Background(), "otherproject"); !errors.Is(err, ErrDockerConfig) {
		t.Fatal(err)
	}
	if _, err := s.DrainOrStopOne(context.Background(), "as-worker-9999"); !errors.Is(err, ErrUnmanagedWorker) {
		t.Fatal(err)
	}
	if err := s.ProvisionOne(context.Background(), "../../other-project"); !errors.Is(err, ErrDockerConfig) {
		t.Fatal(err)
	}
	if f.removed != 0 {
		t.Fatal("unexpected destructive Docker operation")
	}
}
func TestSupervisorConcurrentDuplicateProvisionIsSerialized(t *testing.T) {
	f := &fakeRuntime{}
	s, r := newTestSupervisor(t, f)
	var wg sync.WaitGroup
	results := make(chan error, 24)
	for i := 0; i < 24; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); results <- s.ProvisionOne(context.Background(), "as-worker-0001") }()
	}
	wg.Wait()
	close(results)
	success, dup := 0, 0
	for err := range results {
		switch {
		case err == nil:
			success++
		case errors.Is(err, ErrSupervisorExists):
			dup++
		default:
			t.Fatalf("unexpected error: %v", err)
		}
	}
	if success != 1 || dup != 23 || f.created != 1 || r.Count() != 1 {
		t.Fatalf("duplicate provision: success=%d dup=%d created=%d", success, dup, f.created)
	}
}
