package cluster

import (
	"errors"
	"fmt"
	"net/url"
	"reflect"
	"sync"
	"testing"
)

func registryForTest(t *testing.T, seats, rooms int) *WorkerRegistry {
	t.Helper()
	r, err := NewWorkerRegistry(seats, rooms)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func registerForTest(t *testing.T, r *WorkerRegistry, id string) {
	t.Helper()
	u, err := url.Parse("http://" + id + ":8788")
	if err != nil {
		t.Fatal(err)
	}
	if err := r.Register(Backend{ID: id, URL: u}); err != nil {
		t.Fatal(err)
	}
	if err := r.SetReady(id, true); err != nil {
		t.Fatal(err)
	}
}

func TestRegistryStickyRoomsAcrossRegistrationAndDrain(t *testing.T) {
	r := registryForTest(t, 48, 8)
	registerForTest(t, r, "a")
	first, doneA, err := r.Acquire("origins")
	if err != nil || first.ID != "a" {
		t.Fatalf("first: %v %v", first, err)
	}
	registerForTest(t, r, "b")
	second, doneB, err := r.Acquire("origins")
	if err != nil || second.ID != "a" {
		t.Fatalf("active room moved: %v %v", second, err)
	}
	newRoom, doneC, err := r.Acquire("origins-2")
	if err != nil || newRoom.ID != "b" {
		t.Fatalf("new room must use available worker: %v %v", newRoom, err)
	}
	if err := r.Drain("a"); err != nil {
		t.Fatal(err)
	}
	if err := r.Remove("a"); !errors.Is(err, ErrWorkerBusy) {
		t.Fatalf("removed occupied worker: %v", err)
	}
	if _, _, err := r.Acquire("origins"); !errors.Is(err, ErrNoWorkerCapacity) {
		t.Fatalf("draining room silently redirected: %v", err)
	}
	fresh, release, err := r.Acquire("origins-3")
	if err != nil || fresh.ID != "b" {
		t.Fatalf("new room must not enter draining worker: %v %v", fresh, err)
	}
	release()
	doneA()
	doneA() // releases are idempotent
	doneB()
	if err := r.Remove("a"); err != nil {
		t.Fatalf("empty drained worker: %v", err)
	}
	doneC()
	if len(r.Snapshot()) != 1 || r.Count() != 1 {
		t.Fatalf("unexpected workers after drain: %+v", r.Snapshot())
	}
}
func TestRegistryRequiresReadinessAndExplicitDrain(t *testing.T) {
	r := registryForTest(t, 2, 1)
	u, _ := url.Parse("http://worker:8788")
	if err := r.Register(Backend{ID: "worker", URL: u}); err != nil {
		t.Fatal(err)
	}
	if _, _, err := r.Acquire("x"); !errors.Is(err, ErrNoWorkerCapacity) {
		t.Fatal(err)
	}
	if err := r.Remove("worker"); !errors.Is(err, ErrWorkerNotDrained) {
		t.Fatal(err)
	}
	if err := r.SetReady("worker", true); err != nil {
		t.Fatal(err)
	}
	_, done, err := r.Acquire("x")
	if err != nil {
		t.Fatal(err)
	}
	_, done2, err := r.Acquire("x")
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := r.Acquire("x"); !errors.Is(err, ErrNoWorkerCapacity) {
		t.Fatal("overbooked occupied worker")
	}
	if _, _, err := r.Acquire("y"); !errors.Is(err, ErrNoWorkerCapacity) {
		t.Fatal("exceeded max rooms")
	}
	if err := r.Drain("worker"); err != nil {
		t.Fatal(err)
	}
	if err := r.SetReady("worker", true); !errors.Is(err, ErrWorkerNotDrained) {
		t.Fatal(err)
	}
	done()
	done2()
	if err := r.Remove("worker"); err != nil {
		t.Fatal(err)
	}
	if err := r.SetReady("worker", true); !errors.Is(err, ErrWorkerMissing) {
		t.Fatal(err)
	}
}

func TestRegistryConcurrentAdmissionNeverOverbooks(t *testing.T) {
	r := registryForTest(t, 48, 8)
	registerForTest(t, r, "a")
	registerForTest(t, r, "b")
	type result struct {
		release func()
		err     error
	}
	results := make(chan result, 500)
	var wg sync.WaitGroup
	for i := 0; i < 500; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, done, err := r.Acquire(fmt.Sprintf("room-%d", i%16))
			results <- result{done, err}
		}(i)
	}
	wg.Wait()
	close(results)
	accepted := 0
	var releases []func()
	for x := range results {
		if x.err == nil {
			accepted++
			releases = append(releases, x.release)
		} else if !errors.Is(x.err, ErrNoWorkerCapacity) {
			t.Fatalf("unexpected admission failure: %v", x.err)
		}
	}
	if accepted != 96 {
		t.Fatalf("accepted %d, max per-worker 48 x2", accepted)
	}
	for _, s := range r.Snapshot() {
		if s.Clients > 48 || s.Rooms > 8 {
			t.Fatalf("overbooked: %+v", s)
		}
	}
	for _, done := range releases {
		done()
	}
	for _, s := range r.Snapshot() {
		if s.Clients != 0 || s.Rooms != 0 {
			t.Fatalf("leaked sessions: %+v", s)
		}
	}
}
func TestRegistryRejectsUntrustedMalformedMembership(t *testing.T) {
	r := registryForTest(t, 48, 8)
	for _, raw := range []string{"file:///tmp/socket", "http://user:password@worker:8788", "https://worker:8788/private", "http://worker:8788/?room=foo"} {
		u, _ := url.Parse(raw)
		if err := r.Register(Backend{ID: "worker", URL: u}); err == nil {
			t.Fatalf("accepted invalid worker URL: %q", raw)
		}
	}
	registerForTest(t, r, "worker")
	u, _ := url.Parse("http://other:8788")
	if err := r.Register(Backend{ID: "worker", URL: u}); !errors.Is(err, ErrWorkerAlreadyRegistered) {
		t.Fatal(err)
	}
}
func TestRegistrySnapshotIsSortedAndImmutable(t *testing.T) {
	r := registryForTest(t, 48, 8)
	registerForTest(t, r, "z")
	registerForTest(t, r, "a")
	s := r.Snapshot()
	if !reflect.DeepEqual([]string{s[0].ID, s[1].ID}, []string{"a", "z"}) {
		t.Fatal(s)
	}
	s[0].ID = "changed"
	if r.Snapshot()[0].ID != "a" {
		t.Fatal("snapshot mutated directory")
	}
}
func TestRegistryRejectsNilOrInvalidConfig(t *testing.T) {
	if _, err := NewWorkerRegistry(0, 1); err == nil {
		t.Fatal("zero seats accepted")
	}
	if _, err := NewWorkerRegistry(1, 0); err == nil {
		t.Fatal("zero rooms accepted")
	}
	var nilRegistry *WorkerRegistry
	if _, _, err := nilRegistry.Acquire("x"); err == nil {
		t.Fatal("nil registry accepted")
	}
	if err := nilRegistry.Register(Backend{}); err == nil {
		t.Fatal("nil register accepted")
	}
	if err := nilRegistry.Remove("x"); err == nil {
		t.Fatal("nil remove accepted")
	}
}
