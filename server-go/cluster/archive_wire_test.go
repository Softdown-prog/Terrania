package cluster

import (
 "context"
 "errors"
 "fmt"
 "os"
 "path/filepath"
 "testing"
 "time"

 "github.com/Softdown-prog/Terrania/server-go/engine"
)

func TestArchivedMTLSReceiverStoresBeforeAcknowledging(t *testing.T){
 archive,err:=NewSnapshotArchive(filepath.Join(t.TempDir(),"snapshots"))
 if err!=nil{t.Fatal(err)}
 d:=testDirectory(t)
 req:=archivedRoomRequest(t,d,Province{-2,5})
 receiver,err:=NewArchivedSnapshotReceiver(d,"west",archive)
 if err!=nil{t.Fatal(err)}
 srv,client:=testMutualTLS(t,receiver)
 endpoint:=srv.URL+RegionSnapshotPath
 receipt,err:=SendRegionSnapshot(context.Background(),client("east"),endpoint,req)
 if err!=nil||!receipt.Staged{t.Fatalf("no durable acknowledgment: %+v %v",receipt,err)}
 saved,err:=archive.LoadVerified(req.Ticket)
 if err!=nil||saved.Snapshot.Digest()!=req.Snapshot.Digest(){t.Fatalf("durable mismatch: %v",err)}
 if _,err:=SendRegionSnapshot(context.Background(),client("east"),endpoint,req);err!=nil{
  t.Fatalf("retry was not idempotent: %v",err)
 }
 if err:=d.QuiesceSource(req.Ticket,time.Now());err!=nil{t.Fatal(err)}
 if _,err:=d.Commit(req.Ticket,time.Now());err!=nil{t.Fatal(err)}
}

func TestArchivedReceiverFailClosedWhenStoreIsFull(t *testing.T){
 archive,err:=NewSnapshotArchive(filepath.Join(t.TempDir(),"snapshots"))
 if err!=nil{t.Fatal(err)}
 for i:=0;i<MaxArchivedRegionSnapshots;i++{
  if err:=os.WriteFile(filepath.Join(archive.dir,fmt.Sprintf("reserved-%03d",i)),[]byte("x"),0600);err!=nil{t.Fatal(err)}
 }
 d:=testDirectory(t)
 req:=archivedRoomRequest(t,d,Province{12,13})
 receiver,err:=NewArchivedSnapshotReceiver(d,"west",archive)
 if err!=nil{t.Fatal(err)}
 srv,client:=testMutualTLS(t,receiver)
 _,err=SendRegionSnapshot(context.Background(),client("east"),srv.URL+RegionSnapshotPath,req)
 if err==nil{t.Fatal("full store accepted transfer")}
 if _,ok:=receiver.StagedCopy(req.Ticket.Province);ok{t.Fatal("unpersisted snapshot staged")}
 if err:=d.QuiesceSource(req.Ticket,time.Now());!errors.Is(err,ErrHandoffNotReady){
  t.Fatalf("no archive but source quiesced: %v",err)
 }
 if d.CanSimulate(req.Ticket.Province,"east",1)||d.CanSimulate(req.Ticket.Province,"west",2){
  t.Fatal("source/destination unexpectedly unfrozen")
 }
}

func TestArchivedSnapshotHasValidGameRoom(t *testing.T){
 d:=testDirectory(t)
 req:=archivedRoomRequest(t,d,Province{30,31})
 restored,err:=engine.RestoreRoomState(req.Snapshot.Payload)
 if err!=nil{t.Fatal(err)}
 defer restored.Close()
 if restored.SnapshotFor("player-1")==nil {t.Fatal("restored player absent")}
}
