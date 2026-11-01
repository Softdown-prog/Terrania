package cluster

import (
	"crypto/ed25519"
	"crypto/rand"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

type electionLab struct {
	roster ElectionRoster
	voters []*ElectionWitness
	keys   []ed25519.PrivateKey
}

func newElectionLab(t *testing.T, n int) *electionLab {
	t.Helper()
	l := &electionLab{roster: ElectionRoster{
		ClusterID: "terrania-lab", Members: make(map[string]ed25519.PublicKey),
	}}
	for i := 0; i < n; i++ {
		pub, key, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			t.Fatal(err)
		}
		id := "voter-" + string(rune('a'+i))
		w, err := OpenElectionWitness(filepath.Join(t.TempDir(), "votes.wal"), "terrania-lab", id, key)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() {
			if err := w.Close(); err != nil {
				t.Error(err)
			}
		})
		l.voters = append(l.voters, w)
		l.keys = append(l.keys, key)
		l.roster.Members[id] = pub
	}
	return l
}

func TestElectionFiveVotersPartitionCannotCertifyMinority(t *testing.T) {
	l := newElectionLab(t, 5)
	var minority []ElectionVote
	for i := 0; i < 2; i++ {
		v, err := l.voters[i].Vote(7, "candidate-a")
		if err != nil {
			t.Fatal(err)
		}
		minority = append(minority, v)
	}
	cert := ElectionCertificate{
		ClusterID: "terrania-lab", CandidateID: "candidate-a", Term: 7, Votes: minority,
	}
	if err := VerifyElectionCertificate(l.roster, cert); !errors.Is(err, ErrElectionNoQuorum) {
		t.Fatalf("partition of two voters gained majority: %v", err)
	}
	third, err := l.voters[2].Vote(7, "candidate-a")
	if err != nil {
		t.Fatal(err)
	}
	cert.Votes = append(cert.Votes, third)
	if err := VerifyElectionCertificate(l.roster, cert); err != nil {
		t.Fatal(err)
	}
	// The minority cannot issue a competing certificate for this term.
	for i := 3; i < 5; i++ {
		if _, err := l.voters[i].Vote(7, "candidate-b"); err != nil {
			t.Fatal(err)
		}
	}
	for i := 0; i < 3; i++ {
		if _, err := l.voters[i].Vote(7, "candidate-b"); !errors.Is(err, ErrElectionConflict) {
			t.Fatalf("voter %d double-voted for competing candidate: %v", i, err)
		}
	}
}

func TestElectionCertificateRejectsReplayTamperingDuplicateAndFakeMembers(t *testing.T) {
	l := newElectionLab(t, 3)
	votes := make([]ElectionVote, 0, 2)
	for i := 0; i < 2; i++ {
		v, err := l.voters[i].Vote(12, "candidate-a")
		if err != nil {
			t.Fatal(err)
		}
		votes = append(votes, v)
	}
	base := ElectionCertificate{ClusterID: "terrania-lab", CandidateID: "candidate-a", Term: 12, Votes: votes}
	if err := VerifyElectionCertificate(l.roster, base); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name   string
		mutate func(*ElectionCertificate)
	}{
		{"duplicate member", func(c *ElectionCertificate) { c.Votes[1] = c.Votes[0] }},
		{"wrong term", func(c *ElectionCertificate) { c.Term++ }},
		{"changed candidate", func(c *ElectionCertificate) { c.CandidateID = "candidate-b" }},
		{"changed cluster", func(c *ElectionCertificate) { c.ClusterID = "another-cluster" }},
		{"changed member", func(c *ElectionCertificate) { c.Votes[0].MemberID = "unregistered" }},
		{"changed signature", func(c *ElectionCertificate) { c.Votes[0].Signature = "00" }},
		{"mixed-term votes", func(c *ElectionCertificate) { c.Votes[1].Term++ }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			c := base
			c.Votes = append([]ElectionVote(nil), base.Votes...)
			tc.mutate(&c)
			if err := VerifyElectionCertificate(l.roster, c); err == nil {
				t.Fatal("forged/contradictory certificate verified")
			}
		})
	}
	badRoster := ElectionRoster{ClusterID: l.roster.ClusterID, Members: map[string]ed25519.PublicKey{
		"voter-a": l.roster.Members["voter-a"],
		"voter-b": l.roster.Members["voter-a"],
		"voter-c": l.roster.Members["voter-c"],
	}}
	if err := VerifyElectionCertificate(badRoster, base); !errors.Is(err, ErrElectionInvalid) {
		t.Fatalf("duplicate signing key allowed two votes: %v", err)
	}
}

func TestElectionWitnessRestartDurabilityAndTermHighWater(t *testing.T) {
	pub, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "vote.wal")
	w, err := OpenElectionWitness(path, "terrania-lab", "voter-a", key)
	if err != nil {
		t.Fatal(err)
	}
	if err := w.ObserveTerm(6); err != nil {
		t.Fatal(err)
	}
	if _, err := w.Vote(5, "candidate-a"); !errors.Is(err, ErrElectionConflict) {
		t.Fatalf("lower term was accepted: %v", err)
	}
	first, err := w.Vote(6, "candidate-a")
	if err != nil {
		t.Fatal(err)
	}
	same, err := w.Vote(6, "candidate-a")
	if err != nil || first != same {
		t.Fatalf("idempotent vote changed: %v", err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := OpenElectionWitness(path, "terrania-lab", "voter-a", key)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	if _, err := reopened.Vote(6, "candidate-b"); !errors.Is(err, ErrElectionConflict) {
		t.Fatalf("restart forgot previous vote: %v", err)
	}
	if _, err := reopened.Vote(6, "candidate-a"); err != nil {
		t.Fatal(err)
	}
	if err := reopened.ObserveTerm(8); err != nil {
		t.Fatal(err)
	}
	if _, err := reopened.Vote(7, "candidate-a"); !errors.Is(err, ErrElectionConflict) {
		t.Fatalf("witness regressed after observing term 8: %v", err)
	}
	if _, err := reopened.Vote(8, "candidate-b"); err != nil {
		t.Fatal(err)
	}
	if err := VerifyElectionCertificate(ElectionRoster{
		ClusterID: "terrania-lab", Members: map[string]ed25519.PublicKey{"voter-a": pub},
	}, ElectionCertificate{}); !errors.Is(err, ErrElectionNoQuorum) {
		t.Fatalf("single voter certificate accepted: %v", err)
	}
}

func TestElectionWitnessConcurrentVoteOnlyOneCandidateWins(t *testing.T) {
	_, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	w, err := OpenElectionWitness(filepath.Join(t.TempDir(), "votes.wal"), "terrania-lab", "voter-a", key)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	const contenders = 64
	var wg sync.WaitGroup
	results := make(chan struct {
		candidate string
		err       error
	}, contenders)
	for i := 0; i < contenders; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			candidate := "candidate-a"
			if i%2 == 1 {
				candidate = "candidate-b"
			}
			_, err := w.Vote(3, candidate)
			results <- struct {
				candidate string
				err       error
			}{candidate, err}
		}(i)
	}
	wg.Wait()
	close(results)
	winner := ""
	successes := 0
	for r := range results {
		if r.err != nil {
			if !errors.Is(r.err, ErrElectionConflict) {
				t.Fatal(r.err)
			}
			continue
		}
		successes++
		if winner != "" && winner != r.candidate {
			t.Fatal("witness double-voted in one term")
		}
		winner = r.candidate
	}
	if successes == 0 {
		t.Fatal("no candidate won")
	}
}

func TestElectionWitnessCorruptAndStaleLockFailClosed(t *testing.T) {
	_, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "votes.wal")
	w, err := OpenElectionWitness(path, "terrania-lab", "voter-a", key)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := w.Vote(1, "candidate-a"); err != nil {
		t.Fatal(err)
	}
	if duplicate, err := OpenElectionWitness(path, "terrania-lab", "voter-a", key); err == nil || duplicate != nil {
		t.Fatal("second writer bypassed lock")
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	mutated := append([]byte(nil), data...)
	mutated[len(mutated)-1] ^= 0x01
	for name, payload := range map[string][]byte{
		"truncated-header": data[:7],
		"truncated-body":   data[:len(data)-1],
		"invalid-checksum": mutated,
		"extra-trailing":   append(append([]byte(nil), data...), 0x11),
	} {
		t.Run(name, func(t *testing.T) {
			target := filepath.Join(t.TempDir(), "damaged.wal")
			if err := os.WriteFile(target, payload, 0600); err != nil {
				t.Fatal(err)
			}
			if reopened, err := OpenElectionWitness(target, "terrania-lab", "voter-a", key); reopened != nil || !errors.Is(err, ErrElectionCorrupt) {
				t.Fatalf("accepted corrupt journal: %v", err)
			}
		})
	}
	_, rotatedKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	if reopened, err := OpenElectionWitness(path, "terrania-lab", "voter-a", rotatedKey); reopened != nil || !errors.Is(err, ErrElectionCorrupt) {
		t.Fatalf("accepted signer rotation without new member configuration: %v", err)
	}
	if err := os.WriteFile(path+".lock", nil, 0600); err != nil {
		t.Fatal(err)
	}
	if reopened, err := OpenElectionWitness(path, "terrania-lab", "voter-a", key); reopened != nil || err == nil {
		t.Fatal("stale lock failed open")
	}
}
