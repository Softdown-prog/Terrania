package cluster

import (
	"crypto/sha256"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func persistentDirectory(t *testing.T, path string) *RegionDirectory {
	t.Helper()
	router, err := NewRouter(nodes)
	if err != nil {
		t.Fatal(err)
	}
	d, err := NewPersistentRegionDirectory(router, path)
	if err != nil {
		t.Fatal(err)
	}
	return d
}

func TestJournalFullHandoffReplaysFailClosed(t *testing.T) {
	path := filepath.Join(t.TempDir(), "regions.wal")
	d := persistentDirectory(t, path)
	p := Province{X: -4, Y: 17}
	s, err := d.Register(p, "east")
	if err != nil {
		t.Fatal(err)
	}
	if !d.CanSimulate(p, "east", 1) {
		t.Fatal("new registered province not authoritative")
	}
	digest := sha256.Sum256([]byte("region snapshot payload"))
	now := time.Now()
	ticket, err := d.Begin(p, "east", "west", s.Epoch, digest, now)
	if err != nil {
		t.Fatal(err)
	}
	if err := d.FreezeSource(ticket, now); err != nil {
		t.Fatal(err)
	}
	if err := d.StageDestination(ticket, digest, now); err != nil {
		t.Fatal(err)
	}
	if err := d.QuiesceSource(ticket, now); err != nil {
		t.Fatal(err)
	}
	n, err := d.Commit(ticket, now)
	if err != nil || n.WorkerID != "west" || n.Epoch != 2 {
		t.Fatalf("commit failed %+v %v", n, err)
	}
	if err := d.Close(); err != nil {
		t.Fatal(err)
	}
	if d.CanSimulate(p, "west", 2) {
		t.Fatal("closed coordinator authorizes simulation")
	}
	d2 := persistentDirectory(t, path)
	defer d2.Close()
	status, err := d2.Status(p)
	if err != nil {
		t.Fatal(err)
	}
	if status.WorkerID != "west" || status.Epoch != 2 || status.Phase != "recovery-required" {
		t.Fatalf("restarted directory did not fence owner: %+v", status)
	}
	if d2.CanSimulate(p, "west", 2) || d2.CanSimulate(p, "east", 1) {
		t.Fatal("authoritative worker resumed without offline reconciliation")
	}
	if _, err := d2.Register(p, "west"); !errors.Is(err, ErrRegionRecoveryRequired) {
		t.Fatalf("recovery bypassed with register: %v", err)
	}
	if _, err := d2.Begin(p, "west", "center", 2, digest, now); !errors.Is(err, ErrRegionRecoveryRequired) {
		t.Fatalf("recovered worker began new transfer: %v", err)
	}
	if _, err := d2.Commit(ticket, now); !errors.Is(err, ErrRegionRecoveryRequired) {
		t.Fatalf("replayed committed ticket bypassed recovery: %v", err)
	}
	if _, err := d2.Abort(ticket); !errors.Is(err, ErrRegionRecoveryRequired) {
		t.Fatalf("replayed abort bypassed recovery: %v", err)
	}
}

func TestJournalReplaysEveryInterruptedTransferStage(t *testing.T) {
	path := filepath.Join(t.TempDir(), "regions.wal")
	d := persistentDirectory(t, path)
	now := time.Now()
	hash := sha256.Sum256([]byte("snap"))
	for i := 0; i < 4; i++ {
		p := Province{X: int64(i), Y: 1}
		_, err := d.Register(p, "east")
		if err != nil {
			t.Fatal(err)
		}
		if i == 0 {
			continue
		} // active in durable log
		tk, err := d.Begin(p, "east", "west", 1, hash, now)
		if err != nil {
			t.Fatal(err)
		}
		if i == 1 {
			continue
		} // pending but source not frozen
		if err := d.FreezeSource(tk, now); err != nil {
			t.Fatal(err)
		}
		if i == 2 {
			continue
		} // source frozen
		if err := d.StageDestination(tk, hash, now); err != nil {
			t.Fatal(err)
		}
		// staged but no source quiescence or commit
	}
	if err := d.Close(); err != nil {
		t.Fatal(err)
	}
	reloaded := persistentDirectory(t, path)
	defer reloaded.Close()
	for i := 0; i < 4; i++ {
		p := Province{X: int64(i), Y: 1}
		status, err := reloaded.Status(p)
		if err != nil || status.Phase != "recovery-required" {
			t.Fatalf("unsafe recovery at %d: %+v %v", i, status, err)
		}
		if reloaded.CanSimulate(p, "east", 1) || reloaded.CanSimulate(p, "west", 2) {
			t.Fatalf("unfenced stage %d", i)
		}
		if i != 0 {
			if _, err := reloaded.Register(p, "east"); !errors.Is(err, ErrRegionRecoveryRequired) {
				t.Fatalf("re-registration unblocked pending transfer %d: %v", i, err)
			}
		}
	}
}

func TestJournalCorruptionAndPartialWritesDoNotBecomeAuthoritative(t *testing.T) {
	path := filepath.Join(t.TempDir(), "regions.wal")
	d := persistentDirectory(t, path)
	if _, err := d.Register(Province{1, 2}, "east"); err != nil {
		t.Fatal(err)
	}
	if err := d.Close(); err != nil {
		t.Fatal(err)
	}
	original, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	router, err := NewRouter(nodes)
	if err != nil {
		t.Fatal(err)
	}
	cases := map[string][]byte{
		"header-truncated":                 original[:9],
		"body-truncated":                   original[:len(original)-1],
		"checksum-mutated":                 append([]byte(nil), original...),
		"additional-random-trailing-bytes": append(append([]byte(nil), original...), 0x80),
	}
	cases["checksum-mutated"][len(cases["checksum-mutated"])-1] ^= 0xff
	for name, payload := range cases {
		t.Run(name, func(t *testing.T) {
			file := filepath.Join(t.TempDir(), "regions.wal")
			if err := os.WriteFile(file, payload, 0600); err != nil {
				t.Fatal(err)
			}
			d2, err := NewPersistentRegionDirectory(router, file)
			if d2 != nil || !errors.Is(err, ErrRegionJournalCorrupt) {
				t.Fatalf("accepted corrupt journal: directory=%v err=%v", d2, err)
			}
		})
	}
}

func TestJournalWriteFailureFencesAllOwnersWithoutPublishing(t *testing.T) {
	path := filepath.Join(t.TempDir(), "regions.wal")
	d := persistentDirectory(t, path)
	p := Province{3, 3}
	if _, err := d.Register(p, "east"); err != nil {
		t.Fatal(err)
	}
	if err := d.journal.file.Close(); err != nil {
		t.Fatal(err)
	}
	_, err := d.Register(Province{4, 3}, "west")
	if !errors.Is(err, ErrRegionStorageFailed) {
		t.Fatalf("write failure not detected: %v", err)
	}
	if d.CanSimulate(p, "east", 1) {
		t.Fatal("active owner remained authorized after persistence failure")
	}
	if _, err := d.Begin(p, "east", "west", 1, sha256.Sum256([]byte("snapshot")), time.Now()); !errors.Is(err, ErrRegionStorageFailed) {
		t.Fatalf("persist failure was ignored on subsequent command: %v", err)
	}
}

func TestJournalConcurrentMutationsReplayAllRegionsFailClosed(t *testing.T) {
	path := filepath.Join(t.TempDir(), "regions.wal")
	d := persistentDirectory(t, path)
	const total = 64
	var wg sync.WaitGroup
	errs := make(chan error, total)
	for i := 0; i < total; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := d.Register(Province{X: int64(i), Y: 99}, "east")
			if err != nil {
				errs <- err
			}
		}(i)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatal(err)
	}
	if err := d.Close(); err != nil {
		t.Fatal(err)
	}
	second := persistentDirectory(t, path)
	defer second.Close()
	for i := 0; i < total; i++ {
		p := Province{X: int64(i), Y: 99}
		s, err := second.Status(p)
		if err != nil || s.Epoch != 1 || s.Phase != "recovery-required" {
			t.Fatalf("journal lost region %v: %+v %v", p, s, err)
		}
	}
}

func TestJournalRejectsUnsafePathsAndPermissions(t *testing.T) {
	router, err := NewRouter(nodes)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := NewPersistentRegionDirectory(router, "relative-file.wal"); err == nil {
		t.Fatal("relative path accepted")
	}
	f := filepath.Join(t.TempDir(), "insecure.wal")
	if err := os.WriteFile(f, nil, 0644); err != nil {
		t.Fatal(err)
	}
	if _, err := NewPersistentRegionDirectory(router, f); err == nil {
		t.Fatal("world-readable journal accepted")
	}
	target := filepath.Join(t.TempDir(), "target.wal")
	if err := os.WriteFile(target, nil, 0600); err != nil {
		t.Fatal(err)
	}
	symlink := filepath.Join(t.TempDir(), "link.wal")
	if err := os.Symlink(target, symlink); err != nil {
		t.Fatal(err)
	}
	if _, err := NewPersistentRegionDirectory(router, symlink); err == nil {
		t.Fatal("symlink journal accepted")
	}
}

func TestJournalSingleWriterExclusiveOwnership(t *testing.T) {
	path := filepath.Join(t.TempDir(), "regions.wal")
	first := persistentDirectory(t, path)
	r, err := NewRouter(nodes)
	if err != nil {
		t.Fatal(err)
	}
	if other, err := NewPersistentRegionDirectory(r, path); err == nil || other != nil {
		t.Fatalf("two coordinators opened one journal: %+v %v", other, err)
	}
	if _, err := first.Register(Province{100, 200}, "east"); err != nil {
		t.Fatal(err)
	}
	if err := first.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path + ".lock"); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("clean close failed to release exclusive marker: %v", err)
	}
	next := persistentDirectory(t, path)
	defer next.Close()
	status, err := next.Status(Province{100, 200})
	if err != nil || status.Phase != "recovery-required" {
		t.Fatalf("reopened improperly: %+v %v", status, err)
	}
}

func TestJournalRefusesUnreconciledStaleLock(t *testing.T) {
	path := filepath.Join(t.TempDir(), "regions.wal")
	if err := os.WriteFile(path+".lock", []byte("stale"), 0600); err != nil {
		t.Fatal(err)
	}
	r, err := NewRouter(nodes)
	if err != nil {
		t.Fatal(err)
	}
	if d, err := NewPersistentRegionDirectory(r, path); err == nil || d != nil {
		t.Fatalf("stale lock must block startup: %v", err)
	}
}
