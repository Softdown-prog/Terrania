package cluster

import (
	"crypto/ed25519"
	"encoding/hex"
	"errors"
)

var (
	ErrElectionStaleLog = errors.New("candidate log is behind the voter or diverges at its tip")
	ErrReplicaCatchUp = errors.New("replica catch-up stopped at a missing or divergent prefix")
)

// ReplicaLogTip describes the final entry in one append-only replica log.
// It is NOT a committed index, and not proof that a candidate is the leader.
type ReplicaLogTip struct {
	LastTerm uint64
	LastIndex uint64
	LastHash string
}

func validReplicaTip(t ReplicaLogTip) bool {
	if t.LastIndex == 0 {
		return t.LastTerm == 0 && t.LastHash == zeroReplicaHash
	}
	return t.LastTerm != 0 && validSHA256Hex(t.LastHash) && t.LastHash != zeroReplicaHash
}

func (l *ReplicaLog) tipLocked() (ReplicaLogTip,error) {
	if len(l.entries) == 0 {
		return ReplicaLogTip{LastHash:zeroReplicaHash},nil
	}
	last := l.entries[len(l.entries)-1]
	hash,err := last.Digest()
	if err != nil{return ReplicaLogTip{},err}
	return ReplicaLogTip{LastTerm:last.Term,LastIndex:last.Index,LastHash:hash},nil
}

func (l *ReplicaLog) Tip()(ReplicaLogTip,error){
	if l==nil{return ReplicaLogTip{},ErrReplicaInvalid}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.faulted||l.file==nil{return ReplicaLogTip{},ErrReplicaStorage}
	return l.tipLocked()
}

func candidateLogFreshEnough(candidate,local ReplicaLogTip)bool{
	if !validReplicaTip(candidate)||!validReplicaTip(local){return false}
	if candidate.LastTerm!=local.LastTerm{
		return candidate.LastTerm>local.LastTerm
	}
	if candidate.LastIndex!=local.LastIndex{
		return candidate.LastIndex>local.LastIndex
	}
	// Exact tip: reject a same-term, same-index divergent hash. Raft assumes
	// this cannot occur for an honest leader; our lab fails closed instead.
	return candidate.LastHash==local.LastHash
}

// VoteWithReplica is the stricter offline election path. It serializes the
// candidate-tip check, durable term observation and vote with the replica's
// append mutex, so an in-flight append cannot race the vote. Every accepted
// vote binds the exact candidate tip inside its Ed25519 signature.
// Existing Vote() remains legacy evidence and is rejected by strict checks.
func (w *ElectionWitness) VoteWithReplica(l *ReplicaLog,term uint64,candidate string,tip ReplicaLogTip)(ElectionVote,error){
	if w==nil||l==nil||term==0||!validServiceID(candidate)||!validReplicaTip(tip){
		return ElectionVote{},ErrElectionInvalid
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.faulted||l.file==nil{return ElectionVote{},ErrReplicaStorage}
	if w.member!=l.member||w.cluster!=l.cluster||w.signerHash!=l.signerHash{
		return ElectionVote{},ErrElectionInvalid
	}
	if term<l.highTerm{return ElectionVote{},ErrElectionConflict}
	// A higher election term fences stale appends before a vote can be issued.
	// The witness also durably records it even if the candidate is stale.
	if term>l.highTerm {
		if err:=l.persistLocked("term",term,nil);err!=nil{return ElectionVote{},err}
	}
	if err:=w.ObserveTerm(term);err!=nil{return ElectionVote{},err}
	local,err:=l.tipLocked()
	if err!=nil{return ElectionVote{},err}
	if !candidateLogFreshEnough(tip,local){return ElectionVote{},ErrElectionStaleLog}
	v,err:=w.Vote(term,candidate)
	if err!=nil{return ElectionVote{},err}
	copyTip:=tip
	v.Tip=&copyTip
	payload,err:=v.payload()
	if err!=nil{return ElectionVote{},err}
	v.Signature=hex.EncodeToString(ed25519.Sign(w.signer,payload))
	return v,nil
}

// FreshElectionCertificate is signed election evidence that all quorum
// members evaluated the SAME advertised candidate tip against their local
// durable logs. It does not establish actual log replication or a live leader.
type FreshElectionCertificate struct {
	Election ElectionCertificate
	CandidateTip ReplicaLogTip
}

func VerifyFreshElectionCertificate(roster ElectionRoster,c FreshElectionCertificate)error{
	if !validReplicaTip(c.CandidateTip){return ErrElectionInvalid}
	if err:=VerifyElectionCertificate(roster,c.Election);err!=nil{return err}
	for _,v:=range c.Election.Votes{
		if v.Tip==nil||*v.Tip!=c.CandidateTip{return ErrElectionStaleLog}
	}
	return nil
}

// AppendFreshCandidate is a STRICTER alternate append path. Existing
// AppendCandidate supports historical lab tests and remains non-authoritative.
// This function still has no Raft leadership/commit-index guarantees.
func (l *ReplicaLog) AppendFreshCandidate(roster ElectionRoster,cert FreshElectionCertificate,e AuthorityLogEntry)(ReplicaReceipt,error){
	if VerifyFreshElectionCertificate(roster,cert)!=nil {
		return ReplicaReceipt{},ErrElectionInvalid
	}
	if cert.Election.Term!=e.Term||cert.Election.CandidateID!=e.LeaderID{
		return ReplicaReceipt{},ErrElectionInvalid
	}
	return l.AppendCandidate(roster,cert.Election,e)
}

// ReadReplicaRange returns a bounded immutable COPY of the requested
// contiguous prefix. It never discloses signatures, keys or player state.
func (l *ReplicaLog) ReadReplicaRange(start uint64,limit int)([]AuthorityLogEntry,error){
	if l==nil||start==0||limit<=0||limit>MaxReplicaEntries{return nil,ErrReplicaInvalid}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.faulted||l.file==nil{return nil,ErrReplicaStorage}
	if start>uint64(len(l.entries))+1{return nil,ErrReplicaCatchUp}
	if start==uint64(len(l.entries))+1{return []AuthorityLogEntry{},nil}
	end:=start-1+uint64(limit)
	if end>uint64(len(l.entries)){end=uint64(len(l.entries))}
	result:=make([]AuthorityLogEntry,int(end-start+1))
	copy(result,l.entries[start-1:end])
	return result,nil
}

// CatchUpReplicaRange is synchronous, offline and strictly append-only. It
// verifies every entry against the destination's existing prefix. It refuses
// divergent history rather than overwriting it. Current term must match the
// batch's term; historical-term Raft catch-up is NOT implemented.
func CatchUpReplicaRange(dest *ReplicaLog,roster ElectionRoster,cert FreshElectionCertificate,entries []AuthorityLogEntry)([]ReplicaReceipt,error){
	if dest==nil||len(entries)==0||len(entries)>MaxReplicaEntries{
		return nil,ErrReplicaCatchUp
	}
	if err:=VerifyFreshElectionCertificate(roster,cert);err!=nil{return nil,err}
	acks:=make([]ReplicaReceipt,0,len(entries))
	for _,e:=range entries {
		if e.Term!=cert.Election.Term||e.LeaderID!=cert.Election.CandidateID{
			return nil,ErrReplicaCatchUp
		}
		r,err:=dest.AppendFreshCandidate(roster,cert,e)
		if err!=nil{return nil,err}
		acks=append(acks,r)
	}
	return acks,nil
}
