package cluster

import (
	"errors"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

// RecoveryEvidence is an OFFLINE audit result. It never contains transfer
// nonces, inventory, player positions or snapshot bytes. SafeToResume remains
// FALSE: disk evidence cannot prove remote workers are fenced or elect a leader.
type RecoveryEvidence struct {
	Province            Province
	WorkerID            string
	Epoch               uint64
	Phase               string
	TransferPhase       string
	SnapshotFound       bool
	SnapshotIntegrityOK bool
	RoomStateRestorable bool
	SafeToResume        bool
	Reason              string
}

// InspectRecoveredProvince checks a recovered journal entry against an
// immutable archived snapshot. An active (not restarted) directory is rejected
// to prevent using this as an online activation or handoff tool.
func InspectRecoveredProvince(d *RegionDirectory, a *SnapshotArchive, p Province) (RecoveryEvidence, error) {
	if d == nil || a == nil {
		return RecoveryEvidence{}, ErrSnapshotArchiveInvalid
	}
	d.mu.Lock()
	s, ok := d.regions[p]
	if !ok {
		d.mu.Unlock()
		return RecoveryEvidence{}, ErrRegionUnknown
	}
	if d.faulted {
		d.mu.Unlock()
		return RecoveryEvidence{}, ErrRegionStorageFailed
	}
	if !s.recoveryRequired {
		d.mu.Unlock()
		return RecoveryEvidence{}, ErrRegionRecoveryRequired
	}
	copyState := cloneRegionState(s)
	d.mu.Unlock()

	e := RecoveryEvidence{Province: p, WorkerID: copyState.owner,
		Epoch: copyState.epoch, Phase: "recovery-required", SafeToResume: false}
	var req RegionSnapshotRequest
	var err error
	if copyState.pending != nil {
		t := copyState.pending.ticket
		e.TransferPhase = "pending"
		if copyState.pending.frozen {
			e.TransferPhase = "frozen"
		}
		if copyState.pending.staged {
			e.TransferPhase = "staged"
		}
		if copyState.pending.quiesced {
			e.TransferPhase = "quiesced"
		}
		req, err = a.LoadVerified(t)
	} else if copyState.lastCommitted != "" {
		e.TransferPhase = "committed"
		req, err = a.inspectByToken(p, copyState.lastCommitted)
		if err == nil && (req.Ticket.To != copyState.owner || req.Ticket.NewEpoch != copyState.epoch) {
			err = ErrSnapshotArchiveInvalid
		}
	} else {
		e.TransferPhase = "no-transfer-reference"
		e.Reason = "journal has no transferable snapshot reference; recovery remains blocked"
		return e, nil
	}
	if errors.Is(err, ErrSnapshotArchiveMissing) {
		e.Reason = "matching snapshot missing; recovery remains blocked"
		return e, nil
	}
	if err != nil {
		e.Reason = "snapshot unreadable or corrupt; recovery remains blocked"
		return e, err
	}
	e.SnapshotFound = true
	e.SnapshotIntegrityOK = true
	room, err := engine.RestoreRoomState(req.Snapshot.Payload)
	if err != nil {
		e.Reason = "snapshot intact but game room cannot be restored; recovery remains blocked"
		return e, nil
	}
	room.Close()
	e.RoomStateRestorable = true
	e.Reason = "snapshot and journal evidence agree; remote fencing and distributed authority still unverified"
	return e, nil
}
