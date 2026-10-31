package raftlab

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"sync"
	"time"

	"github.com/hashicorp/raft"
	raftboltdb "github.com/hashicorp/raft-boltdb/v2"
	"go.etcd.io/bbolt"
)

var (
	ErrDurableLabConfig = errors.New("invalid persistent Raft lab directory or immutable membership")
	ErrDurableLabState  = errors.New("incomplete or mismatched persistent Raft lab state")
)

type durableManifest struct {
	Version int
	Members []string
}

// DurableCluster uses a real, fsynced bbolt LogStore/StableStore and private
// Raft file snapshots. Transports are IN-MEMORY ONLY: callers must never claim
// this is a distributed TCP cluster or wire it to live worker leases.
type DurableCluster struct {
	Nodes map[string]*Node
	order []string
	stores map[string]*raftboltdb.BoltStore
	mu sync.Mutex
	closed bool
}

func privateDirectory(path string,create bool)error {
	info,err:=os.Lstat(path)
	if errors.Is(err,os.ErrNotExist)&&create {
		if err=os.Mkdir(path,0700);err!=nil{return err}
		info,err=os.Lstat(path)
	}
	if err!=nil{return err}
	if !info.IsDir()||info.Mode().Perm()!=0700||info.Mode()&os.ModeSymlink!=0{
		return ErrDurableLabConfig
	}
	return nil
}

func fsyncDir(dir string)error{
	f,err:=os.Open(dir)
	if err!=nil{return err}
	defer f.Close()
	return f.Sync()
}

func durableMembership(path string,ids []string)(bool,error){
	filename:=filepath.Join(path,"members.json")
	value,err:=json.Marshal(durableManifest{Version:1,Members:ids})
	if err!=nil{return false,err}
	file,err:=os.OpenFile(filename,os.O_WRONLY|os.O_CREATE|os.O_EXCL,0600)
	if err==nil{
		defer file.Close()
		if n,err:=file.Write(value);err!=nil||n!=len(value){return false,ErrDurableLabState}
		if err:=file.Sync();err!=nil{return false,err}
		if err:=fsyncDir(path);err!=nil{return false,err}
		return true,nil
	}
	if !errors.Is(err,os.ErrExist){return false,err}
	info,err:=os.Lstat(filename)
	if err!=nil||!info.Mode().IsRegular()||info.Mode().Perm()!=0600{return false,ErrDurableLabConfig}
	body,err:=os.ReadFile(filename)
	if err!=nil||len(body)>1024{return false,ErrDurableLabState}
	var existing durableManifest
	decoder:=json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err:=decoder.Decode(&existing);err!=nil{return false,ErrDurableLabState}
	var trailing any
	if err:=decoder.Decode(&trailing);err!=io.EOF{return false,ErrDurableLabState}
	if existing.Version!=1||!reflect.DeepEqual(existing.Members,ids){
		return false,ErrDurableLabConfig
	}
	return false,nil
}

// OpenDurableCluster starts three or five private Raft stores on an absolute,
// caller-supplied TEST directory. First boot writes an immutable membership
// manifest; later opens require the identical ordered membership and all
// previous node databases. Incomplete first boots fail closed, rather than
// creating an accidental second cluster.
//
// This is NOT an automated crash-safe multi-host bootstrap procedure.
func OpenDurableCluster(root string,ids ...string)(*DurableCluster,error){
	if !filepath.IsAbs(root)||(len(ids)!=3&&len(ids)!=5){return nil,ErrDurableLabConfig}
	seen:=map[string]bool{}
	for _,id:=range ids{
		if !validName(id)||seen[id] {return nil,ErrDurableLabConfig}
		seen[id]=true
	}
	if err:=privateDirectory(root,true);err!=nil{return nil,err}
	first,err:=durableMembership(root,ids)
	if err!=nil{return nil,err}
	c:=&DurableCluster{Nodes:make(map[string]*Node),order:append([]string(nil),ids...),
		stores:make(map[string]*raftboltdb.BoltStore)}
	fail:=func(err error)(*DurableCluster,error){_ = c.Close();return nil,err}
	config:=raft.Configuration{}
	for _,id:=range ids{
		path:=filepath.Join(root,id)
		if err:=privateDirectory(path,first);err!=nil{return fail(fmt.Errorf("node %s: %w",id,ErrDurableLabState))}
		dbPath:=filepath.Join(path,"state.bolt")
		if !first {
			info,err:=os.Lstat(dbPath)
			if err!=nil||!info.Mode().IsRegular()||info.Mode().Perm()!=0600{
				return fail(ErrDurableLabState)
			}
		}
		store,err:=raftboltdb.New(raftboltdb.Options{
			Path:dbPath,
			BoltOptions:&bbolt.Options{Timeout:200*time.Millisecond},
		})
		if err!=nil{return fail(fmt.Errorf("node %s db: %w",id,err))}
		c.stores[id]=store
		address,transport:=raft.NewInmemTransport(raft.ServerAddress(id))
		c.Nodes[id]=&Node{ID:id,Raft:nil,FSM:NewFSM(),transport:transport}
		config.Servers=append(config.Servers,raft.Server{
			Suffrage:raft.Voter,ID:raft.ServerID(id),Address:address,
		})
	}
	for _,a:=range ids {
		for _,b:=range ids {
			if a!=b {c.Nodes[a].transport.Connect(raft.ServerAddress(b),c.Nodes[b].transport)}
		}
	}
	for _,id:=range ids {
		node:=c.Nodes[id]
		store:=c.stores[id]
		cfg:=raft.DefaultConfig()
		cfg.LocalID=raft.ServerID(id)
		cfg.HeartbeatTimeout=250*time.Millisecond
		cfg.ElectionTimeout=250*time.Millisecond
		cfg.LeaderLeaseTimeout=125*time.Millisecond
		cfg.CommitTimeout=20*time.Millisecond
		cfg.LogOutput=io.Discard
		snapshots,err:=raft.NewFileSnapshotStore(filepath.Join(root,id),2,io.Discard)
		if err!=nil{return fail(fmt.Errorf("node %s snapshots: %w",id,err))}
		existing,err:=raft.HasExistingState(store,store,snapshots)
		if err!=nil{return fail(err)}
		if first {
			if existing{return fail(ErrDurableLabState)}
			if err:=raft.BootstrapCluster(cfg,store,store,snapshots,node.transport,config);err!=nil{return fail(err)}
		}else if !existing {
			return fail(ErrDurableLabState)
		}
		r,err:=raft.NewRaft(cfg,node.FSM,store,store,snapshots,node.transport)
		if err!=nil{return fail(fmt.Errorf("node %s start: %w",id,err))}
		node.Raft=r
	}
	return c,nil
}

func (c *DurableCluster) Leader(timeout time.Duration)(*Node,error){
	if c==nil||timeout<=0{return nil,ErrDurableLabConfig}
	deadline:=time.Now().Add(timeout)
	for time.Now().Before(deadline){
		var elected *Node
		leaders:=0
		for _,id:=range c.order{
			node:=c.Nodes[id]
			if node.Raft!=nil&&node.Raft.State()==raft.Leader{leaders++;elected=node}
		}
		if leaders==1{return elected,nil}
		time.Sleep(20*time.Millisecond)
	}
	return nil,ErrCommitUnknown
}

func (c *DurableCluster) Close()error{
	if c==nil{return nil}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed{return nil}
	c.closed=true
	var futures []raft.Future
	for _,id:=range c.order{
		if n:=c.Nodes[id];n!=nil&&n.Raft!=nil{futures=append(futures,n.Raft.Shutdown())}
	}
	var first error
	for _,f:=range futures {
		if err:=f.Error();err!=nil&&first==nil{first=err}
	}
	for _,id:=range c.order {
		if n:=c.Nodes[id];n!=nil&&n.transport!=nil{
			if err:=n.transport.Close();err!=nil&&first==nil{first=err}
		}
		if store:=c.stores[id];store!=nil{
			if err:=store.Close();err!=nil&&first==nil{first=err}
		}
	}
	return first
}
