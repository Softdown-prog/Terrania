package cluster

import (
 "bytes"
 "errors"
 "os"
 "path/filepath"
 "testing"
 "time"

 "github.com/Softdown-prog/Terrania/server-go/engine"
)

func archivedRoomRequest(t *testing.T,d *RegionDirectory,p Province)RegionSnapshotRequest {
 t.Helper()
 owner,err:=d.Register(p,"east");if err!=nil{t.Fatal(err)}
 room:=engine.NewRoom("origins");defer room.Close()
 room.Add("player-1","Explorer")
 payload,err:=room.ExportState();if err!=nil{t.Fatal(err)}
 snap:=RegionSnapshot{Version:RegionSnapshotVersion,Province:p,OldEpoch:owner.Epoch,Tick:1,Sequence:1,Payload:payload}
 tk,err:=d.Begin(p,"east","west",owner.Epoch,snap.Digest(),time.Now());if err!=nil{t.Fatal(err)}
 if err:=d.FreezeSource(tk,time.Now());err!=nil{t.Fatal(err)}
 return RegionSnapshotRequest{Ticket:tk,Snapshot:snap}
}

func TestDurableArchiveRestartReadOnly(t *testing.T){
 root:=t.TempDir()
 archive,err:=NewSnapshotArchive(filepath.Join(root,"snapshots"));if err!=nil{t.Fatal(err)}
 journal:=filepath.Join(root,"regions.wal")
 directory:=persistentDirectory(t,journal)
 province:=Province{2,-4}
 req:=archivedRoomRequest(t,directory,province)
 if err:=archive.SaveDurable(req);err!=nil{t.Fatal(err)}
 if err:=archive.SaveDurable(req);err!=nil{t.Fatalf("retry failed: %v",err)}
 saved,err:=archive.LoadVerified(req.Ticket)
 if err!=nil||!bytes.Equal(saved.Snapshot.Payload,req.Snapshot.Payload){t.Fatalf("readback mismatch: %v",err)}
 if err:=directory.StageDestination(req.Ticket,req.Snapshot.Digest(),time.Now());err!=nil{t.Fatal(err)}
 if err:=directory.QuiesceSource(req.Ticket,time.Now());err!=nil{t.Fatal(err)}
 if _,err:=directory.Commit(req.Ticket,time.Now());err!=nil{t.Fatal(err)}
 if err:=directory.Close();err!=nil{t.Fatal(err)}
 restarted:=persistentDirectory(t,journal);defer restarted.Close()
 report,err:=InspectRecoveredProvince(restarted,archive,province)
 if err!=nil{t.Fatal(err)}
 if !report.SnapshotFound||!report.SnapshotIntegrityOK||!report.RoomStateRestorable||report.SafeToResume||report.TransferPhase!="committed"{
  t.Fatalf("unsafe evidence: %+v",report)
 }
 if restarted.CanSimulate(province,"west",2){t.Fatal("worker resumed automatically")}
}

func TestArchiveCorruptionFailsClosed(t *testing.T){
 root:=t.TempDir()
 archive,err:=NewSnapshotArchive(filepath.Join(root,"snapshots"));if err!=nil{t.Fatal(err)}
 directory:=testDirectory(t)
 req:=archivedRoomRequest(t,directory,Province{1,1})
 if err:=archive.SaveDurable(req);err!=nil{t.Fatal(err)}
 path:=archive.filename(req.Ticket)
 wire,err:=os.ReadFile(path);if err!=nil{t.Fatal(err)}
 wire[len(wire)-2]^=1
 if err:=os.WriteFile(path,wire,0600);err!=nil{t.Fatal(err)}
 if _,err:=archive.LoadVerified(req.Ticket);!errors.Is(err,ErrSnapshotArchiveInvalid){t.Fatalf("corrupt file accepted: %v",err)}
 if err:=archive.SaveDurable(req);!errors.Is(err,ErrSnapshotArchiveInvalid){t.Fatalf("corrupt file overwritten: %v",err)}
 if err:=os.Chmod(path,0644);err!=nil{t.Fatal(err)}
 if _,err:=archive.LoadVerified(req.Ticket);!errors.Is(err,ErrSnapshotArchiveInvalid){t.Fatalf("insecure file accepted: %v",err)}
}

func TestArchiveRejectsWeakDirectory(t *testing.T){
 root:=t.TempDir()
 path:=filepath.Join(root,"public")
 if err:=os.Mkdir(path,0755);err!=nil{t.Fatal(err)}
 if a,err:=NewSnapshotArchive(path);a!=nil||err==nil{t.Fatal("public archive accepted")}
 if a,err:=NewSnapshotArchive("relative");a!=nil||err==nil{t.Fatal("relative archive accepted")}
}
