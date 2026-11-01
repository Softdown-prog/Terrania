package cluster

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func testReplicaOperationHash(message string) string {
	sum := sha256.Sum256([]byte(message))
	return hex.EncodeToString(sum[:])
}

func testReplicaElection(t *testing.T, lab *electionLab, term uint64, leader string, participants ...int) ElectionCertificate {
	t.Helper()
	cert := ElectionCertificate{ClusterID: lab.roster.ClusterID, CandidateID: leader, Term: term}
	for _, i := range participants {
		v, err := lab.voters[i].Vote(term, leader)
		if err != nil {
			t.Fatal(err)
		}
		cert.Votes = append(cert.Votes, v)
	}
	return cert
}

func testReplicaMembers(t *testing.T, lab *electionLab) []*ReplicaLog {
	t.Helper()
	result := make([]*ReplicaLog, 0, len(lab.voters))
	for i, v := range lab.voters {
		r, err := OpenReplicaLog(filepath.Join(t.TempDir(), "replica.wal"), lab.roster.ClusterID, v.member, lab.keys[i])
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() {
			if err := r.Close(); err != nil {
				t.Error(err)
			}
		})
		result = append(result, r)
	}
	return result
}

func testReplicaEntry(lab *electionLab, term, index uint64, leader, previous, operation, content string) AuthorityLogEntry {
	return AuthorityLogEntry{ClusterID: lab.roster.ClusterID, LeaderID: leader, Term: term, Index: index,
		PreviousHash: previous, Operation: operation, OperationHash: testReplicaOperationHash(content)}
}

func TestReplicaMajorityConfirmationAndMinorityPartition(t *testing.T) {
	lab := newElectionLab(t, 5)
	replicas := testReplicaMembers(t, lab)
	cert := testReplicaElection(t, lab, 12, "leader-a", 0, 1, 2)
	entry := testReplicaEntry(lab, 12, 1, "leader-a", zeroReplicaHash, "grant", "province 1 epoch 1")
	var receipts []ReplicaReceipt
	for i := 0; i < 2; i++ {
		ack, err := replicas[i].AppendCandidate(lab.roster, cert, entry)
		if err != nil {
			t.Fatal(err)
		}
		receipts = append(receipts, ack)
	}
	proof := ReplicaCommitProof{Election: cert, Entry: entry, Receipts: receipts}
	if err := VerifyReplicaCommitProof(lab.roster, proof); !errors.Is(err, ErrReplicaNoQuorum) {
		t.Fatalf("minority partition confirmed log operation: %v", err)
	}
	third, err := replicas[2].AppendCandidate(lab.roster, cert, entry)
	if err != nil {
		t.Fatal(err)
	}
	proof.Receipts = append(proof.Receipts, third)
	if err := VerifyReplicaCommitProof(lab.roster, proof); err != nil {
		t.Fatal(err)
	}
	hash, err := entry.Digest()
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 3; i++ {
		index, head, err := replicas[i].Head()
		if err != nil || index != 1 || head != hash {
			t.Fatalf("replica %d head mismatched: %d %s %v", i, index, head, err)
		}
	}
	for i := 3; i < 5; i++ {
		index, head, err := replicas[i].Head()
		if err != nil || index != 0 || head != zeroReplicaHash {
			t.Fatalf("minority replica unexpectedly appended: %v", err)
		}
	}
}

func TestReplicaRejectsForgedReceiptsAndWrongCommitMetadata(t *testing.T) {
	lab := newElectionLab(t, 3)
	replicas := testReplicaMembers(t, lab)
	cert := testReplicaElection(t, lab, 2, "leader-a", 0, 1)
	entry := testReplicaEntry(lab, 2, 1, "leader-a", zeroReplicaHash, "grant", "region:one")
	a, err := replicas[0].AppendCandidate(lab.roster, cert, entry)
	if err != nil {
		t.Fatal(err)
	}
	b, err := replicas[1].AppendCandidate(lab.roster, cert, entry)
	if err != nil {
		t.Fatal(err)
	}
	base := ReplicaCommitProof{Election: cert, Entry: entry, Receipts: []ReplicaReceipt{a, b}}
	if err := VerifyReplicaCommitProof(lab.roster, base); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name   string
		change func(*ReplicaCommitProof)
	}{
		{"one receipt", func(p *ReplicaCommitProof) { p.Receipts = p.Receipts[:1] }},
		{"duplicate", func(p *ReplicaCommitProof) { p.Receipts[1] = p.Receipts[0] }},
		{"forged member", func(p *ReplicaCommitProof) { p.Receipts[0].MemberID = "stranger" }},
		{"changed signature", func(p *ReplicaCommitProof) { p.Receipts[0].Signature = "ff" }},
		{"changed hash", func(p *ReplicaCommitProof) { p.Receipts[0].EntryHash = zeroReplicaHash }},
		{"changed index", func(p *ReplicaCommitProof) { p.Receipts[0].Index++ }},
		{"wrong term", func(p *ReplicaCommitProof) { p.Entry.Term++ }},
		{"wrong leader", func(p *ReplicaCommitProof) { p.Entry.LeaderID = "leader-b" }},
		{"different command", func(p *ReplicaCommitProof) { p.Entry.OperationHash = testReplicaOperationHash("other") }},
		{"wrong cluster", func(p *ReplicaCommitProof) { p.Entry.ClusterID = "foreign" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			proof := base
			proof.Receipts = append([]ReplicaReceipt(nil), base.Receipts...)
			tc.change(&proof)
			if err := VerifyReplicaCommitProof(lab.roster, proof); err == nil {
				t.Fatal("forged or incomplete commit proof passed")
			}
		})
	}
}

func TestReplicaConflictingIndexHashChainAndStaleLeaderTerm(t *testing.T) {
	lab := newElectionLab(t, 3)
	replicas := testReplicaMembers(t, lab)
	r := replicas[0]
	cert := testReplicaElection(t, lab, 4, "leader-a", 0, 1)
	a := testReplicaEntry(lab, 4, 1, "leader-a", zeroReplicaHash, "grant", "one")
	first, err := r.AppendCandidate(lab.roster, cert, a)
	if err != nil {
		t.Fatal(err)
	}
	same, err := r.AppendCandidate(lab.roster, cert, a)
	if err != nil || first != same {
		t.Fatalf("idempotent append failed: %v", err)
	}
	conflict := a
	conflict.OperationHash = testReplicaOperationHash("different op")
	if _, err := r.AppendCandidate(lab.roster, cert, conflict); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("conflicting entry replaced committed index: %v", err)
	}
	skipped := testReplicaEntry(lab, 4, 3, "leader-a", zeroReplicaHash, "renew", "too far")
	if _, err := r.AppendCandidate(lab.roster, cert, skipped); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("nonconsecutive index accepted: %v", err)
	}
	broken := testReplicaEntry(lab, 4, 2, "leader-a", zeroReplicaHash, "revoke", "broken")
	if _, err := r.AppendCandidate(lab.roster, cert, broken); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("broken hash chain accepted: %v", err)
	}
	prior, err := a.Digest()
	if err != nil {
		t.Fatal(err)
	}
	second := testReplicaEntry(lab, 4, 2, "leader-a", prior, "renew", "two")
	if _, err := r.AppendCandidate(lab.roster, cert, second); err != nil {
		t.Fatal(err)
	}
	if err := r.ObserveLeaderTerm(5); err != nil {
		t.Fatal(err)
	}
	if _, err := r.AppendCandidate(lab.roster, cert, second); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("stale leader got receipt after higher term observed: %v", err)
	}
	if err := r.ObserveLeaderTerm(4); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("term high water regressed: %v", err)
	}
	if _, err := r.AppendCandidate(lab.roster, cert, testReplicaEntry(lab, 4, 3, "leader-a", zeroReplicaHash, "renew", "stale")); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("old-term leader appended new entry: %v", err)
	}
	newCert := testReplicaElection(t, lab, 5, "leader-b", 0, 1)
	secondHash, err := second.Digest()
	if err != nil {
		t.Fatal(err)
	}
	newEntry := testReplicaEntry(lab, 5, 3, "leader-b", secondHash, "promote", "epoch 2")
	if _, err := r.AppendCandidate(lab.roster, newCert, newEntry); err != nil {
		t.Fatal(err)
	}
	// Historical entries are IMMUTABLE across terms in this prototype.
	if _, err := r.AppendCandidate(lab.roster, newCert, testReplicaEntry(lab, 5, 2, "leader-b", prior, "revoke", "rewrite")); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("higher term overwrote an earlier record: %v", err)
	}
}

func TestReplicaDurableReplayRetainsHeadAndTerm(t *testing.T) {
	lab := newElectionLab(t, 3)
	path := filepath.Join(t.TempDir(), "replica.wal")
	r, err := OpenReplicaLog(path, lab.roster.ClusterID, lab.voters[0].member, lab.keys[0])
	if err != nil {
		t.Fatal(err)
	}
	cert := testReplicaElection(t, lab, 9, "leader-a", 0, 1)
	entry := testReplicaEntry(lab, 9, 1, "leader-a", zeroReplicaHash, "grant", "stable journal")
	receipt, err := r.AppendCandidate(lab.roster, cert, entry)
	if err != nil {
		t.Fatal(err)
	}
	if err := r.ObserveLeaderTerm(10); err != nil {
		t.Fatal(err)
	}
	if err := r.Close(); err != nil {
		t.Fatal(err)
	}
	r2, err := OpenReplicaLog(path, lab.roster.ClusterID, lab.voters[0].member, lab.keys[0])
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = r2.Close() }()
	index, head, err := r2.Head()
	want, _ := entry.Digest()
	if err != nil || index != 1 || head != want {
		t.Fatalf("lost durable entry: %d %s %v", index, head, err)
	}
	if _, err := r2.AppendCandidate(lab.roster, cert, entry); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("reboot forgot higher observed term: %v", err)
	}
	newCert := testReplicaElection(t, lab, 10, "leader-b", 0, 1)
	e2 := testReplicaEntry(lab, 10, 2, "leader-b", want, "renew", "continues")
	if _, err := r2.AppendCandidate(lab.roster, newCert, e2); err != nil {
		t.Fatal(err)
	}
	_ = receipt
}

func TestReplicaConcurrentConflictingAppendIsSerialized(t *testing.T) {
	lab := newElectionLab(t, 3)
	replicas := testReplicaMembers(t, lab)
	r := replicas[0]
	cert := testReplicaElection(t, lab, 2, "leader-a", 0, 1)
	const n = 32
	results := make(chan struct {
		hash string
		err  error
	}, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			entry := testReplicaEntry(lab, 2, 1, "leader-a", zeroReplicaHash, "grant", string(rune('a'+i)))
			_, err := r.AppendCandidate(lab.roster, cert, entry)
			results <- struct {
				hash string
				err  error
			}{hash: entry.OperationHash, err: err}
		}(i)
	}
	wg.Wait()
	close(results)
	winner := ""
	for response := range results {
		if response.err != nil {
			if !errors.Is(response.err, ErrReplicaConflict) {
				t.Fatal(response.err)
			}
			continue
		}
		if winner != "" && winner != response.hash {
			t.Fatal("conflicting entries were both durably signed")
		}
		winner = response.hash
	}
	if winner == "" {
		t.Fatal("no append was accepted")
	}
}

func TestReplicaCorruptJournalAndExclusiveOwnerFailClosed(t *testing.T) {
	lab := newElectionLab(t, 3)
	path := filepath.Join(t.TempDir(), "authority-replica.wal")
	r, err := OpenReplicaLog(path, lab.roster.ClusterID, lab.voters[0].member, lab.keys[0])
	if err != nil {
		t.Fatal(err)
	}
	cert := testReplicaElection(t, lab, 1, "leader-a", 0, 1)
	entry := testReplicaEntry(lab, 1, 1, "leader-a", zeroReplicaHash, "grant", "test")
	if _, err := r.AppendCandidate(lab.roster, cert, entry); err != nil {
		t.Fatal(err)
	}
	if copy, err := OpenReplicaLog(path, lab.roster.ClusterID, lab.voters[0].member, lab.keys[0]); copy != nil || err == nil {
		t.Fatal("second active writer opened journal")
	}
	if err := r.Close(); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	mutated := append([]byte(nil), raw...)
	mutated[len(mutated)-1] ^= 0xff
	for name, contents := range map[string][]byte{
		"partial-header": raw[:8],
		"partial-body":   raw[:len(raw)-1],
		"tampered":       mutated,
		"trailing-junk":  append(append([]byte(nil), raw...), 0x13),
	} {
		t.Run(name, func(t *testing.T) {
			file := filepath.Join(t.TempDir(), "test.wal")
			if err := os.WriteFile(file, contents, 0600); err != nil {
				t.Fatal(err)
			}
			if recovered, err := OpenReplicaLog(file, lab.roster.ClusterID, lab.voters[0].member, lab.keys[0]); recovered != nil || !errors.Is(err, ErrReplicaCorrupt) {
				t.Fatalf("corruption accepted: %v", err)
			}
		})
	}
	_, otherKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	if recovered, err := OpenReplicaLog(path, lab.roster.ClusterID, lab.voters[0].member, otherKey); recovered != nil || !errors.Is(err, ErrReplicaCorrupt) {
		t.Fatalf("new signer reopened old journal: %v", err)
	}
	if err := os.WriteFile(path+".lock", []byte("stale"), 0600); err != nil {
		t.Fatal(err)
	}
	if recovered, err := OpenReplicaLog(path, lab.roster.ClusterID, lab.voters[0].member, lab.keys[0]); recovered != nil || err == nil {
		t.Fatal("stale exclusive lock was bypassed")
	}
}
