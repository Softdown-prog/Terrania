package raftlab

import (
	"bufio"
	"bytes"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"sync"
	"testing"
	"time"

	"github.com/hashicorp/raft"
	raftboltdb "github.com/hashicorp/raft-boltdb/v2"
	"go.etcd.io/bbolt"
)

const processHelperEnv = "TERRANIA_RAFT_TCP_TEST_HELPER"

type processCommand struct {
	Op       string
	Proposal Proposal
}
type processReply struct {
	Ready   bool
	Leader  bool
	Records []Proposal
	Error   string
}

func emitProcessReply(reply processReply) {
	data, _ := json.Marshal(reply)
	fmt.Println(string(data))
}

// This helper is invoked ONLY by a subprocess of the test binary. Its stdin
// is the private test control channel (no admin HTTP port or shell executor).
func TestRaftNetworkWorkerProcess(t *testing.T) {
	if os.Getenv(processHelperEnv) != "1" {
		return
	}
	if err := runRaftNetworkWorker(); err != nil {
		fmt.Fprintln(os.Stderr, "raft subprocess:", err)
		os.Exit(2)
	}
}

func runRaftNetworkWorker() error {
	root := os.Getenv("TERRANIA_RAFT_TCP_TEST_ROOT")
	id := os.Getenv("TERRANIA_RAFT_TCP_TEST_ID")
	if !filepath.IsAbs(root) || !validName(id) {
		return ErrNetworkLabConfig
	}
	var servers []raft.Server
	if err := json.Unmarshal([]byte(os.Getenv("TERRANIA_RAFT_TCP_TEST_ROSTER")), &servers); err != nil {
		return err
	}
	var localAddr string
	for _, server := range servers {
		if string(server.ID) == id {
			localAddr = string(server.Address)
		}
	}
	if localAddr == "" {
		return ErrNetworkLabConfig
	}
	listener, err := net.Listen("tcp", localAddr)
	if err != nil {
		return err
	}
	defer listener.Close()
	cert, pool, err := ReadPrivateRaftIdentity(root, id)
	if err != nil {
		return err
	}
	dir := filepath.Join(root, id)
	store, err := raftboltdb.New(raftboltdb.Options{
		Path:        filepath.Join(dir, "state.bolt"),
		BoltOptions: &bbolt.Options{Timeout: 250 * time.Millisecond},
	})
	if err != nil {
		return err
	}
	defer store.Close()
	snap, err := raft.NewFileSnapshotStore(dir, 2, io.Discard)
	if err != nil {
		return err
	}
	node, err := StartLoopbackRaftNode(id, listener, cert, pool, servers, store, store, snap,
		os.Getenv("TERRANIA_RAFT_TCP_TEST_BOOTSTRAP") == "1")
	if err != nil {
		return err
	}
	defer node.Close()
	emitProcessReply(processReply{Ready: true})
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 1024), 8192)
	for scanner.Scan() {
		var cmd processCommand
		if err := json.Unmarshal(scanner.Bytes(), &cmd); err != nil {
			emitProcessReply(processReply{Error: err.Error()})
			continue
		}
		switch cmd.Op {
		case "state":
			emitProcessReply(processReply{
				Leader:  node.Raft.State() == raft.Leader,
				Records: node.FSM.Records(),
			})
		case "propose":
			err := node.Propose(cmd.Proposal, 900*time.Millisecond)
			if err != nil {
				emitProcessReply(processReply{Error: err.Error()})
			} else {
				emitProcessReply(processReply{Records: node.FSM.Records()})
			}
		case "quit":
			return nil
		default:
			emitProcessReply(processReply{Error: "unsupported test control command"})
		}
	}
	return scanner.Err()
}

type raftChild struct {
	id      string
	cmd     *exec.Cmd
	stdin   io.WriteCloser
	replies chan processReply
	exited  chan error
	mu      sync.Mutex
	dead    bool
	stderr  bytes.Buffer
}

func (p *raftChild) command(cmd processCommand, timeout time.Duration) (processReply, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.dead {
		return processReply{}, errors.New("stopped test process")
	}
	content, err := json.Marshal(cmd)
	if err != nil {
		return processReply{}, err
	}
	if _, err := fmt.Fprintln(p.stdin, string(content)); err != nil {
		return processReply{}, err
	}
	select {
	case reply, ok := <-p.replies:
		if !ok {
			return processReply{}, fmt.Errorf("subprocess %s terminated", p.id)
		}
		return reply, nil
	case <-time.After(timeout):
		return processReply{}, fmt.Errorf("subprocess %s control timed out", p.id)
	}
}

func (p *raftChild) kill() {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.dead {
		return
	}
	p.dead = true
	_ = p.cmd.Process.Kill()
	<-p.exited
	_ = p.stdin.Close()
}

func launchRaftChild(t *testing.T, root, id string, servers []raft.Server, bootstrap bool) *raftChild {
	t.Helper()
	roster, err := json.Marshal(servers)
	if err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command(os.Args[0], "-test.run=^TestRaftNetworkWorkerProcess$", "-test.v=false")
	cmd.Env = append(os.Environ(),
		processHelperEnv+"=1",
		"TERRANIA_RAFT_TCP_TEST_ROOT="+root,
		"TERRANIA_RAFT_TCP_TEST_ID="+id,
		"TERRANIA_RAFT_TCP_TEST_ROSTER="+string(roster),
		fmt.Sprintf("TERRANIA_RAFT_TCP_TEST_BOOTSTRAP=%d", map[bool]int{false: 0, true: 1}[bootstrap]))
	p := &raftChild{id: id, cmd: cmd, replies: make(chan processReply, 16), exited: make(chan error, 1)}
	cmd.Stderr = &p.stderr
	stdin, err := cmd.StdinPipe()
	if err != nil {
		t.Fatal(err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	p.stdin = stdin
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	go func() {
		scanner := bufio.NewScanner(stdout)
		scanner.Buffer(make([]byte, 1024), 8192)
		for scanner.Scan() {
			var reply processReply
			if json.Unmarshal(scanner.Bytes(), &reply) == nil {
				p.replies <- reply
			}
		}
		close(p.replies)
	}()
	go func() { p.exited <- cmd.Wait() }()
	t.Cleanup(p.kill)
	select {
	case reply, ok := <-p.replies:
		if !ok || !reply.Ready {
			t.Fatalf("subprocess %s did not start Raft: %s", id, p.stderr.String())
		}
	case <-time.After(8 * time.Second):
		t.Fatalf("subprocess %s startup timeout: %s", id, p.stderr.String())
	}
	return p
}

func waitProcessLeader(t *testing.T, children map[string]*raftChild, allowed []string) *raftChild {
	t.Helper()
	deadline := time.Now().Add(8 * time.Second)
	for time.Now().Before(deadline) {
		var chosen *raftChild
		leaders := 0
		for _, id := range allowed {
			reply, err := children[id].command(processCommand{Op: "state"}, 2*time.Second)
			if err != nil {
				t.Fatal(err)
			}
			if reply.Leader {
				chosen = children[id]
				leaders++
			}
		}
		if leaders == 1 {
			return chosen
		}
		time.Sleep(40 * time.Millisecond)
	}
	t.Fatal("separate Raft OS processes never elected a leader")
	return nil
}

func waitProcessRecords(t *testing.T, children map[string]*raftChild, allowed []string, want []Proposal) {
	t.Helper()
	deadline := time.Now().Add(8 * time.Second)
	for time.Now().Before(deadline) {
		match := true
		for _, id := range allowed {
			reply, err := children[id].command(processCommand{Op: "state"}, 2*time.Second)
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(reply.Records, want) {
				match = false
				break
			}
		}
		if match {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatalf("separate Raft OS processes never converged to %v", want)
}

func TestRaftNetworkSeparateOSProcessesPersistentRejoin(t *testing.T) {
	ca := makeLabCA(t)
	root := filepath.Join(t.TempDir(), "raft-tcp-processes")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "ca.pem"), pem.EncodeToMemory(&pem.Block{
		Type: "CERTIFICATE", Bytes: ca.cert.Raw,
	}), 0600); err != nil {
		t.Fatal(err)
	}
	names := []string{"north", "south", "west"}
	var servers []raft.Server
	for _, id := range names {
		// Reserve a loopback address and release it before starting the child.
		l := listenLab(t)
		address := l.Addr().String()
		_ = l.Close()
		servers = append(servers, raft.Server{ID: raft.ServerID(id), Address: raft.ServerAddress(address), Suffrage: raft.Voter})
		if err := os.Mkdir(filepath.Join(root, id), 0700); err != nil {
			t.Fatal(err)
		}
		cert := ca.sign(t, id)
		var pemCertificates []byte
		for _, der := range cert.Certificate {
			pemCertificates = append(pemCertificates, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})...)
		}
		key, err := x509.MarshalPKCS8PrivateKey(cert.PrivateKey)
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(root, id, "cert.pem"), pemCertificates, 0600); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(root, id, "key.pem"), pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: key}), 0600); err != nil {
			t.Fatal(err)
		}
	}
	children := make(map[string]*raftChild)
	for _, id := range names {
		children[id] = launchRaftChild(t, root, id, servers, true)
	}
	leader := waitProcessLeader(t, children, names)
	first := proposal("cross-process-durable-1")
	if reply, err := leader.command(processCommand{Op: "propose", Proposal: first}, 4*time.Second); err != nil || reply.Error != "" {
		t.Fatalf("three-process Raft commit failed: %v, %s", err, reply.Error)
	}
	waitProcessRecords(t, children, names, []Proposal{first})
	previous := leader.id
	leader.kill() // abrupt OS process death, not a graceful shutdown
	remaining := make([]string, 0, 2)
	for _, id := range names {
		if id != previous {
			remaining = append(remaining, id)
		}
	}
	successor := waitProcessLeader(t, children, remaining)
	second := proposal("cross-process-durable-2")
	if reply, err := successor.command(processCommand{Op: "propose", Proposal: second}, 4*time.Second); err != nil || reply.Error != "" {
		t.Fatalf("Raft after OS process crash cannot commit: %v, %s", err, reply.Error)
	}
	waitProcessRecords(t, children, remaining, []Proposal{first, second})
	// Rejoining process reopens its old bbolt state and catches up via TLS.
	children[previous] = launchRaftChild(t, root, previous, servers, false)
	waitProcessRecords(t, children, names, []Proposal{first, second})
}
