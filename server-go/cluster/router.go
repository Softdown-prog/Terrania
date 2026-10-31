// Package cluster provides deterministic room ownership for independent Go workers.
// The gateway never simulates the world. All players in a room share ONE worker.
package cluster

import (
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"fmt"
	"net/url"
	"strings"
)

type Backend struct {
	ID string
	URL *url.URL
}
type Router struct { nodes []Backend }

func NewRouter(spec string) (*Router,error) {
	if strings.TrimSpace(spec)=="" {return nil,errors.New("GO_SHARDS is required (id=http://host:port,...)")}
	list:=strings.Split(spec,",")
	nodes:=make([]Backend,0,len(list))
	ids:=make(map[string]bool,len(list))
	for _,entry:=range list {
		parts:=strings.SplitN(strings.TrimSpace(entry),"=",2)
		if len(parts)!=2 {return nil,fmt.Errorf("invalid shard: %q",entry)}
		id:=parts[0]
		if len(id)<1||len(id)>32 {return nil,errors.New("shard ID length must be 1..32")}
		for _,c:=range id {
			if !((c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='-') {return nil,fmt.Errorf("invalid shard ID: %q",id)}
		}
		if ids[id] {return nil,fmt.Errorf("duplicate shard ID: %s",id)}
		u,err:=url.Parse(parts[1])
		if err!=nil||u==nil||u.Host==""|| (u.Scheme!="http"&&u.Scheme!="https")||
			u.User!=nil||u.RawQuery!=""||u.Fragment!=""||u.Path!="" {
			return nil,fmt.Errorf("invalid shard URL for %s: HTTP(S) host and port only",id)
		}
		ids[id]=true
		nodes=append(nodes,Backend{ID:id,URL:u})
	}
	if len(nodes)>128 {return nil,errors.New("maximum 128 workers per gateway")}
	return &Router{nodes:nodes},nil
}

// Rendezvous hashing: independent of backend declaration order.
// Room assignments remain stable when weights, join order and client count change.
// Adding/removing workers necessarily remaps some rooms: do this only with draining.
func (r *Router) Pick(room string) Backend {
	var winner Backend
	var highest uint64
	for i,node:=range r.nodes {
		key:=sha256.Sum256([]byte(room+"\x00"+node.ID))
		score:=binary.BigEndian.Uint64(key[:8])
		if i==0||score>highest||(score==highest&&node.ID<winner.ID) {
			winner=node;highest=score
		}
	}
	return winner
}
func (r *Router) Count() int {return len(r.nodes)}
