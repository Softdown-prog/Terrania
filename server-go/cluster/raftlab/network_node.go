package raftlab

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io"
	"net"
	"time"

	"github.com/hashicorp/raft"
)

var ErrNetworkLabConfig = errors.New("invalid authenticated loopback Raft lab configuration")

// TLSRaftNode is an independent Raft instance using REAL TCP streams and
// mutually authenticated TLS. No production listener or game authority is
// registered. The calling test owns the Raft stores and snapshot store.
type TLSRaftNode struct {
	ID string
	Raft *raft.Raft
	FSM *FSM
	transport *raft.NetworkTransport
}

// StartLoopbackRaftNode deliberately requires an immutable, explicit initial
// membership. It neither discovers peers nor installs certificates. A fresh
// store can bootstrap only when explicitly authorized; existing stores are
// never bootstrapped a second time. This is laboratory plumbing, not a
// production enrollment, certificate rotation or failover mechanism.
func StartLoopbackRaftNode(
	id string, listener net.Listener, certificate tls.Certificate, roots *x509.CertPool,
	members []raft.Server, logs raft.LogStore, stable raft.StableStore,
	snapshots raft.SnapshotStore, bootstrap bool,
) (*TLSRaftNode,error) {
	if !validName(id)||listener==nil||logs==nil||stable==nil||snapshots==nil||
		(len(members)!=3&&len(members)!=5) {
		return nil,ErrNetworkLabConfig
	}
	seenIDs:=make(map[raft.ServerID]struct{},len(members))
	seenAddrs:=make(map[raft.ServerAddress]struct{},len(members))
	peers:=make(map[raft.ServerAddress]string,len(members)-1)
	local:=false
	for _,member:=range members {
		if !validName(string(member.ID))||member.Suffrage!=raft.Voter||
			member.Address=="" {
			return nil,ErrNetworkLabConfig
		}
		if _,ok:=seenIDs[member.ID];ok{return nil,ErrNetworkLabConfig}
		if _,ok:=seenAddrs[member.Address];ok{return nil,ErrNetworkLabConfig}
		seenIDs[member.ID]=struct{}{}
		seenAddrs[member.Address]=struct{}{}
		if member.ID==raft.ServerID(id) {
			if member.Address!=raft.ServerAddress(listener.Addr().String()) {
				return nil,ErrNetworkLabConfig
			}
			local=true
		}else{
			peers[member.Address]=string(member.ID)
		}
	}
	if !local{return nil,ErrNetworkLabConfig}
	layer,err:=NewLoopbackTLSLayer(listener,id,certificate,roots,peers)
	if err!=nil{return nil,err}
	// Configuration errors beyond this point MUST close the owned stream.
	transport:=raft.NewNetworkTransport(layer,2,350*time.Millisecond,io.Discard)
	fail:=func(cause error)(*TLSRaftNode,error){
		_ = transport.Close()
		return nil,cause
	}
	config:=raft.DefaultConfig()
	config.LocalID=raft.ServerID(id)
	config.HeartbeatTimeout=350*time.Millisecond
	config.ElectionTimeout=350*time.Millisecond
	config.LeaderLeaseTimeout=175*time.Millisecond
	config.CommitTimeout=25*time.Millisecond
	config.LogOutput=io.Discard
	existing,err:=raft.HasExistingState(logs,stable,snapshots)
	if err!=nil{return fail(err)}
	if bootstrap {
		if existing {return fail(ErrNetworkLabConfig)}
		if err:=raft.BootstrapCluster(config,logs,stable,snapshots,transport,
			raft.Configuration{Servers:members});err!=nil{return fail(fmt.Errorf("bootstrap: %w",err))}
	}else if !existing {
		return fail(ErrNetworkLabConfig)
	}
	fsm:=NewFSM()
	instance,err:=raft.NewRaft(config,fsm,logs,stable,snapshots,transport)
	if err!=nil{return fail(err)}
	return &TLSRaftNode{ID:id,Raft:instance,FSM:fsm,transport:transport},nil
}

func (n *TLSRaftNode) Propose(p Proposal,timeout time.Duration)error{
	if n==nil{return ErrNetworkLabConfig}
	return (&Node{Raft:n.Raft,FSM:n.FSM}).Propose(p,timeout)
}

// Close closes Raft and its authenticated TCP transport. The caller must
// close any durable stores after Close returns; this object never owns them.
func (n *TLSRaftNode) Close()error {
	if n==nil{return nil}
	var first error
	if n.Raft!=nil{
		if err:=n.Raft.Shutdown().Error();err!=nil{first=err}
		n.Raft=nil
	}
	if n.transport!=nil{
		if err:=n.transport.Close();err!=nil&&first==nil{first=err}
		n.transport=nil
	}
	return first
}
