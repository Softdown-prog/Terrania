package raftlab

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"
)

func durableNodes(c *DurableCluster) []*Node {
	nodes := make([]*Node, 0, len(c.order))
	for _, id := range c.order {
		nodes = append(nodes, c.Nodes[id])
	}
	return nodes
}

// Snapshots restore the FSM without depending on a new election to replay a
// pre-crash committed command. The log and stable store are kept on disk.
func TestRaftLabDurableThreeMemberRestartWithSnapshot(t *testing.T) {
	root := filepath.Join(t.TempDir(), "consensus")
	ids := []string{"node-a", "node-b", "node-c"}
	c, err := OpenDurableCluster(root, ids...)
	if err != nil {
		t.Fatal(err)
	}
	leader, err := c.Leader(5 * time.Second)
	if err != nil {
		_ = c.Close()
		t.Fatal(err)
	}
	before := proposal("confirmed-before-shutdown")
	if err := leader.Propose(before, 3*time.Second); err != nil {
		_ = c.Close()
		t.Fatal(err)
	}
	waitCommitted(t, durableNodes(c), 1, 5*time.Second)
	for _, n := range durableNodes(c) {
		if err := n.Raft.Snapshot().Error(); err != nil {
			_ = c.Close()
			t.Fatalf("snapshot %s: %v", n.ID, err)
		}
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	for _, id := range ids {
		info, err := os.Stat(filepath.Join(root, id, "state.bolt"))
		if err != nil || info.Mode().Perm() != 0600 {
			t.Fatalf("missing private stable store for %s: %v", id, err)
		}
	}
	restarted, err := OpenDurableCluster(root, ids...)
	if err != nil {
		t.Fatalf("durable reopen: %v", err)
	}
	defer func() {
		if err := restarted.Close(); err != nil {
			t.Error(err)
		}
	}()
	waitCommitted(t, durableNodes(restarted), 1, 5*time.Second)
	newLeader, err := restarted.Leader(5 * time.Second)
	if err != nil {
		t.Fatal(err)
	}
	after := proposal("confirmed-after-shutdown")
	if err := newLeader.Propose(after, 3*time.Second); err != nil {
		t.Fatal(err)
	}
	waitCommitted(t, durableNodes(restarted), 2, 5*time.Second)
	for _, n := range durableNodes(restarted) {
		if got := n.FSM.Records(); !reflect.DeepEqual(got, []Proposal{before, after}) {
			t.Fatalf("node %s lost or reordered commits across restart: %+v", n.ID, got)
		}
	}
}

func TestRaftLabDurableRejectsBadMembershipAndConcurrentWriter(t *testing.T) {
	root := filepath.Join(t.TempDir(), "private-raft")
	if c, err := OpenDurableCluster("relative", "a", "b", "c"); err == nil {
		_ = c.Close()
		t.Fatal("relative consensus storage accepted")
	}
	ids := []string{"a", "b", "c"}
	c, err := OpenDurableCluster(root, ids...)
	if err != nil {
		t.Fatal(err)
	}
	if other, err := OpenDurableCluster(root, ids...); err == nil {
		_ = other.Close()
		t.Fatal("duplicate leader process opened same DB")
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	if other, err := OpenDurableCluster(root, "a", "c", "b"); !errors.Is(err, ErrDurableLabConfig) {
		if other != nil {
			_ = other.Close()
		}
		t.Fatalf("member reorder accepted: %v", err)
	}
	if other, err := OpenDurableCluster(root, "a", "b", "d"); !errors.Is(err, ErrDurableLabConfig) {
		if other != nil {
			_ = other.Close()
		}
		t.Fatalf("member replacement accepted: %v", err)
	}
	info, err := os.Stat(root)
	if err != nil || info.Mode().Perm() != 0700 {
		t.Fatalf("directory is not private: %v", err)
	}
}

func TestRaftLabDurableMissingNodeStateAndUnsafePermissionsFailClosed(t *testing.T) {
	root := filepath.Join(t.TempDir(), "private-raft")
	ids := []string{"a", "b", "c"}
	c, err := OpenDurableCluster(root, ids...)
	if err != nil {
		t.Fatal(err)
	}
	leader, err := c.Leader(5 * time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if err := leader.Propose(proposal("committed"), 2*time.Second); err != nil {
		t.Fatal(err)
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	db := filepath.Join(root, "b", "state.bolt")
	if err := os.Remove(db); err != nil {
		t.Fatal(err)
	}
	if reopened, err := OpenDurableCluster(root, ids...); err == nil {
		_ = reopened.Close()
		t.Fatal("missing follower state silently bootstrapped")
	}
	// This is an isolated temporary test directory, not production storage.
	if err := os.WriteFile(db, []byte("corrupt"), 0600); err != nil {
		t.Fatal(err)
	}
	if reopened, err := OpenDurableCluster(root, ids...); err == nil {
		_ = reopened.Close()
		t.Fatal("corrupt bbolt database accepted")
	}
	if err := os.Chmod(root, 0755); err != nil {
		t.Fatal(err)
	}
	if reopened, err := OpenDurableCluster(root, ids...); !errors.Is(err, ErrDurableLabConfig) {
		if reopened != nil {
			_ = reopened.Close()
		}
		t.Fatalf("unsafe directory accepted: %v", err)
	}
}

func TestRaftLabDurableManifestCannotBeSwappedForSymlink(t *testing.T) {
	root := filepath.Join(t.TempDir(), "private-raft")
	ids := []string{"a", "b", "c"}
	c, err := OpenDurableCluster(root, ids...)
	if err != nil {
		t.Fatal(err)
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	manifest := filepath.Join(root, "members.json")
	copyPath := filepath.Join(t.TempDir(), "manifest-copy")
	bytes, err := os.ReadFile(manifest)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(copyPath, bytes, 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(manifest); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(copyPath, manifest); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}
	if reopened, err := OpenDurableCluster(root, ids...); !errors.Is(err, ErrDurableLabConfig) {
		if reopened != nil {
			_ = reopened.Close()
		}
		t.Fatalf("manifest symlink accepted: %v", err)
	}
}
