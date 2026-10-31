package cluster

import (
	"fmt"
	"testing"
)

func TestRoomPlacementStableAndOrderIndependent(t *testing.T) {
	a,err:=NewRouter("east=http://127.0.0.1:8788,west=http://127.0.0.1:8789,center=http://127.0.0.1:8791")
	if err!=nil {t.Fatal(err)}
	b,err:=NewRouter("center=http://127.0.0.1:8791,east=http://127.0.0.1:8788,west=http://127.0.0.1:8789")
	if err!=nil {t.Fatal(err)}
	distribution:=map[string]int{}
	for i:=0;i<1000;i++ {
		room:=fmt.Sprintf("room-%04d",i)
		if a.Pick(room).ID!=b.Pick(room).ID {t.Fatalf("room %s moved after reordering workers",room)}
		distribution[a.Pick(room).ID]++
	}
	// Not a throughput benchmark: verify room ownership covers all three workers.
	for _,id:=range []string{"east","west","center"} {
		if distribution[id]<200 || distribution[id]>450 {
			t.Fatalf("unexpected shard distribution for 1000 rooms: %v",distribution)
		}
	}
}

func TestAdditionMovesOnlyRoomsAssignedToNewWorker(t *testing.T) {
	a,_:=NewRouter("east=http://127.0.0.1:8788,west=http://127.0.0.1:8789")
	b,_:=NewRouter("east=http://127.0.0.1:8788,west=http://127.0.0.1:8789,center=http://127.0.0.1:8791")
	moved:=0
	for i:=0;i<1000;i++ {
		room:=fmt.Sprintf("room-%d",i)
		before,after:=a.Pick(room),b.Pick(room)
		if before.ID!=after.ID {
			if after.ID!="center" {t.Fatalf("room %s moved from %s to unrelated worker %s",room,before.ID,after.ID)}
			moved++
		}
	}
	if moved==0||moved==1000 {t.Fatalf("unexpected remap size %d",moved)}
}

func TestRejectUnsafeShardConfiguration(t *testing.T) {
	for _,raw:=range []string{"","worker","worker=file:///tmp/secrets","worker=http://127.0.0.1:8788/a",
		"worker=http://user:secret@host:8788","worker=http://host:8788/?other=1",
		"same=http://host:1,same=http://host:2","upper_case=http://host:1234",
		"worker=http://host:8788,=http://host:8789"} {
		if _,err:=NewRouter(raw);err==nil {t.Errorf("accepted invalid GO_SHARDS: %q",raw)}
	}
}
