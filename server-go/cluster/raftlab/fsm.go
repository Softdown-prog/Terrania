// Package raftlab contains a REAL HashiCorp Raft consensus integration,
// but only for an in-process laboratory. Nothing here is imported or mounted
// by cmd/terrania, the gateway, or the production grant coordinator.
package raftlab

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"

	"github.com/hashicorp/raft"
)

const maxProposals = 256
const maxEncodedCommand = 1024
const maxSnapshotBytes = 1 << 20

var (
	ErrProposalInvalid  = errors.New("invalid authority proposal")
	ErrProposalConflict = errors.New("conflicting proposal ID")
	ErrProposalLimit    = errors.New("authority proposal sandbox reached capacity")
)

// Proposal is AUDIT DATA, not an instruction to sign a worker capability.
// In particular, a Raft quorum does not execute a game authority transition.
type Proposal struct {
	ID       string
	Province string
	Epoch    uint64
	Action   string
	Digest   string
}

func validName(s string) bool {
	if s == "" || len(s) > 64 {
		return false
	}
	for _, r := range s {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '-' || r == '_' || r == ':') {
			return false
		}
	}
	return true
}
func (p Proposal) Validate() error {
	if !validName(p.ID) || !validName(p.Province) || p.Epoch == 0 || len(p.Digest) != 64 {
		return ErrProposalInvalid
	}
	if p.Action != "grant" && p.Action != "renew" && p.Action != "revoke" && p.Action != "promote" {
		return ErrProposalInvalid
	}
	for _, c := range p.Digest {
		if !strings.ContainsRune("0123456789abcdef", c) {
			return ErrProposalInvalid
		}
	}
	return nil
}

// FSM has NO external side effects; it retains copies of committed proposals
// in stable application order. Raft is responsible for consensus and replay.
type FSM struct {
	mu        sync.Mutex
	records   []Proposal
	positions map[string]Proposal
}

func NewFSM() *FSM { return &FSM{positions: make(map[string]Proposal)} }

func decodeProposal(data []byte) (Proposal, error) {
	if len(data) == 0 || len(data) > maxEncodedCommand {
		return Proposal{}, ErrProposalInvalid
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	var p Proposal
	if err := decoder.Decode(&p); err != nil {
		return Proposal{}, ErrProposalInvalid
	}
	var trailing interface{}
	if err := decoder.Decode(&trailing); err != io.EOF {
		return Proposal{}, ErrProposalInvalid
	}
	return p, p.Validate()
}

func (f *FSM) Apply(entry *raft.Log) interface{} {
	if entry == nil {
		return ErrProposalInvalid
	}
	p, err := decodeProposal(entry.Data)
	if err != nil {
		return err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if prior, ok := f.positions[p.ID]; ok {
		if prior != p {
			return ErrProposalConflict
		}
		return nil // exact duplicate is idempotent
	}
	if len(f.records) >= maxProposals {
		return ErrProposalLimit
	}
	f.records = append(f.records, p)
	f.positions[p.ID] = p
	return nil
}

func (f *FSM) Records() []Proposal {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]Proposal(nil), f.records...)
}

func (f *FSM) Snapshot() (raft.FSMSnapshot, error) {
	return &fsmSnapshot{records: f.Records()}, nil
}

type fsmSnapshot struct{ records []Proposal }

func (s *fsmSnapshot) Persist(sink raft.SnapshotSink) error {
	data, err := json.Marshal(s.records)
	if err != nil || len(data) > maxSnapshotBytes {
		_ = sink.Cancel()
		return ErrProposalLimit
	}
	if n, err := sink.Write(data); err != nil || n != len(data) {
		_ = sink.Cancel()
		return fmt.Errorf("snapshot write incomplete: %w", err)
	}
	return sink.Close()
}
func (s *fsmSnapshot) Release() {}

// Restore is bounded, validates every proposal and rejects conflicting IDs.
// It swaps the in-memory state atomically only when fully decoded and checked.
func (f *FSM) Restore(reader io.ReadCloser) error {
	if reader == nil {
		return ErrProposalInvalid
	}
	defer reader.Close()
	content, err := io.ReadAll(io.LimitReader(reader, maxSnapshotBytes+1))
	if err != nil || len(content) > maxSnapshotBytes {
		return ErrProposalInvalid
	}
	dec := json.NewDecoder(bytes.NewReader(content))
	dec.DisallowUnknownFields()
	var records []Proposal
	if err := dec.Decode(&records); err != nil || len(records) > maxProposals {
		return ErrProposalInvalid
	}
	var trailing interface{}
	if err := dec.Decode(&trailing); err != io.EOF {
		return ErrProposalInvalid
	}
	index := make(map[string]Proposal, len(records))
	for _, p := range records {
		if err := p.Validate(); err != nil {
			return err
		}
		if _, ok := index[p.ID]; ok {
			return ErrProposalConflict
		}
		index[p.ID] = p
	}
	f.mu.Lock()
	f.records = append([]Proposal(nil), records...)
	f.positions = index
	f.mu.Unlock()
	return nil
}

var _ raft.FSM = (*FSM)(nil)
