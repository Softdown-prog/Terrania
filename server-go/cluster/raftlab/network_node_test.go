package raftlab

import (
	"errors"
	"io"
	"net"
	"reflect"
	"testing"
	"time"

	"github.com/hashicorp/raft"
)

// tcpLab uses independent Raft state machines with actual TCP sockets and
// per-node mTLS. It is an in-process integration test, NOT three OS processes.
type tcpLab struct {
	order []string
	nodes map[string]*TLSRaftNode
}

func newTCPLab(t *testing.T,ids ...string)*tcpLab{
	t.Helper()
	ca:=makeLabCA(t)
	listeners:=make(map[string]net.Listener,len(ids))
	servers:=make([]raft.Server,0,len(ids))
	for _,id:=range ids{
		listener:=listenLab(t)
		listeners[id]=listener
		servers=append(servers,raft.Server{
			ID:raft.ServerID(id),Address:raft.ServerAddress(listener.Addr().String()),
			Suffrage:raft.Voter,
		})
	}
	lab:=&tcpLab{order:append([]string(nil),ids...),nodes:make(map[string]*TLSRaftNode)}
	for _,id:=range ids{
		store:=raft.NewInmemStore()
		node,err:=StartLoopbackRaftNode(id,listeners[id],ca.sign(t,id),ca.roots,
			servers,store,store,raft.NewInmemSnapshotStore(),true)
		if err!=nil{
			for _,existing:=range lab.nodes{_ = existing.Close()}
			t.Fatal(err)
		}
		lab.nodes[id]=node
	}
	t.Cleanup(func(){
		for _,node:=range lab.nodes{if err:=node.Close();err!=nil{t.Error(err)}}
	})
	return lab
}

func (lab *tcpLab) leader(t *testing.T,allowed []string,limit time.Duration)*TLSRaftNode{
	t.Helper()
	deadline:=time.Now().Add(limit)
	for time.Now().Before(deadline){
		var elected *TLSRaftNode
		count:=0
		for _,id:=range allowed{
			node:=lab.nodes[id]
			if node.Raft!=nil&&node.Raft.State()==raft.Leader{count++;elected=node}
		}
		if count==1{return elected}
		time.Sleep(20*time.Millisecond)
	}
	t.Fatal("Raft TCP mTLS leader election did not finish")
	return nil
}

func (lab *tcpLab) waitRecords(t *testing.T,ids []string,count int){
	t.Helper()
	until:=time.Now().Add(6*time.Second)
	for time.Now().Before(until){
		all:=true
		for _,id:=range ids {
			if len(lab.nodes[id].FSM.Records())!=count{all=false;break}
		}
		if all{return}
		time.Sleep(20*time.Millisecond)
	}
	t.Fatalf("Raft TLS replicas %v did not apply %d entries",ids,count)
}

func TestRaftNetworkTLSActualTCPLeaderFailoverAndQuorum(t *testing.T){
	lab:=newTCPLab(t,"north","south","west")
	leader:=lab.leader(t,lab.order,6*time.Second)
	first:=proposal("tls-mtls-first")
	if err:=leader.Propose(first,3*time.Second);err!=nil{t.Fatal(err)}
	lab.waitRecords(t,lab.order,1)
	previous:=leader.ID
	if err:=leader.Close();err!=nil{t.Fatal(err)}
	majority:=make([]string,0,2)
	for _,id:=range lab.order{if id!=previous{majority=append(majority,id)}}
	successor:=lab.leader(t,majority,6*time.Second)
	second:=proposal("tls-mtls-after-failure")
	if err:=successor.Propose(second,3*time.Second);err!=nil{t.Fatal(err)}
	lab.waitRecords(t,majority,2)
	for _,id:=range majority{
		got:=lab.nodes[id].FSM.Records()
		if !reflect.DeepEqual(got,[]Proposal{first,second}){
			t.Fatalf("mTLS node %s diverged after failover: %+v",id,got)
		}
	}
}

func TestRaftNetworkTLSNoMajorityNeverAcknowledgesCommit(t *testing.T){
	lab:=newTCPLab(t,"a","b","c")
	leader:=lab.leader(t,lab.order,6*time.Second)
	if err:=leader.Propose(proposal("before-quorum-loss"),3*time.Second);err!=nil{t.Fatal(err)}
	lab.waitRecords(t,lab.order,1)
	for _,id:=range lab.order{
		if id!=leader.ID{
			if err:=lab.nodes[id].Close();err!=nil{t.Fatal(err)}
		}
	}
	err:=leader.Propose(proposal("no-quorum-must-not-commit"),800*time.Millisecond)
	if err==nil{t.Fatal("isolated Raft leader confirmed a command without majority")}
	time.Sleep(400*time.Millisecond)
	if len(leader.FSM.Records())!=1{
		t.Fatal("isolated leader applied an uncommitted command")
	}
}

func TestRaftNetworkTLSFiveMembersRequireThree(t *testing.T){
	lab:=newTCPLab(t,"a","b","c","d","e")
	leader:=lab.leader(t,lab.order,6*time.Second)
	majority:=[]string{leader.ID}
	for _,id:=range lab.order {
		if id==leader.ID{continue}
		if len(majority)<3{
			majority=append(majority,id)
		}else{
			if err:=lab.nodes[id].Close();err!=nil{t.Fatal(err)}
		}
	}
	commit:=proposal("three-out-of-five")
	if err:=leader.Propose(commit,3*time.Second);err!=nil{t.Fatal(err)}
	lab.waitRecords(t,majority,1)
	// Now only two voters remain; there can be no new commit.
	if err:=lab.nodes[majority[2]].Close();err!=nil{t.Fatal(err)}
	if err:=leader.Propose(proposal("two-out-of-five"),800*time.Millisecond);err==nil{
		t.Fatal("two voters accepted a five-member Raft commit")
	}
	for _,id:=range majority[:2]{
		if got:=lab.nodes[id].FSM.Records();!reflect.DeepEqual(got,[]Proposal{commit}){
			t.Fatalf("minority node %s applied unsupported commit: %+v",id,got)
		}
	}
}

func TestRaftNetworkRejectsInvalidMembershipBeforeStartingTransport(t *testing.T){
	listener:=listenLab(t)
	ca:=makeLabCA(t)
	store:=raft.NewInmemStore()
	servers:=[]raft.Server{
		{ID:"node-a",Address:raft.ServerAddress(listener.Addr().String()),Suffrage:raft.Voter},
		{ID:"node-b",Address:"127.0.0.1:1234",Suffrage:raft.Voter},
		{ID:"node-b",Address:"127.0.0.1:5678",Suffrage:raft.Voter},
	}
	if node,err:=StartLoopbackRaftNode("node-a",listener,ca.sign(t,"node-a"),ca.roots,servers,
		store,store,raft.NewInmemSnapshotStore(),true);!errors.Is(err,ErrNetworkLabConfig){
		if node!=nil{_ = node.Close()}
		t.Fatalf("duplicate peer ID accepted: %v",err)
	}
	// No initialized Raft state is allowed without an explicit bootstrap.
	servers[2].ID="node-c"
	if node,err:=StartLoopbackRaftNode("node-a",listener,ca.sign(t,"node-a"),ca.roots,servers,
		store,store,raft.NewInmemSnapshotStore(),false);!errors.Is(err,ErrNetworkLabConfig){
		if node!=nil{_ = node.Close()}
		t.Fatalf("uninitialized store silently started: %v",err)
	}
	_ = io.Discard
}
