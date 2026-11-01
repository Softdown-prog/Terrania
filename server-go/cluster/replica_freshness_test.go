package cluster

import (
	"errors"
	"sync"
	"testing"
)

func TestFreshElectionRejectsCandidateBehindDurableLog(t *testing.T) {
	lab := newElectionLab(t, 5)
	replicas := testReplicaMembers(t, lab)
	old := testReplicaElection(t, lab, 1, "leader-a", 0, 1, 2)
	initial := testReplicaEntry(lab, 1, 1, "leader-a", zeroReplicaHash, "grant", "province-17")
	for i := 0; i < 3; i++ {
		if _, err := replicas[i].AppendCandidate(lab.roster, old, initial); err != nil {
			t.Fatal(err)
		}
	}
	empty := ReplicaLogTip{LastHash: zeroReplicaHash}
	if _, err := lab.voters[0].VoteWithReplica(replicas[0], 2, "leader-b", empty); !errors.Is(err, ErrElectionStaleLog) {
		t.Fatalf("stale candidate received a vote: %v", err)
	}
	// A higher term MUST fence appends from the former leader even when
	// the new candidate was rejected as stale.
	next := testReplicaEntry(lab, 1, 2, "leader-a", zeroReplicaHash, "renew", "should fail")
	if _, err := replicas[0].AppendCandidate(lab.roster, old, next); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("old-term append survived observed term: %v", err)
	}
	fresh, err := replicas[0].Tip()
	if err != nil {
		t.Fatal(err)
	}
	if fresh.LastIndex != 1 || fresh.LastTerm != 1 {
		t.Fatalf("incorrect tip: %+v", fresh)
	}
	var votes []ElectionVote
	for i := 0; i < 3; i++ {
		v, err := lab.voters[i].VoteWithReplica(replicas[i], 2, "leader-b", fresh)
		if err != nil {
			t.Fatal(err)
		}
		votes = append(votes, v)
	}
	cert := FreshElectionCertificate{
		Election:     ElectionCertificate{ClusterID: lab.roster.ClusterID, CandidateID: "leader-b", Term: 2, Votes: votes},
		CandidateTip: fresh,
	}
	if err := VerifyFreshElectionCertificate(lab.roster, cert); err != nil {
		t.Fatal(err)
	}
	previous, err := initial.Digest()
	if err != nil {
		t.Fatal(err)
	}
	second := testReplicaEntry(lab, 2, 2, "leader-b", previous, "renew", "epoch-1 sequence-2")
	for i := 0; i < 3; i++ {
		if _, err := replicas[i].AppendFreshCandidate(lab.roster, cert, second); err != nil {
			t.Fatal(err)
		}
	}
	for i := 0; i < 3; i++ {
		tip, err := replicas[i].Tip()
		if err != nil || tip.LastIndex != 2 || tip.LastTerm != 2 {
			t.Fatalf("bad tip on node %d: %+v %v", i, tip, err)
		}
	}
}

func TestFreshElectionCertificateRejectsLegacyVotesAndTipTampering(t *testing.T) {
	lab := newElectionLab(t, 3)
	replicas := testReplicaMembers(t, lab)
	empty := ReplicaLogTip{LastHash: zeroReplicaHash}
	votes := make([]ElectionVote, 0, 2)
	for i := 0; i < 2; i++ {
		v, err := lab.voters[i].VoteWithReplica(replicas[i], 8, "leader-a", empty)
		if err != nil {
			t.Fatal(err)
		}
		votes = append(votes, v)
	}
	base := FreshElectionCertificate{
		Election:     ElectionCertificate{ClusterID: lab.roster.ClusterID, CandidateID: "leader-a", Term: 8, Votes: votes},
		CandidateTip: empty,
	}
	if err := VerifyFreshElectionCertificate(lab.roster, base); err != nil {
		t.Fatal(err)
	}
	mutated := base
	mutated.CandidateTip.LastIndex = 1
	mutated.CandidateTip.LastTerm = 2
	mutated.CandidateTip.LastHash = testReplicaOperationHash("forged")
	if err := VerifyFreshElectionCertificate(lab.roster, mutated); err == nil {
		t.Fatal("changed candidate tip certified")
	}
	mutated = base
	mutated.Election.Votes = append([]ElectionVote(nil), votes...)
	copyVote := mutated.Election.Votes[1]
	copyTip := *copyVote.Tip
	copyTip.LastHash = testReplicaOperationHash("injected")
	copyVote.Tip = &copyTip
	mutated.Election.Votes[1] = copyVote
	if err := VerifyFreshElectionCertificate(lab.roster, mutated); err == nil {
		t.Fatal("changed signed tip accepted")
	}
	if _, err := lab.voters[0].VoteWithReplica(replicas[1], 9, "leader-b", empty); !errors.Is(err, ErrElectionInvalid) {
		t.Fatalf("mismatched local witness and replica accepted: %v", err)
	}

	// Old Vote() still exists for legacy tests but must never be promoted
	// into the new fresh-log path by manufacturing a certificate.
	oldLab := newElectionLab(t, 3)
	oldCert := testReplicaElection(t, oldLab, 1, "leader-a", 0, 1)
	if err := VerifyFreshElectionCertificate(oldLab.roster, FreshElectionCertificate{
		Election: oldCert, CandidateTip: empty,
	}); !errors.Is(err, ErrElectionStaleLog) {
		t.Fatalf("legacy unbound votes passed strict checker: %v", err)
	}
}

func TestFreshElectionVsOldLeaderAppendCannotBothSucceed(t *testing.T) {
	for iteration := 0; iteration < 20; iteration++ {
		lab := newElectionLab(t, 3)
		replicas := testReplicaMembers(t, lab)
		old := testReplicaElection(t, lab, 1, "leader-a", 0, 1)
		entry := testReplicaEntry(lab, 1, 1, "leader-a", zeroReplicaHash, "grant", "operation")
		empty := ReplicaLogTip{LastHash: zeroReplicaHash}
		start := make(chan struct{})
		var wg sync.WaitGroup
		var appendErr, voteErr error
		wg.Add(2)
		go func() {
			defer wg.Done()
			<-start
			_, appendErr = replicas[0].AppendCandidate(lab.roster, old, entry)
		}()
		go func() {
			defer wg.Done()
			<-start
			_, voteErr = lab.voters[0].VoteWithReplica(replicas[0], 2, "leader-b", empty)
		}()
		close(start)
		wg.Wait()
		if appendErr == nil && voteErr == nil {
			t.Fatal("old leader appended while a stale candidate simultaneously got fresh vote")
		}
		if appendErr != nil && !errors.Is(appendErr, ErrReplicaConflict) {
			t.Fatalf("unexpected append error: %v", appendErr)
		}
		if voteErr != nil && !errors.Is(voteErr, ErrElectionStaleLog) {
			t.Fatalf("unexpected vote error: %v", voteErr)
		}
	}
}

func TestFreshElectionCatchUpBoundedSameTerm(t *testing.T) {
	lab := newElectionLab(t, 3)
	replicas := testReplicaMembers(t, lab)
	empty := ReplicaLogTip{LastHash: zeroReplicaHash}
	var votes []ElectionVote
	for i := 0; i < 2; i++ {
		v, err := lab.voters[i].VoteWithReplica(replicas[i], 3, "leader-a", empty)
		if err != nil {
			t.Fatal(err)
		}
		votes = append(votes, v)
	}
	cert := FreshElectionCertificate{
		Election:     ElectionCertificate{ClusterID: lab.roster.ClusterID, CandidateID: "leader-a", Term: 3, Votes: votes},
		CandidateTip: empty,
	}
	first := testReplicaEntry(lab, 3, 1, "leader-a", zeroReplicaHash, "grant", "grant-1")
	hash, err := first.Digest()
	if err != nil {
		t.Fatal(err)
	}
	second := testReplicaEntry(lab, 3, 2, "leader-a", hash, "renew", "renew-1")
	for i := 0; i < 2; i++ {
		for _, e := range []AuthorityLogEntry{first, second} {
			if _, err := replicas[i].AppendFreshCandidate(lab.roster, cert, e); err != nil {
				t.Fatal(err)
			}
		}
	}
	rangeData, err := replicas[0].ReadReplicaRange(1, 2)
	if err != nil || len(rangeData) != 2 {
		t.Fatalf("cannot read source prefix: %v", err)
	}
	if _, err := replicas[2].AppendFreshCandidate(lab.roster, cert, second); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("follower skipped prefix: %v", err)
	}
	acks, err := CatchUpReplicaRange(replicas[2], lab.roster, cert, rangeData)
	if err != nil || len(acks) != 2 {
		t.Fatalf("replica did not catch up: %v", err)
	}
	after, err := replicas[2].Tip()
	if err != nil || after.LastIndex != 2 {
		t.Fatalf("catch-up lost entries: %+v %v", after, err)
	}
	if _, err := CatchUpReplicaRange(replicas[2], lab.roster, cert, rangeData); err != nil {
		t.Fatalf("identical retry not idempotent: %v", err)
	}
	copied := append([]AuthorityLogEntry(nil), rangeData...)
	copied[0].OperationHash = testReplicaOperationHash("malicious rewrite")
	if _, err := CatchUpReplicaRange(replicas[2], lab.roster, cert, copied); !errors.Is(err, ErrReplicaConflict) {
		t.Fatalf("divergent repair overwrote follower: %v", err)
	}
	if _, err := replicas[0].ReadReplicaRange(4, 1); !errors.Is(err, ErrReplicaCatchUp) {
		t.Fatalf("out of range prefix accepted: %v", err)
	}
	if _, err := replicas[0].ReadReplicaRange(1, MaxReplicaEntries+1); !errors.Is(err, ErrReplicaInvalid) {
		t.Fatalf("unbounded read accepted: %v", err)
	}
	if _, err := CatchUpReplicaRange(replicas[2], lab.roster, cert, []AuthorityLogEntry{testReplicaEntry(lab, 2, 3, "leader-a", hash, "grant", "old")}); !errors.Is(err, ErrReplicaCatchUp) {
		t.Fatalf("cross-term batch accepted: %v", err)
	}
}
