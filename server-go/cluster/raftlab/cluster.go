package raftlab

import (
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "sync"
 "time"

 "github.com/hashicorp/raft"
)

var (
 ErrBadCluster=errors.New("raft laboratory requires 3 or 5 distinct members")
 ErrCommitUnknown=errors.New("raft commit outcome is unknown without majority confirmation")
 ErrNotLabLeader=errors.New("requested lab node is not leader")
)

// Node is restricted to in-memory Raft transports/stores in this sandbox.
// It does NOT persist a distributed cluster across a process crash.
type Node struct {
 ID string
 Raft *raft.Raft
 FSM *FSM
 transport *raft.InmemTransport
 store *raft.InmemStore
}

type Cluster struct {
 Nodes map[string]*Node
 order []string
 mu sync.Mutex
 closed bool
}

// NewCluster is an opt-in, in-process 3/5-member LAB. It binds no sockets,
// reads no credentials and cannot activate game workers.
func NewCluster(ids ...string)(*Cluster,error){
 if len(ids)!=3&&len(ids)!=5{return nil,ErrBadCluster}
 c:=&Cluster{Nodes:make(map[string]*Node),order:append([]string(nil),ids...)}
 configuration:=raft.Configuration{}
 for _,id:=range ids{
  if !validName(id){return nil,ErrBadCluster}
  if _,ok:=c.Nodes[id];ok{return nil,ErrBadCluster}
  address,trans:=raft.NewInmemTransport(raft.ServerAddress(id))
  store:=raft.NewInmemStore()
  c.Nodes[id]=&Node{ID:id,transport:trans,store:store,FSM:NewFSM()}
  configuration.Servers=append(configuration.Servers,raft.Server{
   Suffrage:raft.Voter,ID:raft.ServerID(id),Address:address,
  })
 }
 // Full graph must be connected before NewRaft starts its goroutines.
 c.ConnectAll()
 for _,id:=range ids{
  node:=c.Nodes[id]
  cfg:=raft.DefaultConfig()
  cfg.LocalID=raft.ServerID(id)
  cfg.HeartbeatTimeout=250*time.Millisecond
  cfg.ElectionTimeout=250*time.Millisecond
  cfg.LeaderLeaseTimeout=125*time.Millisecond
  cfg.CommitTimeout=20*time.Millisecond
  cfg.LogOutput=io.Discard
  snapshot:=raft.NewInmemSnapshotStore()
  if err:=raft.BootstrapCluster(cfg,node.store,node.store,snapshot,node.transport,configuration);err!=nil{
   _=c.Close()
   return nil,fmt.Errorf("bootstrap %s: %w",id,err)
  }
  server,err:=raft.NewRaft(cfg,node.FSM,node.store,node.store,snapshot,node.transport)
  if err!=nil{
   _=c.Close()
   return nil,fmt.Errorf("start %s: %w",id,err)
  }
  node.Raft=server
 }
 return c,nil
}

func (c *Cluster) ConnectAll(){
 for _,a:=range c.order{
  for _,b:=range c.order{
   if a==b{continue}
   c.Nodes[a].transport.Connect(raft.ServerAddress(b),c.Nodes[b].transport)
  }
 }
}

// Isolate cuts all transport edges on both sides of an individual node.
func (c *Cluster) Isolate(id string)error{
 n,ok:=c.Nodes[id]
 if !ok{return ErrBadCluster}
 for _,other:=range c.order{
  if other==id{continue}
  n.transport.Disconnect(raft.ServerAddress(other))
  c.Nodes[other].transport.Disconnect(raft.ServerAddress(id))
 }
 return nil
}

// LeaderAmong avoids mistaking an isolated former leader for a quorum leader:
// only accept candidates from the specifically selected partition.
func (c *Cluster) LeaderAmong(allowed []string,timeout time.Duration)(*Node,error){
 if len(allowed)==0{return nil,ErrBadCluster}
 deadline:=time.Now().Add(timeout)
 for time.Now().Before(deadline){
  var leader *Node
  count:=0
  for _,id:=range allowed{
   n,ok:=c.Nodes[id]
   if !ok{return nil,ErrBadCluster}
   if n.Raft!=nil&&n.Raft.State()==raft.Leader{leader=n;count++}
  }
  if count==1{return leader,nil}
  time.Sleep(20*time.Millisecond)
 }
 return nil,ErrCommitUnknown
}

// Propose returns success ONLY when Raft.Apply has responded that the entry
// was committed and the local FSM has accepted it. A timeout is INDETERMINATE,
// not proof of failure: never retry an actual grant after this without reading
// the committed state. This method is laboratory-only and has no side effects.
func (n *Node) Propose(p Proposal,timeout time.Duration)error{
 if n==nil||n.Raft==nil||timeout<=0{return ErrProposalInvalid}
 if err:=p.Validate();err!=nil{return err}
 if n.Raft.State()!=raft.Leader{return ErrNotLabLeader}
 data,err:=json.Marshal(p)
 if err!=nil||len(data)>maxEncodedCommand{return ErrProposalInvalid}
 future:=n.Raft.Apply(data,timeout)
 done:=make(chan error,1)
 go func(){
  if err:=future.Error();err!=nil{done<-err;return}
  if result,ok:=future.Response().(error);ok&&result!=nil{done<-result;return}
  done<-nil
 }()
 timer:=time.NewTimer(timeout)
 defer timer.Stop()
 select{
 case err:=<-done:return err
 case <-timer.C:return ErrCommitUnknown
 }
}

func (c *Cluster) Close()error{
 if c==nil{return nil}
 c.mu.Lock()
 defer c.mu.Unlock()
 if c.closed{return nil}
 c.closed=true
 futures:=make([]raft.Future,0,len(c.order))
 for _,id:=range c.order{if c.Nodes[id].Raft!=nil{futures=append(futures,c.Nodes[id].Raft.Shutdown())}}
 var first error
 for _,f:=range futures{if err:=f.Error();err!=nil&&first==nil{first=err}}
 for _,id:=range c.order{if err:=c.Nodes[id].transport.Close();err!=nil&&first==nil{first=err}}
 return first
}
