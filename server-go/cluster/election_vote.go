package cluster

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
)

const (
	electionRecordVersion = 1
	maxElectionRecordBytes = 1024
	maxElectionMembers = 9
)

var (
	ErrElectionInvalid = errors.New("invalid election term, witness or signature")
	ErrElectionConflict = errors.New("witness already voted for another candidate in this term")
	ErrElectionNoQuorum = errors.New("election has no verified majority")
	ErrElectionStorage = errors.New("election witness storage failed; witness fenced")
	ErrElectionCorrupt = errors.New("election journal is incomplete or invalid")
)

// ElectionVote is a signed vote, NOT a Raft leadership lease or an
// authorization to run gameplay. Do not accept it in WorkerLeaseGate.
type ElectionVote struct {
	ClusterID string
	MemberID string
	CandidateID string
	Term uint64
	Signature string
}

type electionPayload struct {
	Domain string
	ClusterID string
	MemberID string
	CandidateID string
	Term uint64
}

func (v ElectionVote) payload()([]byte,error){
	return json.Marshal(electionPayload{
		Domain:"terrania/election-vote/v1",ClusterID:v.ClusterID,MemberID:v.MemberID,
		CandidateID:v.CandidateID,Term:v.Term,
	})
}

type electionRecord struct {
	Version uint16
	Index uint64
	ClusterID string
	MemberID string
	SignerHash string
	Term uint64
	CandidateID string // empty means a higher term was observed, not yet voted
}

// ElectionWitness is one independent durable vote store. Each witness must
// run in its own failure domain with a distinct signing key and private disk.
// No networking, heartbeat, log replication or leader activation is provided.
type ElectionWitness struct {
	mu sync.Mutex
	file *os.File
	lockPath string
	cluster string
	member string
	signer ed25519.PrivateKey
	signerHash string
	index uint64
	term uint64
	candidate string
	faulted bool
}

func OpenElectionWitness(path,cluster,member string,key ed25519.PrivateKey)(*ElectionWitness,error){
	if !filepath.IsAbs(path)||!validServiceID(cluster)||!validServiceID(member)||
		len(key)!=ed25519.PrivateKeySize{return nil,ErrElectionInvalid}
	if info,err:=os.Lstat(path);err==nil{
		if !info.Mode().IsRegular()||info.Mode().Perm()!=0600{return nil,ErrElectionStorage}
	}else if !errors.Is(err,os.ErrNotExist){return nil,err}
	lockPath:=path+".lock"
	lock,err:=os.OpenFile(lockPath,os.O_WRONLY|os.O_CREATE|os.O_EXCL,0600)
	if err!=nil{return nil,fmt.Errorf("%w: concurrent witness or stale lock: %v",ErrElectionStorage,err)}
	if err:=lock.Close();err!=nil{return nil,err}
	release:=func(){_ = os.Remove(lockPath)}
	file,err:=os.OpenFile(path,os.O_RDWR|os.O_CREATE,0600)
	if err!=nil{release();return nil,err}
	pub:=key.Public().(ed25519.PublicKey)
	h:=sha256.Sum256(pub)
	w:=&ElectionWitness{file:file,lockPath:lockPath,cluster:cluster,member:member,
		signer:append(ed25519.PrivateKey(nil),key...),signerHash:hex.EncodeToString(h[:])}
	if err:=w.replay();err!=nil{_ = file.Close();release();return nil,err}
	if _,err:=file.Seek(0,io.SeekEnd);err!=nil{_ = file.Close();release();return nil,err}
	return w,nil
}

func (w *ElectionWitness) replay()error{
	if _,err:=w.file.Seek(0,io.SeekStart);err!=nil{return err}
	for{
		var header [36]byte
		_,err:=io.ReadFull(w.file,header[:])
		if err==io.EOF{return nil}
		if err!=nil{return fmt.Errorf("%w: truncated header",ErrElectionCorrupt)}
		n:=binary.BigEndian.Uint32(header[:4])
		if n==0||n>maxElectionRecordBytes{return ErrElectionCorrupt}
		body:=make([]byte,int(n))
		if _,err:=io.ReadFull(w.file,body);err!=nil{return fmt.Errorf("%w: truncated record",ErrElectionCorrupt)}
		checksum:=sha256.Sum256(body)
		var stored [32]byte
		copy(stored[:],header[4:])
		if checksum!=stored{return fmt.Errorf("%w: record checksum",ErrElectionCorrupt)}
		var r electionRecord
		if err:=json.Unmarshal(body,&r);err!=nil{return ErrElectionCorrupt}
		if r.Version!=electionRecordVersion||r.Index!=w.index+1||r.Term==0||
			r.ClusterID!=w.cluster||r.MemberID!=w.member||r.SignerHash!=w.signerHash||
			r.Term<w.term||(r.CandidateID!=""&&!validServiceID(r.CandidateID)){
			return ErrElectionCorrupt
		}
		if r.Term==w.term {
			// A term may be observed first and voted later, but can never
			// switch candidates or reset a committed vote.
			if w.candidate!=""||r.CandidateID=="" {return ErrElectionCorrupt}
		}
		w.index=r.Index
		w.term=r.Term
		w.candidate=r.CandidateID
	}
}

func (w *ElectionWitness) appendLocked(term uint64,candidate string)error{
	if w.faulted||w.file==nil||w.index==^uint64(0){
		w.faulted=true
		return ErrElectionStorage
	}
	r:=electionRecord{Version:electionRecordVersion,Index:w.index+1,
		ClusterID:w.cluster,MemberID:w.member,SignerHash:w.signerHash,
		Term:term,CandidateID:candidate}
	body,err:=json.Marshal(r)
	if err!=nil||len(body)==0||len(body)>maxElectionRecordBytes{
		w.faulted=true
		return ErrElectionStorage
	}
	var header [36]byte
	binary.BigEndian.PutUint32(header[:4],uint32(len(body)))
	hash:=sha256.Sum256(body)
	copy(header[4:],hash[:])
	if n,err:=w.file.Write(header[:]);err!=nil||n!=len(header){w.faulted=true;return ErrElectionStorage}
	if n,err:=w.file.Write(body);err!=nil||n!=len(body){w.faulted=true;return ErrElectionStorage}
	if err:=w.file.Sync();err!=nil{w.faulted=true;return ErrElectionStorage}
	w.index++
	w.term=term
	w.candidate=candidate
	return nil
}

// ObserveTerm advances the durable high-water term even without selecting a
// candidate, protecting against replays from a former coordinator.
func (w *ElectionWitness) ObserveTerm(term uint64)error{
	if w==nil||term==0{return ErrElectionInvalid}
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.faulted||w.file==nil{return ErrElectionStorage}
	if term<w.term{return ErrElectionConflict}
	if term==w.term{return nil}
	return w.appendLocked(term,"")
}

// Vote persists its decision BEFORE signing. Repeated requests for the same
// candidate/term are idempotent; competing candidates are rejected.
func (w *ElectionWitness) Vote(term uint64,candidate string)(ElectionVote,error){
	if w==nil||term==0||!validServiceID(candidate){return ElectionVote{},ErrElectionInvalid}
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.faulted||w.file==nil{return ElectionVote{},ErrElectionStorage}
	if term<w.term||(term==w.term&&w.candidate!=""&&w.candidate!=candidate){
		return ElectionVote{},ErrElectionConflict
	}
	if term>w.term||w.candidate==""{
		if err:=w.appendLocked(term,candidate);err!=nil{return ElectionVote{},err}
	}
	v:=ElectionVote{ClusterID:w.cluster,MemberID:w.member,CandidateID:candidate,Term:term}
	message,err:=v.payload()
	if err!=nil{return ElectionVote{},err}
	v.Signature=hex.EncodeToString(ed25519.Sign(w.signer,message))
	return v,nil
}

func (w *ElectionWitness) Close()error{
	if w==nil{return nil}
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file==nil{return nil}
	w.faulted=true
	err:=w.file.Close()
	if err!=nil{return err}
	w.file=nil
	return os.Remove(w.lockPath)
}

// ElectionRoster is an immutable set of trusted voter public keys. The caller
// MUST load this from an authenticated, identical cluster configuration.
type ElectionRoster struct {
	ClusterID string
	Members map[string]ed25519.PublicKey
}

type ElectionCertificate struct {
	ClusterID string
	CandidateID string
	Term uint64
	Votes []ElectionVote
}

// VerifyElectionCertificate proves ONLY a majority voted for the SAME
// candidate in ONE term. It cannot prove a replicated log is committed, that
// this is the newest term, or that an old leader's GAMEPLAY LEASE is expired.
func VerifyElectionCertificate(roster ElectionRoster,cert ElectionCertificate)error{
	n:=len(roster.Members)
	if !validServiceID(roster.ClusterID)||n<3||n>maxElectionMembers||n%2==0||
		cert.ClusterID!=roster.ClusterID||!validServiceID(cert.CandidateID)||
		cert.Term==0||len(cert.Votes)<n/2+1||len(cert.Votes)>n{
		return ErrElectionNoQuorum
	}
	keys:=make(map[string]struct{},n)
	for id,pub:=range roster.Members{
		if !validServiceID(id)||len(pub)!=ed25519.PublicKeySize{return ErrElectionInvalid}
		key:=hex.EncodeToString(pub)
		if _,ok:=keys[key];ok{return ErrElectionInvalid}
		keys[key]=struct{}{}
	}
	seen:=make(map[string]struct{},len(cert.Votes))
	for _,vote:=range cert.Votes{
		pub,exists:=roster.Members[vote.MemberID]
		if !exists||vote.ClusterID!=cert.ClusterID||vote.CandidateID!=cert.CandidateID||
			vote.Term!=cert.Term{return ErrElectionInvalid}
		if _,duplicate:=seen[vote.MemberID];duplicate{return ErrElectionInvalid}
		seen[vote.MemberID]=struct{}{}
		signature,err:=hex.DecodeString(vote.Signature)
		if err!=nil||len(signature)!=ed25519.SignatureSize{return ErrElectionInvalid}
		msg,err:=vote.payload()
		if err!=nil||!ed25519.Verify(pub,msg,signature){return ErrElectionInvalid}
	}
	return nil
}
