package cluster

import (
	"bytes"
	"context"
	"testing"
	"time"

	"github.com/Softdown-prog/Terrania/server-go/engine"
)

// This is a live engine.Room serialization and restore integration test on
// isolated in-process HTTPS/mTLS test servers. It is NOT production handoff:
// the destination room is not activated inside cmd/terrania.
func TestPrivateWireCarriesRestorableGoRoom(t *testing.T) {
	d:=testDirectory(t)
	p:=Province{X:0,Y:0}
	owner,err:=d.Register(p,"east")
	if err!=nil{t.Fatal(err)}
	source:=engine.NewRoom("origins")
	defer source.Close()
	guest:=source.Add("player-1","Explorer")
	now:=time.Unix(1_700_000_000,100).UTC()
	source.ReceiveInput(guest.ID,engine.Input{Type:"input",X:.4,Y:.2,Attack:true},now)
	for i:=0;i<5;i++{source.Tick(.05,now.Add(time.Duration(i)*50*time.Millisecond))}
	encoded,err:=source.ExportState()
	if err!=nil{t.Fatal(err)}
	snapshot:=RegionSnapshot{
		Version:RegionSnapshotVersion,Province:p,OldEpoch:owner.Epoch,
		Tick:5,Sequence:9,Payload:encoded,
	}
	ticket,err:=d.Begin(p,"east","west",owner.Epoch,snapshot.Digest(),time.Now())
	if err!=nil{t.Fatal(err)}
	if err:=d.FreezeSource(ticket,time.Now());err!=nil{t.Fatal(err)}
	receiver,err:=NewSnapshotReceiver(d,"west")
	if err!=nil{t.Fatal(err)}
	srv,client:=testMutualTLS(t,receiver)
	req:=RegionSnapshotRequest{Ticket:ticket,Snapshot:snapshot}
	if _,err:=SendRegionSnapshot(context.Background(),client("east"),srv.URL+RegionSnapshotPath,req);err!=nil{t.Fatal(err)}
	staged,ok:=receiver.StagedCopy(p)
	if !ok||staged.Digest()!=snapshot.Digest(){t.Fatal("snapshot staging changed byte-level state")}
	target,err:=engine.RestoreRoomState(staged.Payload)
	if err!=nil{t.Fatalf("destination could not restore actual Go room: %v",err)}
	defer target.Close()
	again,err:=target.ExportState()
	if err!=nil||!bytes.Equal(encoded,again){t.Fatal("real game room changed during transfer")}
	if target.SnapshotFor("player-1")==nil{t.Fatal("restored room has no player")}
	if d.CanSimulate(p,"east",owner.Epoch)||d.CanSimulate(p,"west",ticket.NewEpoch){
		t.Fatal("region authority active before commit")
	}
	if err:=d.QuiesceSource(ticket,time.Now());err!=nil{t.Fatal(err)}
	next,err:=d.Commit(ticket,time.Now())
	if err!=nil||next.WorkerID!="west"||next.Epoch!=owner.Epoch+1 {t.Fatalf("unexpected authority: %+v %v",next,err)}
	// Production activation still requires durable shared fencing and an
	// atomic swap of the inactive target into the worker's tick loop.
}
