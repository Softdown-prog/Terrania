package cluster

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"math"
	"sync"
	"testing"
	"time"
)

const nodes = "east=http://127.0.0.1:8788,west=http://127.0.0.1:8789,center=http://127.0.0.1:8791"

func testDirectory(t *testing.T) *RegionDirectory {
	t.Helper()
	r, err := NewRouter(nodes)
	if err != nil {
		t.Fatal(err)
	}
	d, err := NewRegionDirectory(r)
	if err != nil {
		t.Fatal(err)
	}
	return d
}

func TestProvinceFloorAndValidation(t *testing.T) {
	cases := []struct {
		x, y float64
		want Province
	}{
		{0, 0, Province{0, 0}},
		{8191, 8191, Province{0, 0}},
		{8192, 8192, Province{1, 1}},
		{-0.01, -8192, Province{-1, -1}},
		{-8192.1, -8192.1, Province{-2, -2}},
	}
	for _, c := range cases {
		got, err := ProvinceAt(c.x, c.y)
		if err != nil || got != c.want {
			t.Fatalf("at %v %v: %v %v, want %v", c.x, c.y, got, err, c.want)
		}
	}
	for _, v := range []float64{math.NaN(), math.Inf(1), math.Inf(-1), 1_000_001} {
		if _, err := ProvinceAt(v, 0); !errors.Is(err, ErrInvalidPosition) {
			t.Fatalf("accepted %v: %v", v, err)
		}
	}
}

func TestProvincePlacementReorderDoesNotChangeAuthority(t *testing.T) {
	a, _ := NewRouter(nodes)
	b, _ := NewRouter("center=http://127.0.0.1:8791,east=http://127.0.0.1:8788,west=http://127.0.0.1:8789")
	split := map[string]int{}
	for x := -70; x < 70; x++ {
		for y := -35; y < 35; y++ {
			p := Province{int64(x), int64(y)}
			n1, n2 := a.PickProvince(p), b.PickProvince(p)
			if n1.ID != n2.ID {
				t.Fatalf("province %v moved after reorder", p)
			}
			split[n1.ID]++
		}
	}
	for _, n := range []string{"east", "west", "center"} {
		if split[n] < 1000 {
			t.Fatalf("bad distribution %v", split)
		}
	}
}

func TestHandoffRequiresDigestQuiescenceAndFencesOldEpoch(t *testing.T) {
	d := testDirectory(t)
	p := Province{2, -3}
	now := time.Unix(1000, 0)
	first, err := d.Register(p, "east")
	if err != nil {
		t.Fatal(err)
	}
	h := sha256.Sum256([]byte("canonical snapshot"))
	ticket, err := d.Begin(p, "east", "west", first.Epoch, h, now)
	if err != nil {
		t.Fatal(err)
	}
	if !d.CanSimulate(p, "east", first.Epoch) || d.CanSimulate(p, "west", ticket.NewEpoch) {
		t.Fatal("authority moved before staging")
	}
	if _, err := d.Commit(ticket, now); !errors.Is(err, ErrHandoffNotReady) {
		t.Fatalf("committed before quiescence: %v", err)
	}
	wrong := sha256.Sum256([]byte("corrupted"))
	if err := d.StageDestination(ticket, wrong, now); !errors.Is(err, ErrHandoffInvalid) {
		t.Fatalf("accepted corrupt snapshot: %v", err)
	}
	if err := d.QuiesceSource(ticket, now); !errors.Is(err, ErrHandoffNotReady) {
		t.Fatalf("accepted quiescence before snapshot staging: %v", err)
	}
	if err := d.StageDestination(ticket, h, now); err != nil {
		t.Fatal(err)
	}
	if err := d.QuiesceSource(ticket, now); err != nil {
		t.Fatal(err)
	}
	if d.CanSimulate(p, "east", first.Epoch) || d.CanSimulate(p, "west", ticket.NewEpoch) {
		t.Fatal("two owners while source quiesced")
	}
	next, err := d.Commit(ticket, now)
	if err != nil {
		t.Fatal(err)
	}
	if next.WorkerID != "west" || next.Epoch != 2 || next.Phase != "active" {
		t.Fatalf("wrong owner %+v", next)
	}
	if !d.CanSimulate(p, "west", next.Epoch) || d.CanSimulate(p, "east", first.Epoch) {
		t.Fatal("fencing failed after transfer")
	}
	if replay, err := d.Commit(ticket, now); err != nil || replay != next {
		t.Fatalf("commit retry not idempotent: %+v %v", replay, err)
	}
	if _, err := d.Begin(p, "east", "center", 1, h, now); !errors.Is(err, ErrStaleOwner) {
		t.Fatalf("stale epoch accepted: %v", err)
	}
	if _, err := d.Abort(ticket); !errors.Is(err, ErrHandoffInvalid) {
		t.Fatalf("aborted committed ticket: %v", err)
	}
}

func TestHandoffExpirationAndExplicitRecovery(t *testing.T) {
	d := testDirectory(t)
	p := Province{-1, 3}
	now := time.Unix(2000, 0)
	owner, _ := d.Register(p, "east")
	h := sha256.Sum256([]byte("backup"))
	ticket, err := d.Begin(p, "east", "west", owner.Epoch, h, now)
	if err != nil {
		t.Fatal(err)
	}
	if err := d.StageDestination(ticket, h, now.Add(HandoffTTL+time.Nanosecond)); !errors.Is(err, ErrHandoffExpired) {
		t.Fatalf("accepted expired stage: %v", err)
	}
	if err := d.StageDestination(ticket, h, now); err != nil {
		t.Fatal(err)
	}
	if err := d.QuiesceSource(ticket, now); err != nil {
		t.Fatal(err)
	}
	if _, err := d.Commit(ticket, now.Add(HandoffTTL+time.Nanosecond)); !errors.Is(err, ErrHandoffExpired) {
		t.Fatalf("committed expired ticket: %v", err)
	}
	if d.CanSimulate(p, "east", owner.Epoch) || d.CanSimulate(p, "west", ticket.NewEpoch) {
		t.Fatal("timeout silently restored authority")
	}
	recovered, err := d.Abort(ticket)
	if err != nil {
		t.Fatal(err)
	}
	if recovered.WorkerID != "east" || recovered.Epoch != 2 || !d.CanSimulate(p, "east", 2) {
		t.Fatalf("abort did not fence prior epoch: %+v", recovered)
	}
	if d.CanSimulate(p, "east", 1) {
		t.Fatal("old source epoch revived")
	}
	other, err := d.Begin(p, "east", "center", 2, h, now.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if other.Token == ticket.Token {
		t.Fatal("reused transfer nonce")
	}
}

func TestHandoffRejectsTamperingAndConcurrentTransfers(t *testing.T) {
	d := testDirectory(t)
	p := Province{9, 9}
	now := time.Unix(4000, 0)
	_, _ = d.Register(p, "east")
	hash := sha256.Sum256([]byte("snapshot"))
	tk, err := d.Begin(p, "east", "west", 1, hash, now)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := d.Begin(p, "east", "center", 1, hash, now); !errors.Is(err, ErrRegionBusy) {
		t.Fatal("overlapping transfer accepted")
	}
	for _, bad := range []TransferTicket{
		func() TransferTicket { x := tk; x.To = "center"; return x }(),
		func() TransferTicket { x := tk; x.Token = "fake"; return x }(),
		func() TransferTicket { x := tk; x.NewEpoch++; return x }(),
	} {
		if err := d.StageDestination(bad, hash, now); !errors.Is(err, ErrHandoffInvalid) {
			t.Fatalf("accepted tampering %+v: %v", bad, err)
		}
	}
	if _, err := d.Register(p, "west"); !errors.Is(err, ErrStaleOwner) {
		t.Fatal("reassigned registered province")
	}
	if _, err := d.Register(p, "ghost"); !errors.Is(err, ErrWorkerUnknown) {
		t.Fatal("unregistered worker")
	}
}

func TestParallelProvinceTransfersRemainIsolated(t *testing.T) {
	d := testDirectory(t)
	const provinces = 512
	var wg sync.WaitGroup
	errorsCh := make(chan error, provinces)
	now := time.Unix(5000, 0)
	h := sha256.Sum256([]byte("same hash, different provinces"))
	for i := 0; i < provinces; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			p := Province{X: int64(i), Y: int64(-i)}
			if _, err := d.Register(p, "east"); err != nil {
				errorsCh <- err
				return
			}
			ticket, err := d.Begin(p, "east", "west", 1, h, now)
			if err != nil {
				errorsCh <- err
				return
			}
			if err := d.StageDestination(ticket, h, now); err != nil {
				errorsCh <- err
				return
			}
			if err := d.QuiesceSource(ticket, now); err != nil {
				errorsCh <- err
				return
			}
			owner, err := d.Commit(ticket, now)
			if err != nil {
				errorsCh <- err
				return
			}
			if owner.WorkerID != "west" || !d.CanSimulate(p, "west", 2) {
				errorsCh <- fmt.Errorf("wrong owner for %v", p)
			}
		}(i)
	}
	wg.Wait()
	close(errorsCh)
	for err := range errorsCh {
		t.Error(err)
	}
}
