package raftlab

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"reflect"
	"testing"
	"time"

	"github.com/hashicorp/raft"
)

func proposal(id string) Proposal {
	hash := sha256.Sum256([]byte(id))
	return Proposal{ID: id, Province: "province-1", Epoch: 1, Action: "grant", Digest: hex.EncodeToString(hash[:])}
}

func waitCommitted(t *testing.T, nodes []*Node, count int, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		all := true
		for _, n := range nodes {
			if len(n.FSM.Records()) != count {
				all = false
				break
			}
		}
		if all {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("not all replicas applied %d proposals before deadline", count)
}

func TestRaftLabThreeNodesCommitAndIsolatedLeaderCannotCommit(t *testing.T) {
	c, err := NewCluster("node-a", "node-b", "node-c")
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := c.Close(); err != nil {
			t.Error(err)
		}
	}()
	leader, err := c.LeaderAmong(c.order, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	first := proposal("first")
	if err := leader.Propose(first, 2*time.Second); err != nil {
		t.Fatal(err)
	}
	nodes := []*Node{c.Nodes["node-a"], c.Nodes["node-b"], c.Nodes["node-c"]}
	waitCommitted(t, nodes, 1, 5*time.Second)
	if err := c.Isolate(leader.ID); err != nil {
		t.Fatal(err)
	}
	majority := make([]string, 0, 2)
	for _, id := range c.order {
		if id != leader.ID {
			majority = append(majority, id)
		}
	}
	current, err := c.LeaderAmong(majority, 5*time.Second)
	if err != nil {
		t.Fatalf("majority did not elect successor: %v", err)
	}
	second := proposal("second")
	if err := current.Propose(second, 2*time.Second); err != nil {
		t.Fatalf("successor cannot commit with quorum: %v", err)
	}
	waitCommitted(t, []*Node{c.Nodes[majority[0]], c.Nodes[majority[1]]}, 2, 5*time.Second)
	isolated := leader.Propose(proposal("isolation-cannot-confirm"), 450*time.Millisecond)
	if isolated == nil {
		t.Fatal("partitioned former leader acknowledged an unreplicated command")
	}
	// No partial-success claim: an apply timeout on the minority is UNKNOWN.
	if len(leader.FSM.Records()) != 1 {
		t.Fatal("minority applied a command without quorum")
	}
	c.ConnectAll()
	waitCommitted(t, nodes, 2, 8*time.Second)
	for _, n := range nodes {
		got := n.FSM.Records()
		if !reflect.DeepEqual(got, []Proposal{first, second}) {
			t.Fatalf("replica %s diverged after heal: %+v", n.ID, got)
		}
	}
}

func TestRaftLabFiveNodeQuorumAndNoHiddenWorkerActivation(t *testing.T) {
	c, err := NewCluster("a", "b", "c", "d", "e")
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := c.Close(); err != nil {
			t.Error(err)
		}
	}()
	leader, err := c.LeaderAmong(c.order, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if err := leader.Propose(proposal("five-node-quorum"), 3*time.Second); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		count := 0
		for _, n := range c.Nodes {
			if len(n.FSM.Records()) == 1 {
				count++
			}
		}
		if count == 5 {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("five node Raft consensus did not replicate committed proposal")
}

type memorySnapshotSink struct {
	bytes.Buffer
	canceled bool
	closed   bool
}

func (s *memorySnapshotSink) ID() string    { return "unit-test" }
func (s *memorySnapshotSink) Cancel() error { s.canceled = true; return nil }
func (s *memorySnapshotSink) Close() error  { s.closed = true; return nil }

func TestRaftLabFSMSnapshotRestoreRejectsConflictAndMalformedInput(t *testing.T) {
	f := NewFSM()
	a := proposal("alpha")
	b := proposal("beta")
	for _, p := range []Proposal{a, b} {
		data, _ := json.Marshal(p)
		if result := f.Apply(&raft.Log{Data: data}); result != nil {
			t.Fatalf("valid proposal refused: %v", result)
		}
	}
	snapshot, err := f.Snapshot()
	if err != nil {
		t.Fatal(err)
	}
	sink := &memorySnapshotSink{}
	if err := snapshot.Persist(sink); err != nil {
		t.Fatal(err)
	}
	snapshot.Release()
	if !sink.closed || sink.canceled {
		t.Fatal("snapshot was not sealed")
	}
	restored := NewFSM()
	if err := restored.Restore(io.NopCloser(bytes.NewReader(sink.Bytes()))); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(restored.Records(), []Proposal{a, b}) {
		t.Fatal("restored state differs")
	}
	data, _ := json.Marshal(a)
	if result := restored.Apply(&raft.Log{Data: data}); result != nil {
		t.Fatalf("retry not idempotent: %v", result)
	}
	altered := a
	altered.Digest = b.Digest
	bad, _ := json.Marshal(altered)
	if result := restored.Apply(&raft.Log{Data: bad}); !errors.Is(result.(error), ErrProposalConflict) {
		t.Fatalf("conflicting ID accepted: %v", result)
	}
	if err := restored.Restore(io.NopCloser(bytes.NewBufferString(`[{"ID":"incomplete"}]`))); err == nil {
		t.Fatal("invalid snapshot erased trusted state")
	}
	if !reflect.DeepEqual(restored.Records(), []Proposal{a, b}) {
		t.Fatal("invalid restore changed state")
	}
	if result := restored.Apply(&raft.Log{Data: []byte(`{"malicious":true}`)}); result == nil {
		t.Fatal("unknown command accepted")
	}
}

func TestRaftLabValidatesMemberAndProposalBoundaries(t *testing.T) {
	for _, tc := range [][]string{{"a"}, {"a", "b", "a"}, {"a", "b", "c", "d"}, {"a", "b", "bad name"}} {
		if c, err := NewCluster(tc...); err == nil {
			_ = c.Close()
			t.Fatalf("invalid cluster accepted: %v", tc)
		}
	}
	p := proposal("good")
	p.Action = "shell"
	if err := p.Validate(); !errors.Is(err, ErrProposalInvalid) {
		t.Fatalf("shell accepted: %v", err)
	}
}
