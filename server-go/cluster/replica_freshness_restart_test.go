package cluster

import (
	"errors"
	"path/filepath"
	"testing"
)

func TestFreshElectionFsyncedTipSurvivesWitnessRestart(t *testing.T) {
	_, key := testLeaseKeys(t)
	root := t.TempDir()
	witnessPath := filepath.Join(root, "election.wal")
	replicaPath := filepath.Join(root, "replica.wal")
	w, err := OpenElectionWitness(witnessPath, "terrania-lab", "voter-a", key)
	if err != nil {
		t.Fatal(err)
	}
	replica, err := OpenReplicaLog(replicaPath, "terrania-lab", "voter-a", key)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = replica.Close() }()
	empty := ReplicaLogTip{LastHash: zeroReplicaHash}
	first, err := w.VoteWithReplica(replica, 5, "candidate-a", empty)
	if err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	restored, err := OpenElectionWitness(witnessPath, "terrania-lab", "voter-a", key)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = restored.Close() }()
	same, err := restored.VoteWithReplica(replica, 5, "candidate-a", empty)
	if err != nil || same.Signature != first.Signature {
		t.Fatalf("persisted vote tip changed after restart: %v", err)
	}
	different := ReplicaLogTip{
		LastIndex: 1, LastTerm: 1, LastHash: testReplicaOperationHash("different history"),
	}
	if _, err := restored.VoteWithReplica(replica, 5, "candidate-a", different); !errors.Is(err, ErrElectionConflict) {
		t.Fatalf("signed a different candidate tip after restart: %v", err)
	}
	if _, err := restored.Vote(5, "candidate-a"); !errors.Is(err, ErrElectionConflict) {
		t.Fatalf("downgraded a strict vote to legacy form: %v", err)
	}
	if _, err := restored.VoteWithReplica(replica, 5, "candidate-b", empty); !errors.Is(err, ErrElectionConflict) {
		t.Fatalf("double-voted after restart: %v", err)
	}
}

func TestFreshElectionLegacyVoteCannotBeRetrofittedAsStrict(t *testing.T) {
	_, key := testLeaseKeys(t)
	root := t.TempDir()
	w, err := OpenElectionWitness(filepath.Join(root, "election.wal"), "terrania-lab", "voter-a", key)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = w.Close() }()
	l, err := OpenReplicaLog(filepath.Join(root, "replica.wal"), "terrania-lab", "voter-a", key)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = l.Close() }()
	if _, err := w.Vote(3, "candidate-a"); err != nil {
		t.Fatal(err)
	}
	if _, err := w.VoteWithReplica(l, 3, "candidate-a", ReplicaLogTip{LastHash: zeroReplicaHash}); !errors.Is(err, ErrElectionConflict) {
		t.Fatalf("legacy vote retroactively signed a log tip: %v", err)
	}
}
